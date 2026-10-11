import { createServer } from 'node:http';
import { localDatabase } from '../server/local-db.mjs';
import worker from '../dist/server/index.js';
const DB=localDatabase();const port=Number(process.env.PORT)||5174;
const server=createServer(async(req,res)=>{try{const chunks=[];for await(const c of req)chunks.push(c);const request=new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})});const response=await worker.fetch(request,{DB});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(e){console.error(e);res.writeHead(500);res.end('Server error');}});
server.listen(port,'127.0.0.1',()=>console.log(`APEX TYPE production preview: http://127.0.0.1:${port}/`));
server.on('close',()=>DB.close());
