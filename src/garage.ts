export type Car={id:string;name:string;subtitle:string;model:string;preview:string;unlockRaces:number;rotationY:number;author:string;source:string;license:string;licenseUrl?:string};
export let cars:Car[]=[];
let loading:Promise<Car[]>|undefined;
export const loadCars=()=>loading??= (async()=>{const response=await fetch('/cars.json');if(!response.ok)throw new Error('The car catalog could not load.');cars=await response.json();return cars;})();
export const getCar=(id:string)=>cars.find(c=>c.id===id)??cars[0];
export const unlockedCars=(completed:number)=>cars.filter(c=>c.unlockRaces<=completed);
export function completedRaces(){try{return Math.max(0,Number(localStorage.getItem('apex-completed'))||0);}catch{return 0;}}
export function selectedCar(){try{const saved=localStorage.getItem('apex-car');return unlockedCars(completedRaces()).find(c=>c.id===saved)?.id??cars[0]?.id??'bursley-72';}catch{return cars[0]?.id??'bursley-72';}}
export function recordCompletion(){const before=completedRaces();const after=before+1;try{localStorage.setItem('apex-completed',String(after));}catch{}return cars.filter(c=>c.unlockRaces>before&&c.unlockRaces<=after);}
