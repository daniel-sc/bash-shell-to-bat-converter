// patch for irrelevant node dependency of bash-parser:
if (typeof window === 'undefined') {
    // @ts-ignore
    let window = {process: {env: {NODE_NEV: 'mock'}}}; // lgtm [js/unused-local-variable]
    // @ts-ignore
} else if (!window.process) {
    // @ts-ignore
    window.process = {env: {NODE_NEV: 'mock'}};
}
import parse from 'bash-parser'
import {RmHandler} from './rm-handler';
import {CpHandler} from './cp-handler';

const pathPart = '(?:(?:[\\w\\d\\-\\._]*[\\w\\d][\\w\\d\\-\\._]*)|\\.{1,2})'; // assumption: path parts contain at least one letter or digit

export function convertPaths(expandedText: string) {
    if (/:\/\//.test(expandedText)) { // do not mess with urls
        return expandedText;
    }
    return expandedText.replace(new RegExp(`${pathPart}?(?:/${pathPart})+$`), (path) => {
        return path
            .replace(/^\/(\w)\//g, '$1:\\') // cygwin windows paths
            .replace(/^\.\//, '%CD%\\')
            .replace(/^\.\.\//, '%CD%\\..\\')
            .replace(/\//g, '\\');
    });
}

function performExpansions(text?: string, expansions?: any[]): string {
    // currently assumes only ParameterExpansions (TODO CommandExpansion, ArithmeticExpansion)
    let result = text || '';
    const sortedExpansions = [...(expansions || [])];
    sortedExpansions.sort((a, b) => a.loc.start > b.loc.start ? -1 : 1);
    for (const expansion of sortedExpansions) {
        // expand function parameters such as `$1` (-> `%~1`) different to regular variables `$MY`(-> `%MY%`):
        const expandedValue = /^\d+$/.test(`${expansion.parameter}`) ? `%~${expansion.parameter}` : `%${expansion.parameter}%`;
        result = `${result.substring(0, expansion.loc.start)}${expandedValue}${result.substring(expansion.loc.end + 1)}`;
    }
    return result;
}


class ConvertBash {

    private readonly rmHandler = new RmHandler(c => this.convertCommand(c));
    private readonly cpHandler = new CpHandler(c => this.convertCommand(c));
    private readonly userDefinedFunctionNames = new Set<string>();
    private readonly userDefinedFunctions: any[] = [];

    public convertCommand(command: any): string {
        console.log('convertCommand', command);
        const expandedText = performExpansions(command.text, command.expansion);
        const text = convertPaths(expandedText);

        switch (command.type) {
            case 'Command':
                if (command.prefix && command.prefix.length && (!command.name || !command.name.text)) { // simple variable assignment
                    return command.prefix.map(c => this.convertCommand(c)).join('\n');
                }
                if (command.name && command.name.text) {
                    if (this.userDefinedFunctionNames.has(command.name.text)) {
                        const params = command.suffix && command.suffix.length ? ' ' + command.suffix.map(this.convertCommand).join(' , ') : '';
                        return `CALL :${command.name.text}${params}`;
                    }
                    const suffix = command.suffix ? ` ${command.suffix.map(c => this.convertCommand(c)).join(' ')}` : '';
                    switch (command.name.text) {
                        case 'set':
                            if (command.suffix && command.suffix.length === 1 && command.suffix[0].text === '-e') {
                                console.log('skipping "set -e"');
                                return '';
                            } else {
                                return `${command.name.text}${suffix}`;
                            }
                        case 'rm':
                            return this.rmHandler.handle(command);
                        case 'cp':
                            return this.cpHandler.handle(command);

                        default:
                            return `${command.name.text}${suffix}`;
                    }
                }
                return 'unknown command: ' + JSON.stringify(command);
            case 'Function':
                // NOTE: bash: definition before call. batch: call before definition
                // --> append function definitions at the end
                this.userDefinedFunctionNames.add(command.name.text);
                this.userDefinedFunctions.push(command);
                return '';
            case 'Word':
                if (text.startsWith('"') || ['==', '!='].includes(text)) {
                    return text;
                } else {
                    return `"${text}"`;
                }
            case 'AssignmentWord':
                const [variableName, variableValue] = text.split('=', 2);
                return `SET ${variableName}=${variableValue}`;
            case 'LogicalExpression':
                switch (command.op) {
                    case 'and':
                        return `${(this.convertCommand(command.left))} && ${(this.convertCommand(command.right))}`;
                    case 'or':
                        return `${(this.convertCommand(command.left))} || ${(this.convertCommand(command.right))}`;
                    default:
                        return `REM UNKNOWN operand "${command.op}" in: ${JSON.stringify(command)}`;
                }
            case 'CompoundList':
                return command.commands.map(c => this.convertCommand(c)).join('\n');
            case 'If':
                // note: AND/OR is not supported with batch IF (https://stackoverflow.com/a/2143203/2544163)
                const condition = this.convertCommand(command.clause.commands[0]).replace(/^\[ |^"\[" | "]"$/g, '');
                const elseBranch = command.else ? ` ELSE (\n${this.indent(this.convertCommand(command.else))}\n)` : '';
                return `IF ${condition} (\n${this.indent(this.convertCommand(command.then))}\n)${elseBranch}`;
            case 'Case':
                const caseStatement = this.convertCommand(command.clause);
                return command.cases.map((c, i) => {
                    const pattern = c.pattern[0]; // this is a list for unclear reason..
                    // simple heuristic: '*' is default case:
                    if (pattern.text === '*') {
                        return ` ELSE (\n${this.indent(this.convertCommand(c.body))}\n)`;
                    }
                    const caseCondition = `${caseStatement}==${this.convertCommand(pattern)}`;
                    const prefix = i === 0 ? 'IF' : ' ELSE IF';
                    return `${prefix} ${caseCondition} (\n${this.indent(this.convertCommand(c.body))}\n)`;
                }).join('');
        }
        return 'REM UNKNOWN: ' + JSON.stringify(command);
    }

    public getFunctionDefinitions(): string {
        if (!this.userDefinedFunctions.length) {
            return '';
        }

        return `\n\nEXIT /B %ERRORLEVEL%\n\n${this.userDefinedFunctions.map(f => {
            const innerCommands = f.body.commands.map(c => this.convertCommand(c)).join('\n');
            return `:${f.name.text}\n${innerCommands}\nEXIT /B 0\n`;
        }).join('\n')}`
    }

    private indent(s: string): string {
        return s.split('\n').map(line => `  ${line}`).join('\n');
    }
}


export function convertBashToWin(script: string) {
    const ast = parse(script, {mode: 'bash'});
    const converter = new ConvertBash();
    return '@echo off\n\n' +
        ast.commands
            .map(c => converter.convertCommand(c))
            .filter((c: any) => !!c) // filter empty commands
            .join('\n') +
        converter.getFunctionDefinitions();
}





