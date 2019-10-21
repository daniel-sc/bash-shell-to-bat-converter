export function splitParams(command: any) {
    const singleDashParamMatcher = /^-\w+$/i;
    const doubleDashParamMatcher = /^--\w+/i;
    const singleDashParams: any[] = (command.suffix || []).filter((s: any) => s.text.match(singleDashParamMatcher));
    const doubleDashParams: any[] = (command.suffix || []).filter((s: any) => s.text.match(doubleDashParamMatcher));
    const argList: any[] = (command.suffix || []).filter((s: any) => !s.text.match(singleDashParamMatcher) && !s.text.match(doubleDashParamMatcher));
    return {singleDashParams, doubleDashParams, argList};
}
