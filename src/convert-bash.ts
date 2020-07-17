// patch for irrelevant node dependency of bash-parser:
if (typeof window === 'undefined') {
    // @ts-ignore
    window = {process: {env: {NODE_NEV: 'mock'}}};
    // @ts-ignore
} else if (!window.process) {
    // @ts-ignore
    window.process = {env: {NODE_NEV: 'mock'}};
}
import parse from 'bash-parser'
import {RmHandler} from './rm-handler';
import {CpHandler} from './cp-handler';

function changePath(path: string) {
    return path
        .replace(/^\/(\w)\//g, '$1:\\') // cygwin windows paths
        .replace(/^\./, '%CD%')
        .replace(/\//g, '\\');
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


const pathMatcher = /(\/?[.\w]+(?:[.\w]+\/)*\/?|\b\.\b)/ig;

class ConvertBash {

    private readonly rmHandler = new RmHandler(c => this.convertCommand(c));
    private readonly cpHandler = new CpHandler(c => this.convertCommand(c));
    private readonly userDefinedFunctionNames = new Set<string>();
    private readonly userDefinedFunctions: any[] = [];

    public convertCommand(command: any): string {
        console.log('convertCommand', command);
        const text = performExpansions(command.text, command.expansion)
            .replace(pathMatcher, match => changePath(match));

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
                            return `${command.name.text}${suffix}`
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
                if (text && text.indexOf(' ') >= 0 && !text.startsWith('"')) {
                    return `"${text}"`;
                }
                return text;
            case 'AssignmentWord':
                const [variableName, variableValue] = text.split('=', 2);
                return `SET ${variableName}=${variableValue}`;
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





