// patch for irrelevant node dependency of bash-parser:
if (typeof window === 'undefined') {
    // @ts-ignore
    let window = {process: {env: {NODE_NEV: 'mock'}}}; // lgtm [js/unused-local-variable]
    // @ts-ignore
} else if (!window.process) {
    // @ts-ignore
    window.process = {env: {NODE_NEV: 'mock'}};
}
import {convertPaths} from './convert-paths';
import {Expansion, Expression, isStatement, Script} from './types';
import parse from 'bash-parser'
import {RmHandler} from './rm-handler';
import {CpHandler} from './cp-handler';

class ConvertBash {

    private readonly rmHandler = new RmHandler(c => this.convertCommand(c));
    private readonly cpHandler = new CpHandler(c => this.convertCommand(c));
    private readonly userDefinedFunctionNames = new Set<string>();
    private readonly userDefinedFunctions: any[] = [];
    private delayedExpansionActive = false;
    private preStatements: string[] = [];
    private interpolationCounter = 0;

    public convertCommand(command: Expression): string {
        const result = this.convertCommandCore(command);
        const preStatements = isStatement(command) ? this.drainPreStatements() : '';
        return preStatements + result;
    }

    private convertCommandCore(command: Expression): string {
        console.log('convertCommand', command);

        switch (command.type) {
            case 'Command':
                if (command.prefix && command.prefix.length && (!command.name || !command.name.text)) { // simple variable assignment
                    return command.prefix.map(c => this.convertCommand(c)).join('\n');
                }
                if (command.name && command.name.text) {
                    if (this.userDefinedFunctionNames.has(command.name.text)) {
                        const params = command.suffix && command.suffix.length ? ' ' + command.suffix.map(x => this.convertCommand(x)).join(' , ') : '';
                        return `CALL :${command.name.text}${params}`;
                    }
                    const suffix = command.suffix ? ` ${command.suffix.map(c => this.convertCommand(c)).join(' ')}` : '';
                    switch (command.name.text) {
                        case 'set':
                            if (command.suffix && command.suffix.length === 1 && command.suffix[0].type === 'Word' && command.suffix[0].text === '-e') {
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
                const expandedWord = this.performExpansions(command.text, command.expansion);
                let textWord = convertPaths(expandedWord);

                if (textWord.startsWith('"')) {
                    /* Keep textWord as it is. */
                } else if (['=='].includes(textWord)) {
                    /* Keep textWord as it is. */
                } else if (['!=', '-ne'].includes(textWord)) {
                    textWord = 'NEQ';
                } else if (['-eq'].includes(textWord)) {
                    textWord = 'EQU';
                } else if (['-lt'].includes(textWord)) {
                    textWord = 'LSS';
                } else if (['-le'].includes(textWord)) {
                    textWord = 'LEQ';
                } else if (['-gt'].includes(textWord)) {
                    textWord = 'GTR';
                } else if (['-ge'].includes(textWord)) {
                    textWord = 'GEQ';
                } else if (['!'].includes(textWord)) {
                    textWord = 'NOT';
                } else {
                    textWord = `"${textWord}"`;
                }
                return textWord;
            case 'AssignmentWord':
                const expandedAssignmentWord = this.performExpansions(command.text, command.expansion);
                const textAssignmentWord = convertPaths(expandedAssignmentWord);

                const [variableName, variableValue] = textAssignmentWord.split('=', 2);
                const unquotedValue = variableValue.replace(/^"(.*)"$/, '$1');
                return `SET "${variableName}=${unquotedValue}"`;
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

    private performExpansions(text?: string, expansions?: Expansion[]): string {
        // currently assumes only ParameterExpansions (TODO ArithmeticExpansion)
        let result = text || '';
        const sortedExpansions = [...(expansions || [])];
        sortedExpansions.sort((a, b) => a.loc.start > b.loc.start ? -1 : 1);
        for (const expansion of sortedExpansions) {
            switch (expansion.type) {
                case 'CommandExpansion':
                    this.delayedExpansionActive = true;
                    const interpolationVar = `_INTERPOLATION_${this.interpolationCounter++}`;
                    this.preStatements.push(`SET ${interpolationVar}=`);
                    this.preStatements.push(`FOR /f "delims=" %%a in ('${expansion.command}') DO (SET "${interpolationVar}=!${interpolationVar}! %%a")`);
                    result = `${result.substring(0, expansion.loc.start)}!${interpolationVar}!${result.substring(expansion.loc.end + 1)}`;
                    break;
                case 'ParameterExpansion':
                    // expand function parameters such as `$1` (-> `%~1`) different to regular variables `$MY`(-> `%MY%` or `!MY!` if delayed expansion is active):
                    const expandedValue = /^\d+$/.test(`${expansion.parameter}`) ? `%~${expansion.parameter}` : (this.delayedExpansionActive ? `!${expansion.parameter}!` : `%${expansion.parameter}%`);
                    result = `${result.substring(0, expansion.loc.start)}${expandedValue}${result.substring(expansion.loc.end + 1)}`;
                    break;
            }
        }
        return result;
    }

    private indent(s: string): string {
        return s.split('\n').map(line => `  ${line}`).join('\n');
    }

    delayedExpansion(): boolean {
        return this.delayedExpansionActive;
    }

    private drainPreStatements() {
        const result = this.preStatements.join('\n');
        this.preStatements = [];
        return result + (result ? '\n' : '');
    }
}


function preprocess(script: string): string {
    return script.replace(/(^|\n)\s*function /g, '$1');
}

export function convertBashToWin(script: string) {
    const preprocessedScript = preprocess(script);
    const ast: Script = parse(preprocessedScript, {mode: 'bash'});
    const converter = new ConvertBash();
    const convertedCommands = ast.commands
        .map(c => converter.convertCommand(c))
        .filter((c: any) => !!c) // filter empty commands
        .join('\n');
    const functionDefinitions = converter.getFunctionDefinitions();
    return '@echo off' +
        (converter.delayedExpansion() ? '\nsetlocal EnableDelayedExpansion' : '') +
        '\n\n' +
        convertedCommands +
        functionDefinitions;
}
