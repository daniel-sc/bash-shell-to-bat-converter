

// TODO use https://github.com/vorpaljs/bash-parser ?

interface Updater {
    matcher: RegExp;
    replace: string | ((match: string, ...args: any[]) => string);
}

function changePath(path: string) {
    return path
        .replace(/^\/(\w)\//g, '$1:\\') // cygwin windows paths
        .replace(/^\./, '%CD%')
        .replace(/\//g, '\\');
}

// be careful: order of Updaters matter!!
const UPDATES: Updater[] = [
    // TODO handle cmd line args: $1 etc.
    // TODO handle multi line commands?
    {matcher: /(?:\n|^|\r)(#!\/.*)/ig, replace: 'REM Auto converted from $1'},
    {matcher: /\\([\r\n])/ig, replace: '^'}, // line breaks (use before any paths are replaced!)
    {matcher: /(\/?[.\w]+(?:[.\w]+\/)*\/?|\b\.\b)/ig, replace: (match, p1) => changePath(match)}, // line breaks (use before any paths are replaced!)
    {matcher: /\nset .*/ig, replace: ''}, // e.g.: set -e
    // ENV variables:
    {matcher: /\${([^}]+)}/ig, replace: '%$1%'},
    {matcher: /\$(\S+)/ig, replace: '%$1%'},
    // https://en.wikibooks.org/wiki/Windows_Batch_Scripting#REM
    {matcher: /\n#(.*)/ig, replace: '\nREM $1'},
    {matcher: /#(.*)/ig, replace: ' & REM $1'},
    {matcher: /\n(\S+=.*)/ig, replace: '\nset $1'},
    { // rm
        matcher: /\nrm\s*(-.*)? (.*)/ig, replace: (match, p1, p2) => {
            if (p2) { // with params
                return `del ${p1.indexOf('r') >= 0 ? '/S ' : ''} ${changePath(p2)}`;
            } else {
                return 'del ' + changePath(p1);
            }
        }
    },
];

export function convertBashToWin(script: string) {
    let content = script;
    for (const u of UPDATES) {
        if (typeof u.replace === 'string') { // to fulfill contracts of two different replace functions..
            content = content.replace(u.matcher, u.replace);
        } else {
            content = content.replace(u.matcher, u.replace);
        }
    }
    return content;
}





