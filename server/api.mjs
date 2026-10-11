import { passages } from '../src/simulation/race.ts';
import catalog from '../public/cars.json' with { type:'json' };
const validCar=id=>catalog.some(c=>c.id===id)?id:catalog[0].id;
const colors=['#bcf76b','#a994ff','#ff926b','#6acaf6'];
const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
const failure=(message,status=400)=>{const error=new Error(message);error.status=status;throw error;};
const digest=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
const cleanName=value=>String(value??'').trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,18)||'Racer';
export async function handleApi(request,env){
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/'))return null;
  if(url.pathname==='/api/health')return json({ok:!!env.DB,multiplayer:!!env.DB});
  if(!env.DB)return json({error:'Multiplayer storage is unavailable. Try a quick race while we reconnect.'},503);
  const db=env.DB;
  try {
    if(request.method!=='GET'&&request.method!=='POST')return json({error:'Method not allowed'},405);
    if(request.method==='POST'&&request.headers.get('origin')&&request.headers.get('origin')!==url.origin)failure('This request must come from the game.',403);
    if(Number(request.headers.get('content-length'))>4096)failure('Request too large.',413);
    let body={};
    if(request.method==='POST'){
      const text=await request.text();if(text.length>4096)failure('Request too large.',413);
      try{body=JSON.parse(text||'{}');}catch{failure('Invalid request.');}
      if(!body||typeof body!=='object'||Array.isArray(body))failure('Invalid request.');
    }
    const now=Date.now();
    if(url.pathname==='/api/rooms'&&request.method==='POST'){
      await db.prepare('DELETE FROM race_rooms WHERE expires_at < ?').bind(now).run();
      const code=crypto.randomUUID().replaceAll('-','').slice(0,6).toUpperCase();
      const id=crypto.randomUUID(),token=crypto.randomUUID(),hash=await digest(token);
      const index=crypto.getRandomValues(new Uint32Array(1))[0]%passages.length;
      await db.batch([
        db.prepare('INSERT INTO race_rooms (code,host_id,passage_index,created_at,expires_at) VALUES (?,?,?,?,?)').bind(code,id,index,now,now+7200000),
        db.prepare('INSERT INTO race_players (id,room_code,token_hash,name,seat,last_seen,car_id) VALUES (?,?,?,?,0,?,?)').bind(id,code,hash,cleanName(body.name),now,validCar(body.carId))
      ]);
      return json({code,playerId:id,token,room:await snapshot(db,code,now)},201);
    }
    const match=url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{6})(?:\/(join|sync|start|rematch|leave|car))?$/);
    if(!match)failure('Room not found.',404);
    const [,code,action]=match;
    const room=await db.prepare('SELECT * FROM race_rooms WHERE code = ? AND expires_at > ?').bind(code,now).first();
    if(!room)failure('This room has expired. Create a new one.',404);
    if(!action&&request.method==='GET')return json(await snapshot(db,code,now));
    if(request.method!=='POST')failure('Method not allowed.',405);
    if(action==='join'){
      if(room.status!=='lobby')failure('The race has already started. Join the next race.',409);
      const players=(await db.prepare('SELECT seat FROM race_players WHERE room_code = ? ORDER BY seat').bind(code).all()).results;
      const seat=[0,1,2,3].find(n=>!players.some(p=>p.seat===n));if(seat===undefined)failure('This room is full. Up to four racers can join.',409);
      const id=crypto.randomUUID(),token=crypto.randomUUID(),hash=await digest(token);
      try {
        const inserted=await db.prepare("INSERT INTO race_players (id,room_code,token_hash,name,seat,last_seen,car_id) SELECT ?,?,?,?,?,?,? WHERE (SELECT status FROM race_rooms WHERE code=?)='lobby' AND (SELECT COUNT(*) FROM race_players WHERE room_code=?) < 4").bind(id,code,hash,cleanName(body.name),seat,now,validCar(body.carId),code,code).run();
        if(!inserted.meta?.changes)failure('This room is full or the race just started.',409);
      }catch(e){if(e.status)throw e;failure('The grid just changed. Try joining again.',409);}
      return json({code,playerId:id,token,room:await snapshot(db,code,now)},201);
    }
    const token=request.headers.get('x-racer-token');if(!token||token.length>128)failure('Reconnect to the room to continue.',401);
    const player=await db.prepare('SELECT * FROM race_players WHERE room_code = ? AND token_hash = ?').bind(code,await digest(token)).first();
    if(!player)failure('You are no longer in this room.',401);
    if(action==='car'){
      if(room.status!=='lobby')failure('Choose your car in the lobby before the race.',409);
      await db.prepare('UPDATE race_players SET car_id=? WHERE id=?').bind(validCar(body.carId),player.id).run();
    }else if(action==='start'){
      if(player.id!==room.host_id)failure('Only the host can start the race.',403);
      if(room.status!=='lobby')failure('This race has already started.',409);
      const active=await db.prepare('SELECT COUNT(*) AS count FROM race_players WHERE room_code = ? AND last_seen > ?').bind(code,now-20000).first();
      if(active.count<2)failure('Invite at least one other racer before starting.',409);
      await db.prepare("UPDATE race_rooms SET status='racing',starts_at=? WHERE code=? AND status='lobby'").bind(now+4000,code).run();
    }else if(action==='rematch'){
      if(player.id!==room.host_id)failure('Only the host can set up a rematch.',403);
      if(room.status==='racing')failure('Wait for the other racers to finish before a rematch.',409);
      await db.batch([
        db.prepare("UPDATE race_rooms SET status='lobby',starts_at=NULL,passage_index=(passage_index+1)%? WHERE code=?").bind(passages.length,code),
        db.prepare("UPDATE race_players SET value='',attempts=0,successful=0,progress=0,finished_at=NULL,sequence=0 WHERE room_code=?").bind(code)
      ]);
    }else if(action==='leave'){
      await db.prepare('DELETE FROM race_players WHERE id=?').bind(player.id).run();
      if(player.id===room.host_id)await db.prepare('UPDATE race_rooms SET host_id=COALESCE((SELECT id FROM race_players WHERE room_code=? ORDER BY seat LIMIT 1),host_id) WHERE code=?').bind(code,code).run();
      return json({left:true});
    }else if(action==='sync'){
      const statements=[db.prepare('UPDATE race_players SET last_seen=? WHERE id=?').bind(now,player.id)];
      if(room.status==='racing'&&now>=room.starts_at&&player.finished_at===null){
        const value=typeof body.value==='string'?body.value.slice(0,passages[room.passage_index].length):player.value;
        const passage=passages[room.passage_index];let correct=0;while(correct<value.length&&value[correct]===passage[correct])correct++;
        const sequence=Number.isSafeInteger(body.sequence)?body.sequence:0;
        const attempts=Math.max(player.attempts,value.length,Math.min(Number(body.attempts)||0,100000));
        const successful=Math.max(player.successful,correct,Math.min(Number(body.successful)||0,attempts));
        statements.push(db.prepare('UPDATE race_players SET value=?,attempts=?,successful=?,progress=?,finished_at=?,sequence=? WHERE id=? AND sequence < ? AND (SELECT status FROM race_rooms WHERE code=?)=\'racing\' AND (SELECT starts_at FROM race_rooms WHERE code=?)=?').bind(value,attempts,successful,correct/passage.length,value===passage?now:null,sequence,player.id,sequence,code,code,room.starts_at));
      }
      await db.batch(statements);
      if(room.status==='racing'&&room.starts_at<now-300000)await db.prepare("UPDATE race_rooms SET status='finished' WHERE code=?").bind(code).run();
      else if(room.status==='racing'&&now>=room.starts_at){const unfinished=await db.prepare('SELECT COUNT(*) AS count FROM race_players WHERE room_code=? AND finished_at IS NULL AND last_seen>?').bind(code,now-20000).first();if(unfinished.count===0)await db.prepare("UPDATE race_rooms SET status='finished' WHERE code=?").bind(code).run();}
    }else failure('Action not found.',404);
    const self=await db.prepare('SELECT value,attempts,successful,sequence,progress,finished_at FROM race_players WHERE id=?').bind(player.id).first();
    return json({...await snapshot(db,code,now),self});
  }catch(error){if(!error.status)console.error('Multiplayer API failed:',error.message);return json({error:error.status?error.message:'The room could not sync. Please try again.'},error.status??500);}
}
async function snapshot(db,code,now){
  const room=await db.prepare('SELECT * FROM race_rooms WHERE code=?').bind(code).first();
  const players=(await db.prepare('SELECT id,name,seat,car_id,progress,attempts,successful,finished_at,last_seen FROM race_players WHERE room_code=? ORDER BY seat').bind(code).all()).results;
  return {code,hostId:room.host_id,status:room.status,startsAt:room.starts_at,serverTime:now,passageIndex:room.passage_index,players:players.map(p=>({id:p.id,name:p.name,seat:p.seat,carId:p.car_id,color:colors[p.seat],progress:p.progress,accuracy:p.attempts?Math.round(p.successful/p.attempts*100):100,wpm:room.starts_at&&now>room.starts_at?Math.round(p.progress*passages[room.passage_index].length/5/((p.finished_at??now)-room.starts_at)*60000):0,finishedTime:p.finished_at?Math.max(0,(p.finished_at-room.starts_at)/1000):null,connected:now-p.last_seen<20000}))};
}
