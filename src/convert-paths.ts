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