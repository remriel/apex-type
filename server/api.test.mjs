import test from 'node:test';
import assert from 'node:assert/strict';
import { handleApi } from './api.mjs';
import { localDatabase } from './local-db.mjs';
const call=async(db,path,body,token)=>{const r=await handleApi(new Request(`http://localhost/api${path}`,{method:body?'POST':'GET',headers:token?{'x-racer-token':token}:{},...(body?{body:JSON.stringify(body)}:{})}),{DB:db});return {status:r.status,data:await r.json()};};
test('two human racers share a room and only host starts it',async()=>{const db=localDatabase();try{const host=await call(db,'/rooms',{name:'Host'});assert.equal(host.status,201);const code=host.data.code;const guest=await call(db,`/rooms/${code}/join`,{name:'Guest'});assert.equal(guest.status,201);assert.equal(guest.data.room.players.length,2);assert.equal((await call(db,`/rooms/${code}/start`,{},guest.data.token)).status,403);const started=await call(db,`/rooms/${code}/start`,{},host.data.token);assert.equal(started.data.status,'racing');assert.ok(started.data.startsAt>started.data.serverTime);assert.equal((await call(db,`/rooms/${code}/join`,{name:'Late'})).status,409);const synced=await call(db,`/rooms/${code}/sync`,{value:'The road',sequence:1},guest.data.token);assert.equal(synced.data.players[1].progress,0);}finally{db.close();}});
test('capacity is four, player secrets stay private, leave promotes host',async()=>{const db=localDatabase();try{const h=(await call(db,'/rooms',{name:'Host'})).data;for(let i=0;i<3;i++)assert.equal((await call(db,`/rooms/${h.code}/join`,{name:`Guest ${i}`})).status,201);assert.equal((await call(db,`/rooms/${h.code}/join`,{name:'Extra'})).status,409);const view=(await call(db,`/rooms/${h.code}`)).data;assert.ok(!JSON.stringify(view).includes('token'));assert.equal((await call(db,`/rooms/${h.code}/sync`,{},'fake')).status,401);await call(db,`/rooms/${h.code}/leave`,{},h.token);const next=(await call(db,`/rooms/${h.code}`)).data;assert.notEqual(next.hostId,h.playerId);assert.equal(next.players.length,3);}finally{db.close();}});
test('server validates prefix, sequence, recovery and finishing before a rematch',async()=>{
  const db=localDatabase();try{
    const h=(await call(db,'/rooms',{name:'Host'})).data;
    const g=(await call(db,`/rooms/${h.code}/join`,{name:'Guest'})).data;
    await call(db,`/rooms/${h.code}/start`,{},h.token);
    await db.prepare('UPDATE race_rooms SET starts_at=? WHERE code=?').bind(Date.now()-10000,h.code).run();
    const passage=(await import('../src/simulation/race.ts')).passages[h.room.passageIndex];
    let sync=(await call(db,`/rooms/${h.code}/sync`,{value:passage.slice(0,10)+'@',sequence:2,attempts:11,successful:10},h.token)).data;
    assert.ok(sync.players[0].progress>0);const before=sync.players[0].progress;
    sync=(await call(db,`/rooms/${h.code}/sync`,{value:'',sequence:1},h.token)).data;
    assert.equal(sync.players[0].progress,before);assert.equal(sync.self.value,passage.slice(0,10)+'@');assert.equal(sync.self.sequence,2);
    assert.equal((await call(db,`/rooms/${h.code}`)).data.self,undefined);
    sync=(await call(db,`/rooms/${h.code}/sync`,{value:passage,sequence:3,attempts:passage.length+1,successful:passage.length},h.token)).data;
    assert.equal(sync.players[0].progress,1);assert.ok(sync.players[0].finishedTime>=10);
    assert.equal((await call(db,`/rooms/${h.code}/rematch`,{},h.token)).status,409);
    await call(db,`/rooms/${h.code}/sync`,{value:passage,sequence:1,attempts:passage.length,successful:passage.length},g.token);
    const reset=(await call(db,`/rooms/${h.code}/rematch`,{},h.token)).data;
    assert.equal(reset.status,'lobby');assert.equal(reset.players[0].progress,0);assert.equal(reset.startsAt,null);
    assert.equal((await call(db,`/rooms/${h.code}/sync`,{},g.token)).status,200);
  }finally{db.close();}
});
test('selected classic is shared, selectable in lobby and locked during racing',async()=>{const db=localDatabase();try{const h=(await call(db,'/rooms',{name:'Host',carId:'180mx-94'})).data;assert.equal(h.room.players[0].carId,'180mx-94');const g=(await call(db,`/rooms/${h.code}/join`,{name:'Guest',carId:'eighties-gt'})).data;assert.equal(g.room.players[1].carId,'eighties-gt');const selected=await call(db,`/rooms/${h.code}/car`,{carId:'bursley-72'},g.token);assert.equal(selected.data.players[1].carId,'bursley-72');await call(db,`/rooms/${h.code}/start`,{},h.token);assert.equal((await call(db,`/rooms/${h.code}/car`,{carId:'f40'},g.token)).status,409);}finally{db.close();}});
