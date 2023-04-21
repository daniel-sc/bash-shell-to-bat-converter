interface Loc {
    start: number;
    end: number;
}

export interface ParameterExpansion {
    type: 'ParameterExpansion',
    parameter: string,
    kind?: string,
    word?: string,
    op?: string,
    loc: Loc
}

export interface CommandExpansion {
    type: 'CommandExpansion',
    command: string,
    resolved: boolean,
    commandAST: any,

    loc: Loc
}

export interface ArithmeticExpansion {
    type: 'ArithmeticExpansion',
    expression: string,
    resolved: boolean,
    arithmeticAST: any,
    loc: Loc
}

export type Expansion = ParameterExpansion | CommandExpansion | ArithmeticExpansion;

export type Statement = LogicalExpression |
    Pipeline |
    Command |
    Function |
    Subshell |
    For |
    Case |
    If |
    While |
    Until;

export type Expression = Statement | CompoundList | Word | AssignmentWord | Redirect;

export function isStatement(node: any): node is Statement {
    return node
        && typeof node === 'object'
        && node.type
        && typeof node.type === 'string'
        && ['LogicalExpression', 'Pipeline', 'Command', 'Function', 'Subshell', 'For', 'Case', 'If', 'While', 'Until'].indexOf(node.type) >= 0;
}
export interface Script {
    type: 'Script',
    commands: Array<Statement>
}

interface Pipeline {
    type: 'Pipeline',
    commands: Array<Command |
        Function |
        Subshell |
        For |
        Case |
        If |
        While |
        Until>
}

interface LogicalExpression {
    type: 'LogicalExpression',
    op: string,
    left: Statement,
    right: Statement
}

interface Command {
    type: 'Command',
    name?: Word,
    prefix: Array<AssignmentWord | Redirect>,
    suffix: Array<Word | Redirect>
}

interface Function {
    type: 'Function',
    name: Name,
    redirections: Array<Redirect>
    body: CompoundList
}

interface Name {
    type: 'Name',
    text: string
}

interface CompoundList {
    type: 'CompoundList',
    commands: Array<Statement>
    redirections: Array<Redirect>
}

interface Subshell {
    type: 'Subshell',
    list: CompoundList
}

interface For {
    type: 'For',
    name: Name,
    wordlist: Array<Word>,
    do: CompoundList
}

interface Case {
    type: 'Case',
    clause: Word,
    cases: Array<CaseItem>
}

interface CaseItem {
    type: 'CaseItem',
    pattern: Array<Word>,
    body: CompoundList
}

interface If {
    type: 'If',
    clause: CompoundList,
    then: CompoundList,
    else: CompoundList
}

interface While {
    type: 'While',
    clause: CompoundList,
    do: CompoundList
}

interface Until {
    type: 'Until',
    clause: CompoundList,
    do: CompoundList
}

interface Redirect {
    type: 'Redirect',
    op: string,
    file: Word,
    numberIo: Number
}

export interface Word {
    type: 'Word',
    text: string,
    expansion: Expansion[]
}

export interface AssignmentWord {
    type: 'AssignmentWord',
    text: string,
    expansion: Expansion[]
}