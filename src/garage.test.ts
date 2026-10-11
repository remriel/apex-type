import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadCars, unlockedCars, recordCompletion, selectedCar, completedRaces } from './garage.ts';
test('three starter classics, progress milestones, persistence and locked selection fallback',async()=>{
  const data=JSON.parse(readFileSync(new URL('../public/cars.json',import.meta.url),'utf8'));
  const oldFetch=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify(data));
  const store=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>store.get(key)??null,setItem:(key:string,value:string)=>store.set(key,value)}});
  try{
    await loadCars();assert.ok(unlockedCars(0).length>=3);
    for(const id of ['bursley-72','180mx-94','eighties-gt'])assert.ok(unlockedCars(0).some(c=>c.id===id));
    for(const [id,milestone] of [['charger',3],['model-t',8],['f40',15]] as const){assert.ok(!unlockedCars(milestone-1).some(c=>c.id===id));assert.ok(unlockedCars(milestone).some(c=>c.id===id));}
    store.set('apex-car','f40');assert.notEqual(selectedCar(),'f40');assert.ok(unlockedCars(0).some(c=>c.id===selectedCar()));
    store.set('apex-completed','2');assert.ok(recordCompletion().some(c=>c.id==='charger'));assert.equal(completedRaces(),3);
    store.set('apex-car','charger');assert.equal(selectedCar(),'charger');
    store.set('apex-completed','14');assert.ok(recordCompletion().some(c=>c.id==='f40'));assert.equal(completedRaces(),15);
  }finally{globalThis.fetch=oldFetch;Reflect.deleteProperty(globalThis,'localStorage');}
});
