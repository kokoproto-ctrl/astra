import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const inventory=path.join(root,'evidence','hashes.sha256');
const lines=fs.readFileSync(inventory,'utf8').split(/\r?\n/).filter(Boolean);
const mismatches=[];const missing_files=[];
for(const line of lines){const match=line.match(/^([a-f0-9]{64})  (.+)$/);if(!match){mismatches.push({line,reason:'INVALID_INVENTORY_LINE'});continue;}const [,expected,relative]=match;const file=path.resolve(root,relative);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){missing_files.push(relative);continue;}const actual=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');if(actual!==expected)mismatches.push({file:relative,expected,actual});}
const result={inventory_entries:lines.length,files_verified:lines.length-missing_files.length,mismatches:mismatches.length,missing_files:missing_files.length,status:mismatches.length===0&&missing_files.length===0&&lines.length===lines.length-missing_files.length?'PASS':'FAIL'};
fs.writeFileSync(path.join(root,'evidence','hash_verification_results.json'),JSON.stringify(result,null,2)+'\n');
if(result.status!=='PASS')process.exitCode=1;
