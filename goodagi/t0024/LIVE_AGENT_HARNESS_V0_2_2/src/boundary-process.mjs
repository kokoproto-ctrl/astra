import net from 'node:net';
import {ControlBoundary} from './boundary.mjs';

const config=JSON.parse(process.env.GOODAGI_BOUNDARY_CONFIG);
const boundary=new ControlBoundary(config);
const peers=new Set();
const server=net.createServer(socket=>{
  let buffer='';
  socket.on('data',chunk=>{
    buffer+=chunk;
    while(buffer.includes('\n')) {
      const index=buffer.indexOf('\n'); const line=buffer.slice(0,index); buffer=buffer.slice(index+1);
      let envelope; try { envelope=JSON.parse(line); } catch { envelope={request:null}; }
      if (Number.isInteger(envelope.agent_pid)) peers.add(envelope.agent_pid);
      const result=boundary.decide(envelope.request);
      socket.write(JSON.stringify({result,boundary_pid:process.pid})+'\n');
    }
  });
});
server.listen(0,'127.0.0.1',()=>process.send?.({type:'ready',port:server.address().port,pid:process.pid}));
process.on('message',message=>{ if(message?.type==='snapshot') process.send?.({type:'snapshot',pid:process.pid,peers:[...peers],effects:boundary.effects.size,principals:[...boundary.principals.values()].map(p=>({id:p.id,remaining:p.remaining})),objects:[...boundary.objects.values()]}); });
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
