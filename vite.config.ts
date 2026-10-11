import { defineConfig } from 'vite';
import { handleApi } from './server/api.mjs';
import { localDatabase } from './server/local-db.mjs';
export default defineConfig({
  build:{outDir:'client-dist',rollupOptions:{output:{manualChunks:{three:['three']}}}},
  plugins:[{
    name:'apex-multiplayer-preview',
    configureServer(server){
      const DB=localDatabase();
      server.httpServer?.once('close',()=>DB.close());
      server.middlewares.use('/api',async(req,res)=>{
        try{
          const chunks:Buffer[]=[];for await(const c of req){chunks.push(c);if(chunks.reduce((n,c)=>n+c.length,0)>4096){res.writeHead(413);res.end('Too large');return;}}
          const origin=`http://${req.headers.host}`;
          const request=new Request(`${origin}/api${req.url}`,{method:req.method,headers:req.headers as Record<string,string>,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})});
          const response=await handleApi(request,{DB});
          res.writeHead(response?.status??404,Object.fromEntries(response?.headers??[]));res.end(response?await response.text():'Not found');
        }catch(error){console.error(error);res.writeHead(500);res.end('{"error":"Local multiplayer server failed."}');}
      });
    }
  }]
});
