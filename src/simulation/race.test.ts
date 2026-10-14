import test from 'node:test';
import assert from 'node:assert/strict';
import { Race, passages, randomPassageIndex } from './race.ts';
const running = () => { const r = new Race('hello world'); r.start(); r.tick(3); return r; };
test('random passage choice covers the library and skips the previous solo passage', () => {
  assert.equal(passages.length,32);
  assert.equal(new Set(passages).size,32);
  assert.ok(passages.every(p=>p.length>=180&&p.length<=320));
  for(let previous=-1;previous<passages.length;previous++) {
    const count=passages.length-(previous>=0?1:0);
    const chosen=Array.from({length:count},(_,i)=>randomPassageIndex(previous,()=>(i+.5)/count));
    assert.equal(new Set(chosen).size,count);
    assert.ok(chosen.every(i=>i>=0&&i<passages.length&&i!==previous));
  }
});
test('countdown gates input and starts race', () => { const r=new Race('hello'); r.input('hello'); assert.equal(r.progress[0],0); r.start(); r.tick(2); assert.equal(r.phase,'countdown'); r.tick(1); assert.equal(r.phase,'running'); });
test('mistakes block distance until corrected and lower accuracy', () => { const r=running(); r.input('helx'); assert.equal(r.correct,3); r.input('helxo'); assert.equal(r.correct,3); r.input('hel'); r.input('hello'); assert.equal(r.correct,5); assert.equal(r.errors,1); assert.equal(r.accuracy,86); });
test('pause freezes timer and AI and ignores typing', () => { const r=running(); r.tick(5); r.pause(); const p=[...r.progress]; r.tick(50); r.input('hello'); assert.equal(r.elapsed,5); assert.deepEqual(r.progress,p); assert.equal(r.value,''); r.resume(); r.tick(1); assert.equal(r.elapsed,6); });
test('finishing records rank and freezes results', () => { const r=running(); r.tick(10); r.input('hello world'); assert.equal(r.phase,'finished'); assert.equal(r.finishedAt[0],10); assert.equal(r.wpm,13); const elapsed=r.elapsed; r.tick(100); assert.equal(r.elapsed,elapsed); assert.ok(r.position>=1&&r.position<=4); });
test('AI opponents finish, faster difficulty travels farther', () => { const a=new Race('a'.repeat(100),'rookie'); const b=new Race('a'.repeat(100),'pro'); for(const r of [a,b]) {r.start();r.tick(3);r.tick(10);} assert.ok(b.progress[1]>a.progress[1]); b.tick(100); assert.equal(b.progress[1],1); assert.ok(b.finishedAt[1]!==null); });
test('countdown resumes correctly after pause', () => { const r=new Race('hello');r.start();r.tick(1);r.pause();r.tick(20);r.resume();assert.equal(r.phase,'countdown');r.tick(2);assert.equal(r.phase,'running'); });
