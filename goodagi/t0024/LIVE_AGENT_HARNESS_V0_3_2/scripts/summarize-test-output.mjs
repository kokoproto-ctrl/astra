import fs from 'node:fs';

const [input,output,command,registeredArg,exitCodeArg]=process.argv.slice(2);
if(!input||!output||!command)throw new Error('usage: input output command [registered] [exit_code]');
const raw=fs.readFileSync(input,'utf8');
const names=[...raw.matchAll(/^✔ (.+?) \([\d.]+ms\)$/gm)].map(match=>match[1]);
const count=label=>Number(raw.match(new RegExp(`^ℹ ${label} (\\d+)$`,'m'))?.[1]??NaN);
const executed=count('tests'),passed=count('pass'),failed=count('fail');
if([executed,passed,failed].some(Number.isNaN))throw new Error(`unparseable test output: ${input}`);
if(names.length!==passed)throw new Error(`pass-name count mismatch: ${names.length} != ${passed}`);
const result={timestamp:new Date().toISOString(),command,registered:registeredArg===undefined?executed:Number(registeredArg),executed,passed,failed,exit_code:exitCodeArg===undefined?0:Number(exitCodeArg),test_names:names,real_model_calls_this_task:0};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
