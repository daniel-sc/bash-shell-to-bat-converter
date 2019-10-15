import * as fs from 'fs';
import {convertBashToWin} from './convert-bash';

const filename = process.argv[2];
console.log(`converting file: ${filename} ...`);

let content = fs.readFileSync(filename).toString();

content = convertBashToWin(content);
console.log('updated:\n', content);

// TODO save as *.bat
