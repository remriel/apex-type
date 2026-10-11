import { build } from 'esbuild';
import { readdir,readFile,writeFile,mkdir,copyFile } from 'node:fs/promises';
import path from 'node:path';
const assets={};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp','.png':'image/png','.glb':'model/gltf-binary','.txt':'text/plain; charset=utf-8'};
async function collect(directory,prefix=''){
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const relative=prefix+'/'+entry.name,filename=path.join(directory,entry.name);
    if(entry.isDirectory())await collect(filename,relative);else assets[relative]={type:mime[path.extname(entry.name)]??'application/octet-stream',data:(await readFile(filename)).toString('base64')};
  }
}
await collect('client-dist');
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai/drizzle/meta',{recursive:true});
const entry=`import {handleApi} from './server/api.mjs';
const assets=${JSON.stringify(assets)};
export default {async fetch(request,env){
 const api=await handleApi(request,env);if(api)return api;
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 const pathname=new URL(request.url).pathname;
 const asset=assets[pathname==='/'?'/index.html':pathname];
 if(!asset)return new Response('Not found',{status:404});
 const bytes=Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0));
 return new Response(request.method==='HEAD'?null:bytes,{headers:{'content-type':asset.type,'cache-control':pathname==='/'||pathname==='/index.html'?'no-cache':'public, max-age=86400','x-content-type-options':'nosniff','referrer-policy':'same-origin'}});
}};`;
await build({stdin:{contents:entry,resolveDir:process.cwd(),sourcefile:'worker-entry.mjs'},bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,outfile:'dist/server/index.js'});
await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
for(const name of await readdir('drizzle'))if(name.endsWith('.sql'))await copyFile(`drizzle/${name}`,`dist/.openai/drizzle/${name}`);
await copyFile('drizzle/meta/_journal.json','dist/.openai/drizzle/meta/_journal.json');
console.log(`Sites Worker built with ${Object.keys(assets).length} embedded production assets and multiplayer D1 API.`);
