export type RoomPlayer={id:string;name:string;seat:number;carId:string;color:string;progress:number;accuracy:number;wpm:number;finishedTime:number|null;connected:boolean};
export type Room={code:string;hostId:string;status:'lobby'|'racing'|'finished';startsAt:number|null;serverTime:number;passageIndex:number;players:RoomPlayer[]};
type Credential={code:string;playerId:string;token:string};
export class Multiplayer {
  room:Room|null=null;
  credentials:Credential|null=null;
  offset=0;
  sequence=0;
  failures=0;
  restoring=false;
  self:{value:string;attempts:number;successful:number;sequence:number;finished_at:number|null}|null=null;
  private timer:ReturnType<typeof setTimeout>|undefined;
  private busy=false;
  private generation=0;
  constructor(private changed:(room:Room)=>void,private connection:(message:string)=>void,private getInput:()=>{value:string;attempts:number;successful:number}){}
  get playerId(){return this.credentials?.playerId;}
  get isHost(){return this.room?.hostId===this.playerId;}
  get now(){return Date.now()+this.offset;}
  private async request(path:string,body?:unknown,authenticated=true){
    const generation=this.generation;const sent=Date.now();const response=await fetch(`/api${path}`,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(authenticated&&this.credentials?{'x-racer-token':this.credentials.token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(8000)});
    const data=await response.json();if(!response.ok)throw new Error(data.error??'The room could not connect. Try again.');
    const room:Room|undefined=data.room??(data.players?data:undefined);
    if(room&&generation===this.generation){this.offset=room.serverTime-(sent+Date.now())/2;this.room=room;this.self=data.self??null;this.changed(room);this.sequence=Math.max(this.sequence,data.self?.sequence??0);}
    return data;
  }
  private remember(){try{sessionStorage.setItem('apex-room',JSON.stringify(this.credentials));}catch{}const url=new URL(location.href);url.searchParams.set('room',this.credentials!.code);history.replaceState(null,'',url);}
  async create(name:string,carId:string){const data=await this.request('/rooms',{name,carId},false);this.credentials={code:data.code,playerId:data.playerId,token:data.token};this.remember();this.changed(data.room);this.poll();}
  async join(code:string,name:string,carId:string){const data=await this.request(`/rooms/${code.toUpperCase()}/join`,{name,carId},false);this.credentials={code:data.code,playerId:data.playerId,token:data.token};this.remember();this.changed(data.room);this.poll();}
  async setCar(carId:string){await this.request(`/rooms/${this.credentials!.code}/car`,{carId});}
  async reconnect(code:string){let saved:Credential;try{saved=JSON.parse(sessionStorage.getItem('apex-room')??'null');}catch{return false;}if(!saved||saved.code!==code||!saved.token)return false;this.credentials=saved;this.restoring=true;try{await this.sync();this.poll();return true;}catch{this.credentials=null;return false;}finally{this.restoring=false;}}
  async start(){await this.request(`/rooms/${this.credentials!.code}/start`,{});}
  async rematch(){this.sequence=0;await this.request(`/rooms/${this.credentials!.code}/rematch`,{});}
  async sync(){if(!this.credentials)return;const data=this.getInput();await this.request(`/rooms/${this.credentials.code}/sync`,{...data,sequence:++this.sequence});}
  private poll(){clearTimeout(this.timer);this.timer=setTimeout(async()=>{if(!this.credentials||this.busy)return;this.busy=true;try{await this.sync();if(this.failures)this.connection('Room reconnected.');this.failures=0;}catch(e){this.failures++;this.connection(this.failures>2?'Connection interrupted. Retrying…':(e as Error).message);}finally{this.busy=false;this.poll();}},this.failures?Math.min(5000,750*this.failures):750);}
  async leave(){clearTimeout(this.timer);const c=this.credentials;const leaving=c?this.request(`/rooms/${c.code}/leave`,{}):Promise.resolve();this.generation++;this.credentials=null;this.room=null;try{sessionStorage.removeItem('apex-room');}catch{}const url=new URL(location.href);url.searchParams.delete('room');history.replaceState(null,'',url);await leaving.catch(()=>{});}
  stop(){clearTimeout(this.timer);this.credentials=null;this.room=null;}
}
