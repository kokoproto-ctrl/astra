import net from 'node:net';
const {port,requests}=JSON.parse(process.env.GOODAGI_AGENT_CONFIG);
function send(request) { return new Promise((resolve,reject)=>{ const socket=net.connect(port,'127.0.0.1'); let buffer=''; socket.on('connect',()=>socket.write(JSON.stringify({agent_pid:process.pid,request})+'\n')); socket.on('data',chunk=>{buffer+=chunk; if(buffer.includes('\n')) { socket.end(); resolve(JSON.parse(buffer.slice(0,buffer.indexOf('\n')))); }}); socket.on('error',reject); }); }
Promise.all(requests.map(send)).then(results=>process.send?.({type:'complete',pid:process.pid,results})).catch(error=>process.send?.({type:'error',pid:process.pid,error:String(error)}));
