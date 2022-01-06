import {convertBashToWin} from './convert-bash';

describe('convert-bash', () => {
    describe('convertBashToWin', () => {
        test('should do simple complete conversion', () => {
            expect(convertBashToWin(
                '#!/bin/bash\n' +
                '\n' +
                'SOME_VAR="/c/cygwin/path"\n' +
                'rm -rf $SOME_VAR'
            )).toEqual(
                '@echo off\n' +
                '\n' +
                'SET SOME_VAR=c:\\cygwin\\path\n' +
                'DEL /S %SOME_VAR%'
            );
        });

        test('should transform single command', () => {
            expect(convertBashToWin('rm -rf /c/cygwin/path'))
                .toEqual('@echo off\n\nDEL /S c:\\cygwin\\path');
        });

        test('should handle "&&"', () => {
            expect(convertBashToWin('echo "hi 1" && echo "there 2"'))
                .toEqual('@echo off\n\necho "hi 1" && echo "there 2"');
        });

        test('should handle "||"', () => {
            expect(convertBashToWin('echo "hi 1" || echo "there 2"'))
                .toEqual('@echo off\n\necho "hi 1" || echo "there 2"');
        });

        test('should handle simple if', () => {
            expect(convertBashToWin('if [ "$my_var" == "" ]; then\n' +
                '  echo "my_var is empty"\n' +
                '  echo "second line"\n' +
                'fi'))
                .toEqual('@echo off\n\nIF "%my_var%" == "" (\n  echo "my_var is empty"\n  echo "second line"\n)');
        });

        test('should handle if-else', () => {
            expect(convertBashToWin('if [ "$my_var" == "" ]; then\n' +
                '  echo "my_var is empty"\n' +
                'else\n' +
                '  echo "my_var is not empty"\n' +
                'fi'))
                .toEqual('@echo off\n\nIF "%my_var%" == "" (\n  echo "my_var is empty"\n) ELSE (\n  echo "my_var is not empty"\n)');
        });

        test('should transform complete example', () => {
            expect(convertBashToWin(
                `#!/bin/bash

SOME_VAR="/c/cygwin/path"
rm -rf $SOME_VAR
cp /c/some/file /to/another/file

my_function () {
  echo "hello from my_function: $1"
}
# call the function:
my_function
# call the function with param:
my_function "some param"
`)).toEqual(`@echo off

SET SOME_VAR=c:\\cygwin\\path
DEL /S %SOME_VAR%
COPY  c:\\some\\file \\to\\another\\file
CALL :my_function
CALL :my_function "some param"

EXIT /B %ERRORLEVEL%

:my_function
echo "hello from my_function: %~1"
EXIT /B 0
`);
        });
    });
});
