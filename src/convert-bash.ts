// @ts-ignore
import parse from 'bash-parser'

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
        result = `${result.substring(0, expansion.loc.start)}%${expansion.parameter}%${result.substring(expansion.loc.end + 1)}`;
    }
    return result;
}

function convertCommand(command: any): string {
    let text = performExpansions(command.text, command.expansion);
    let pathMatcher = /(\/?[.\w]+(?:[.\w]+\/)*\/?|\b\.\b)/ig;
    text = text.replace(pathMatcher, match => changePath(match));

    switch (command.type) {
        case 'Command':
            if (command.prefix && command.prefix.length && (!command.name || !command.name.text)) { // simple variable assignment
                return command.prefix.map(convertCommand).join('\n');
            }
            if (command.name && command.name.text) {
                const suffix = command.suffix ? ` ${command.suffix.map(convertCommand).join(' ')}` : '';
                switch (command.name.text) {
                    case 'set':
                        if (command.suffix && command.suffix.length === 1 && command.suffix[0].text === '-e') {
                            console.log('skipping "set -e"');
                            return '';
                        } else {
                            return `${command.name.text}${suffix}`;
                        }
                    case 'rm':
                        const paramMatcher = /-\w+/i;
                        const paramList: any[] = (command.suffix || []).filter((s: any) => s.text.match(paramMatcher));
                        const argList: any[] = (command.suffix || []).filter((s: any) => !s.text.match(paramMatcher));
                        const winParams: string[] = [];
                        paramList.forEach(suffix => {
                            if (suffix.text.indexOf('-') === 0) {
                                if (suffix.text.indexOf('r') >= 0) {
                                    winParams.push('/S')
                                }
                            }
                        });
                        return `del ${winParams.join(' ')} ${argList.map(convertCommand).join(' ')}`; // converting assures paths are fixed..

                    default:
                        return `${command.name.text}${suffix}`
                }
            }
            return 'unknown command: ' + JSON.stringify(command);
        case 'Word':
            if (text && text.indexOf(' ') >= 0) {
                return `"${text}"`;
            }
            return text;
        case 'AssignmentWord':
            const [variableName, variableValue] = text.split('=', 2);
            return `set ${variableName}=${variableValue}`;
    }
    return 'REM UNKNOWN: ' + JSON.stringify(command);
}

export function convertBashToWin(script: string) {
    const ast = parse(script, {mode: 'bash'});
    return ast.commands
        .map(convertCommand)
        .filter((c: any) => !!c) // filter empty commands
        .join('\n');
}





