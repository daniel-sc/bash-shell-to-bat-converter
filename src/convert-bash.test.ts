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
                'DEL /S "%SOME_VAR%"'
            );
        });

        test('should transform single command', () => {
            expect(convertBashToWin('rm -rf /c/cygwin/path'))
                .toEqual('@echo off\n\nDEL /S "c:\\cygwin\\path"');
        });

        test('should handle "&&"', () => {
            expect(convertBashToWin('echo "hi 1" && echo "there 2"'))
                .toEqual('@echo off\n\necho "hi 1" && echo "there 2"');
        });

        describe('convertPaths', () => {
            test('should convert win path', () => {
                expect(convertBashToWin('mycommand /absolutepath'))
                    .toEqual('@echo off\n\nmycommand "\\absolutepath"');
            });
            test('should convert cyg win path', () => {
                expect(convertBashToWin('mycommand /c/cygwin/path'))
                    .toEqual('@echo off\n\nmycommand "c:\\cygwin\\path"');
            });
            test('should convert relative path', () => {
                expect(convertBashToWin('mycommand path/sub'))
                    .toEqual('@echo off\n\nmycommand "path\\sub"');
            });
            test('should convert relative path current dir', () => {
                expect(convertBashToWin('mycommand ./path'))
                    .toEqual('@echo off\n\nmycommand "%CD%\\path"');
            });
            test('should convert relative path parent dir', () => {
                expect(convertBashToWin('mycommand ../path'))
                    .toEqual('@echo off\n\nmycommand "%CD%\\..\\path"');
            });
            test('should keep cd to parent dir', () => {
                expect(convertBashToWin('cd ..'))
                    .toEqual('@echo off\n\ncd ".."');
            });
            test('should convert file with extension', () => {
                expect(convertBashToWin('mycommand path/file.txt'))
                    .toEqual('@echo off\n\nmycommand "path\\file.txt"');
            });
            test('should handle simple url', () => {
                expect(convertBashToWin('wget https://website.com'))
                    .toEqual('@echo off\n\nwget "https://website.com"');
            });
            test('should handle url with query', () => {
                expect(convertBashToWin('wget https://website.com/path?query=1'))
                    .toEqual('@echo off\n\nwget "https://website.com/path?query=1"');
            });
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
                    '\n' +
                    'IF "%~1"=="Darwin" (\n' +
                    '  echo "found darwin"\n' +
                    ') ELSE IF "%~1"=="Jesus" (\n' +
                    '  echo "found jesus"\n' +
                    ') ELSE (\n' +
                    '  echo "not found darwin nor jesus"\n' +
                    ')');
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

SET SOME_VAR=c:\\cygwin\\path
DEL /S "%SOME_VAR%"
COPY  "c:\\some\\file" "\\to\\another\\file"
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
