import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadCars, unlockedCars, recordCompletion, selectedCar, completedRaces } from './garage.ts';
test('three starter classics, progress milestones, persistence and locked selection fallback',async()=>{
  const data=JSON.parse(readFileSync(new URL('../public/cars.json',import.meta.url),'utf8'));
  const oldFetch=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify(data));
  const store=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>store.get(key)??null,setItem:(key:string,value:string)=>store.set(key,value)}});
  try{
    await loadCars();assert.equal(unlockedCars(0).length,3);assert.equal(unlockedCars(3).length,4);assert.equal(unlockedCars(8).length,5);assert.equal(unlockedCars(15).length,6);
    store.set('apex-car','f40');assert.equal(selectedCar(),'bursley-72');
    store.set('apex-completed','2');assert.deepEqual(recordCompletion().map(c=>c.id),['charger']);assert.equal(completedRaces(),3);
    store.set('apex-car','charger');assert.equal(selectedCar(),'charger');
    store.set('apex-completed','14');assert.deepEqual(recordCompletion().map(c=>c.id),['f40']);assert.equal(completedRaces(),15);
  }finally{globalThis.fetch=oldFetch;Reflect.deleteProperty(globalThis,'localStorage');}
});
