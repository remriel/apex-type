import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
export function localDatabase(filename=':memory:'){
  const db=new DatabaseSync(filename);db.exec('PRAGMA foreign_keys=ON');
  if(!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='race_rooms'").get())db.exec(readFileSync(new URL('../drizzle/0000_racing_rooms.sql',import.meta.url),'utf8'));
  if(!db.prepare('PRAGMA table_info(race_players)').all().some(c=>c.name==='car_id'))db.exec(readFileSync(new URL('../drizzle/0001_car_choices.sql',import.meta.url),'utf8'));
  let queue=Promise.resolve();
  const prepare=sql=>({
    args:[],sql,
    bind(...args){this.args=args;return this;},
    async first(){return db.prepare(sql).get(...this.args)??null;},
    async all(){return {results:db.prepare(sql).all(...this.args)};},
    async run(){const r=db.prepare(sql).run(...this.args);return {meta:{changes:Number(r.changes)},success:true};}
  });
  return {prepare,batch(statements){const operation=queue.then(async()=>{db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}});queue=operation.catch(()=>{});return operation;},close(){db.close();}};
}
