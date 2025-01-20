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
                'SET "SOME_VAR=c:\\cygwin\\path"\n' +
                'DEL /S "%SOME_VAR%"'
            );
        });

        test('should handle simple full line comment', () => {
            expect(convertBashToWin('echo "hi"\n# this is a comment'))
                .toEqual('@echo off\necho "hi"\nREM this is a comment');
        });

        test('should preserve empty lines', () => {
           expect(convertBashToWin('echo "hi"\n\n\n# this is a comment'))
               .toEqual('@echo off\necho "hi"\n\n\nREM this is a comment');
        });

        test('should transform single command', () => {
            expect(convertBashToWin('rm -rf /c/cygwin/path'))
                .toEqual('@echo off\nDEL /S "c:\\cygwin\\path"');
        });

        test('should handle "&&"', () => {
            expect(convertBashToWin('echo "hi 1" && echo "there 2"'))
                .toEqual('@echo off\necho "hi 1" && echo "there 2"');
        });

        describe('convertPaths', () => {
            test('should convert win path', () => {
                expect(convertBashToWin('mycommand /absolutepath'))
                    .toEqual('@echo off\nmycommand "\\absolutepath"');
            });
            test('should convert cyg win path', () => {
                expect(convertBashToWin('mycommand /c/cygwin/path'))
                    .toEqual('@echo off\nmycommand "c:\\cygwin\\path"');
            });
            test('should convert relative path', () => {
                expect(convertBashToWin('mycommand path/sub'))
                    .toEqual('@echo off\nmycommand "path\\sub"');
            });
            test('should convert relative path current dir', () => {
                expect(convertBashToWin('mycommand ./path'))
                    .toEqual('@echo off\nmycommand "%CD%\\path"');
            });
            test('should convert relative path parent dir', () => {
                expect(convertBashToWin('mycommand ../path'))
                    .toEqual('@echo off\nmycommand "%CD%\\..\\path"');
            });
            test('should keep cd to parent dir', () => {
                expect(convertBashToWin('cd ..'))
                    .toEqual('@echo off\ncd ".."');
            });
            test('should convert file with extension', () => {
                expect(convertBashToWin('mycommand path/file.txt'))
                    .toEqual('@echo off\nmycommand "path\\file.txt"');
            });
            test('should handle simple url', () => {
                expect(convertBashToWin('wget https://website.com'))
                    .toEqual('@echo off\nwget "https://website.com"');
            });
            test('should handle url with query', () => {
                expect(convertBashToWin('wget https://website.com/path?query=1'))
                    .toEqual('@echo off\nwget "https://website.com/path?query=1"');
            });
        });

        test('should handle "||"', () => {
            expect(convertBashToWin('echo "hi 1" || echo "there 2"'))
                .toEqual('@echo off\necho "hi 1" || echo "there 2"');
        });

        test('should handle simple if', () => {
            expect(convertBashToWin('if [ "$my_var" == "" ]; then\n' +
                '  echo "my_var is empty"\n' +
                '  echo "second line"\n' +
                'fi'))
                .toEqual('@echo off\nIF "%my_var%" == "" (\n  echo "my_var is empty"\n  echo "second line"\n)');
        });

        test('should handle if-else', () => {
            expect(convertBashToWin('if [ "$my_var" == "" ]; then\n' +
                '  echo "my_var is empty"\n' +
                'else\n' +
                '  echo "my_var is not empty"\n' +
                'fi'))
                .toEqual('@echo off\nIF "%my_var%" == "" (\n  echo "my_var is empty"\n) ELSE (\n  echo "my_var is not empty"\n)');
        });

        test('should handle simple if -eq', () => {
            expect(convertBashToWin('if [ "$my_var" -eq "" ]; then\n' +
                '  echo "my_var is empty"\n' +
                '  echo "second line"\n' +
                'fi'))
                .toEqual('@echo off\nIF "%my_var%" EQU "" (\n  echo "my_var is empty"\n  echo "second line"\n)');
        });

        test('should handle simple if -ne', () => {
            expect(convertBashToWin('if [ "$my_var" -ne "" ]; then\n' +
                '  echo "my_var is empty"\n' +
                '  echo "second line"\n' +
                'fi'))
                .toEqual('@echo off\nIF "%my_var%" NEQ "" (\n  echo "my_var is empty"\n  echo "second line"\n)');
        });

        test('should handle simple if -lt', () => {
            expect(convertBashToWin('if [ "$my_var" -lt "" ]; then\n' +
                '  echo "my_var is empty"\n' +
                '  echo "second line"\n' +
                'fi'))
                .toEqual('@echo off\nIF "%my_var%" LSS "" (\n  echo "my_var is empty"\n  echo "second line"\n)');
        });

        test('should handle simple if -le', () => {
            expect(convertBashToWin('if [ "$my_var" -le "" ]; then\n' +
                '  echo "my_var is empty"\n' +
                '  echo "second line"\n' +
                'fi'))
                .toEqual('@echo off\nIF "%my_var%" LEQ "" (\n  echo "my_var is empty"\n  echo "second line"\n)');
        });

        test('should handle simple if -gt', () => {
            expect(convertBashToWin('if [ "$my_var" -gt "" ]; then\n' +
                '  echo "my_var is empty"\n' +
                '  echo "second line"\n' +
                'fi'))
                .toEqual('@echo off\nIF "%my_var%" GTR "" (\n  echo "my_var is empty"\n  echo "second line"\n)');
        });

        test('should handle simple if -ge', () => {
            expect(convertBashToWin('if [ "$my_var" -ge "" ]; then\n' +
                '  echo "my_var is empty"\n' +
                '  echo "second line"\n' +
                'fi'))
                .toEqual('@echo off\nIF "%my_var%" GEQ "" (\n  echo "my_var is empty"\n  echo "second line"\n)');
        });

        test('should handle simple if not equal', () => {
            expect(convertBashToWin('if [ ! "$my_var" == "" ]; then\n' +
                '  echo "my_var is empty"\n' +
                '  echo "second line"\n' +
                'fi'))
                .toEqual('@echo off\nIF NOT "%my_var%" == "" (\n  echo "my_var is empty"\n  echo "second line"\n)');
        });

        test('should handle string interpolation with backticks', () => {
            expect(convertBashToWin('my_var="test-`git log`"'))
                .toEqual('@echo off\n' +
                    'setlocal EnableDelayedExpansion\n' +
                    'SET _INTERPOLATION_0=\n' +
                    'FOR /f "delims=" %%a in (\'git log\') DO (SET "_INTERPOLATION_0=!_INTERPOLATION_0! %%a")\n' +
                    'SET "my_var=test-!_INTERPOLATION_0:~1!"');
        });
        test('should echo variable correctly with delayed expansion', () => {
            expect(convertBashToWin('my_var="test-`git log`"\necho $my_var'))
                .toEqual('@echo off\n' +
                    'setlocal EnableDelayedExpansion\n' +
                    'SET _INTERPOLATION_0=\n' +
                    'FOR /f "delims=" %%a in (\'git log\') DO (SET "_INTERPOLATION_0=!_INTERPOLATION_0! %%a")\n' +
                    'SET "my_var=test-!_INTERPOLATION_0:~1!"\n' +
                    'echo "!my_var!"');
        });
        test('should activate delayed expansion for interpolation in function', () => {
            expect(convertBashToWin(`function my_function () {
  my_var="test-$(git log)"
  echo "hello from my_function: $my_var"
}`))
                .toEqual(`@echo off
setlocal EnableDelayedExpansion


EXIT /B %ERRORLEVEL%

:my_function
SET _INTERPOLATION_0=
FOR /f "delims=" %%a in ('git log') DO (SET "_INTERPOLATION_0=!_INTERPOLATION_0! %%a")
SET "my_var=test-!_INTERPOLATION_0:~1!"
echo "hello from my_function: !my_var!"
EXIT /B 0
`);
        });

        test('should handle string interpolation with dollar brackets', () => {
            expect(convertBashToWin('my_var="test-$(git log)"'))
                .toEqual('@echo off\n' +
                    'setlocal EnableDelayedExpansion\n' +
                    'SET _INTERPOLATION_0=\n' +
                    'FOR /f "delims=" %%a in (\'git log\') DO (SET "_INTERPOLATION_0=!_INTERPOLATION_0! %%a")\n' +
                    'SET "my_var=test-!_INTERPOLATION_0:~1!"');
        });

        test('should handle switch case', () => {
            expect(convertBashToWin('case "$1" in\n' +
                '  "Darwin")\n' +
                '    echo "found darwin"\n' +
                '    ;;\n' +
                '  "Jesus")\n' +
                '    echo "found jesus"\n' +
                '    ;;\n' +
                '  *)\n' +
                '    echo "not found darwin nor jesus"\n' +
                '    ;;\n' +
                'esac'))
                .toEqual('@echo off\n' +
                    'IF "%~1"=="Darwin" (\n' +
                    '  echo "found darwin"\n' +
                    ') ELSE IF "%~1"=="Jesus" (\n' +
                    '  echo "found jesus"\n' +
                    ') ELSE (\n' +
                    '  echo "not found darwin nor jesus"\n' +
                    ')');
        });

        test('should handle function declaration with comment', () => {
            expect(convertBashToWin(`function my_function () {
  # this is a comment
  echo "hello from my_function: $1"
}`))
                .toEqual(`@echo off


EXIT /B %ERRORLEVEL%

:my_function
REM this is a comment
echo "hello from my_function: %~1"
EXIT /B 0
`);
        });

        test('should handle function declaration with keyword at start', () => {
            expect(convertBashToWin(`function my_function () {
  echo "hello from my_function: $1"
}`))
                .toEqual(`@echo off


EXIT /B %ERRORLEVEL%

:my_function
echo "hello from my_function: %~1"
EXIT /B 0
`);
        });

        test('should handle function declaration with keyword in middle', () => {
            expect(convertBashToWin(`echo "test"
            function my_function () {
  echo "hello from my_function: $1"
}`))
                .toEqual(`@echo off
echo "test"

EXIT /B %ERRORLEVEL%

:my_function
echo "hello from my_function: %~1"
EXIT /B 0
`);
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

SET "SOME_VAR=c:\\cygwin\\path"
DEL /S "%SOME_VAR%"
COPY  "c:\\some\\file" "\\to\\another\\file"

REM call the function:
CALL :my_function
REM call the function with param:
CALL :my_function "some param"

EXIT /B %ERRORLEVEL%

:my_function
echo "hello from my_function: %~1"
EXIT /B 0
`);
        });
    });
});
