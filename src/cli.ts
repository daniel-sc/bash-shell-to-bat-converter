#!/usr/bin/env node

import * as fs from 'fs';
import {convertBashToWin} from './convert-bash';

const filename = process.argv[2];
console.log(`converting file: ${filename} ...`);

let content = fs.readFileSync(filename).toString();

content = convertBashToWin(content);
console.log('updated:\n', content);

const batFilename = filename.replace(/\.sh$/, '.bat');
if (fs.existsSync(batFilename)) {
    console.warn(`overwriting ${batFilename} ..`);
}

fs.writeFileSync(batFilename, content);

console.log(`written result to ${batFilename}`);


