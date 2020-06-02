# Simple Bash script to Windows batch file converter

Converts bash scripts (`*.sh`) to windows batch files (`*.bat`). 
This is _not_ supposed to be a fully complete/correct tool, but rather a starting point when converting scripts. 
For simple scripts this might create correct results.

Try it online: https://daniel-sc.github.io/bash-shell-to-bat-converter/

## Usage
Setup:
```sh
git clone https://github.com/daniel-sc/bash-shell-to-bat-converter.git
cd bash-shell-to-bat-converter
npm install
npm run tsc
``` 

Usage:
```sh
node lib/cli.js FILE_TO_CONVERT.sh
```
This creates `FILE_TO_CONVERT.bat`.

## Contribute

PRs always welcome ;-)
