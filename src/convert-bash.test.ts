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