import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { racerInfo } from '../simulation/race';
import { loadCars, getCar, selectedCar, cars as catalog } from '../garage';
import { chasePose } from './chase';
import { raceCameraPose } from './director';
import type { Phase } from '../simulation/race';

export type CameraMode = 'auto' | 'circuit' | 'chase' | 'top';
export type Atmosphere = 'midnight' | 'alpine';
const up = new THREE.Vector3(0, 1, 0);
const curve = new THREE.CatmullRomCurve3([
  [-95, 1, 60], [-105, 1, -8], [-78, 2, -84], [-15, 3, -105],
  [72, 3, -85], [108, 2, -38], [84, 1, 13], [103, 1, 67],
  [54, 1, 96], [12, 1, 69], [-34, 1, 102], [-82, 1, 94]
].map(p => new THREE.Vector3(...p)), true, 'catmullrom', 0.45);
curve.arcLengthDivisions = 2000;
const assetUrl = (file: string) => `${import.meta.env?.BASE_URL ?? '/'}assets/${file}`;

// Every lane, road edge, car and minimap point uses the same arc-length parameter.
export function trackPoint(progress: number, offset = 0, height = 0) {
  const u = ((progress % 1) + 1) % 1;
  const p = curve.getPointAt(u);
  const tangent = curve.getTangentAt(u);
  const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
  return p.addScaledVector(normal, offset).addScaledVector(up, height);
}

function ribbon(inner: number, outer: number, height: number, material: THREE.Material, alternating = false) {
  const vertices: number[] = [], uvs: number[] = [], indices: number[] = [], colors: number[] = [];
  const n = 900;
  for (let i = 0; i <= n; i++) {
    for (const offset of [inner, outer]) {
      const p = trackPoint(i / n, offset, height);
      vertices.push(p.x, p.y, p.z);
      uvs.push(i / n * 90, offset / 14 * 2);
      const c = Math.floor(i / 4) % 2 ? 0.32 : 0.82;
      colors.push(c, c, c);
    }
    if (i < n) {const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  if(alternating)g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  g.setIndex(indices);g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,material);mesh.receiveShadow=true;return mesh;
}

export class World {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(43, 1, 0.1, 1800);
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  mode: CameraMode = 'auto';
  atmosphere: Atmosphere = 'midnight';
  cars: THREE.Group[] = [];
  visualProgress = [0,0,0,0];
  labels: HTMLElement[];
  scenery = new THREE.Group();
  ground: THREE.Mesh;
  grid: THREE.GridHelper;
  sun: THREE.DirectionalLight;
  ambient: THREE.HemisphereLight;
  panorama: THREE.Texture | null = null;
  loaded = false;
  lost = false;
  quality: 'high' | 'low' = 'high';
  racerCount=4;
  private modelCache=new Map<string,Promise<THREE.Object3D>>();
  private carModels=['','','',''];
  private target = new THREE.Vector3();
  private desiredCamera = new THREE.Vector3();
  private desiredTarget = new THREE.Vector3();
  private chaseSpeed = 0;
  private cameraInitialized = false;
  private observer: ResizeObserver;
  private width = 1;
  private height = 1;
  constructor(private container: HTMLElement, labels: HTMLElement[], private status: (text: string) => void) {
    this.labels=labels;
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.05;
    this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=THREE.PCFShadowMap;
    this.container.append(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-label','3D race circuit with four racing cars');
    this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;status('Graphics paused. Waiting for your GPU to reconnect.');});
    this.renderer.domElement.addEventListener('webglcontextrestored',()=>{this.lost=false;status('Graphics restored.');});
    this.scene.background=new THREE.Color('#0a0e13');
    this.scene.fog=new THREE.FogExp2('#0a0e13',0.00135);
    this.ambient=new THREE.HemisphereLight('#d8e9ff','#192530',1.4);this.scene.add(this.ambient);
    this.sun=new THREE.DirectionalLight('#faf1d6',2);this.sun.position.set(-110,170,80);
    this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);
    Object.assign(this.sun.shadow.camera,{left:-160,right:160,top:160,bottom:-160,near:1,far:600});
    this.sun.shadow.bias=-0.0005;this.scene.add(this.sun);
    this.ground=new THREE.Mesh(new THREE.PlaneGeometry(5000,5000),new THREE.MeshStandardMaterial({color:'#080e16',roughness:1}));
    this.ground.rotation.x=-Math.PI/2;this.ground.position.y=-2;this.ground.receiveShadow=true;this.scene.add(this.ground);
    this.grid=new THREE.GridHelper(1500,100,'#24323f','#1b2733');this.grid.position.y=-1.97;
    (this.grid.material as THREE.Material).transparent=true;(this.grid.material as THREE.Material).opacity=0.4;this.scene.add(this.grid);
    const asphalt = new THREE.MeshStandardMaterial({color:'#333d48',roughness:0.82,side:THREE.DoubleSide});
    new THREE.TextureLoader().load(assetUrl('asphalt.webp'),t=>{t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;asphalt.map=t;asphalt.color.set('#ffffff');asphalt.needsUpdate=true;},undefined,()=>{});
    this.scene.add(ribbon(-7,7,0,asphalt));
    this.scene.add(ribbon(-8.8,8.8,-0.38,new THREE.MeshStandardMaterial({color:'#141b25',roughness:0.7,side:THREE.DoubleSide})));
    const curb=new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:0.6});
    this.scene.add(ribbon(-8,-7,0.04,curb,true),ribbon(7,8,0.04,curb,true));
    for(const side of [-8.4,8.4]) {
      const pts=Array.from({length:700},(_,i)=>trackPoint(i/700,side,0.25));
      const path=new THREE.CatmullRomCurve3(pts,true);
      const edge=new THREE.Mesh(new THREE.TubeGeometry(path,900,0.22,6,true),new THREE.MeshBasicMaterial({color:new THREE.Color('#e8ad52').multiplyScalar(2.1)}));
      this.scene.add(edge);
    }
    const markings=new THREE.Group();
    const white=new THREE.MeshStandardMaterial({color:'#b5c0cb',roughness:0.7});
    for(let i=0;i<180;i++) {
      const u=i/180;
      const dash=new THREE.Mesh(new THREE.PlaneGeometry(0.16,1.8),white);
      dash.rotation.order='YXZ';dash.rotation.x=-Math.PI/2;
      const t=curve.getTangentAt(u);dash.rotation.y=Math.atan2(t.x,t.z);
      dash.position.copy(trackPoint(u,0,0.025));markings.add(dash);
    }
    this.scene.add(markings);
    // Checkerboard is a circuit marking, generated from its geometric layout.
    const checkerCanvas=document.createElement('canvas');checkerCanvas.width=128;checkerCanvas.height=32;
    const c=checkerCanvas.getContext('2d')!;
    for(let y=0;y<2;y++)for(let x=0;x<8;x++){c.fillStyle=(x+y)%2?'#14202b':'#e7ebee';c.fillRect(x*16,y*16,16,16);}
    const checker=new THREE.Mesh(new THREE.PlaneGeometry(14,3.5),new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(checkerCanvas),side:THREE.DoubleSide}));
    checker.rotation.order='YXZ';checker.rotation.x=-Math.PI/2;
    const st=curve.getTangentAt(0);checker.rotation.y=Math.atan2(st.x,st.z);checker.position.copy(trackPoint(0,0,0.04));this.scene.add(checker);
    this.scene.add(this.scenery);
    this.composer=new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene,this.camera));
    this.bloom=new UnrealBloomPass(new THREE.Vector2(1,1),0.65,0.5,0.85);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());
    this.camera.position.set(180,290,285);this.camera.lookAt(0,0,0);
    this.target.set(0,0,0);
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(container);this.resize();
  }
  async load() {
    const loader=new GLTFLoader();
    await loadCars();
    for(let i=0;i<4;i++) {
      const group=new THREE.Group();
      // Light wash under each model communicates racer identity on the dark circuit.
      const glow=new THREE.PointLight(racerInfo[i].color,14,13,1.5);glow.position.y=1.6;group.add(glow);
      this.cars.push(group);this.scene.add(group);
    }
    await Promise.all(this.cars.map((_,i)=>this.setCar(i,i===0?selectedCar():catalog[i%3].id)));
    this.loaded=true;this.setRacers(this.racerCount);this.status('Track ready');
    this.loadScenery(loader).catch(()=>{});
    new THREE.TextureLoader().load(assetUrl('alpine.webp'),t=>{t.colorSpace=THREE.SRGBColorSpace;t.mapping=THREE.EquirectangularReflectionMapping;this.panorama=t;if(this.atmosphere==='alpine')this.setAtmosphere('alpine');},undefined,()=>{});
  }
  private async loadScenery(loader: GLTFLoader) {
    const [tree,rock]=await Promise.all(['tree_pineTallA_detailed.glb','stone_largeA.glb'].map(n=>loader.loadAsync(assetUrl(n))));
    let seed=77;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    const centerline=Array.from({length:400},(_,i)=>trackPoint(i/400));
    for(let i=0;i<140;i++) {
      const x=(random()-.5)*400,z=(random()-.5)*400;
      if(centerline.some(p=>Math.hypot(p.x-x,p.z-z)<17))continue;
      const o=(i%5===0?rock:tree).scene.clone(true);o.position.set(x,-1.9,z);o.scale.setScalar(i%5===0?4+random()*7:5+random()*7);o.rotation.y=random()*Math.PI*2;
      o.traverse(n=>{if(n instanceof THREE.Mesh){n.castShadow=true;n.receiveShadow=true;}});this.scenery.add(o);
    }
    this.scenery.visible=this.atmosphere==='alpine';
  }
  setAtmosphere(mode: Atmosphere) {
    this.atmosphere=mode;const day=mode==='alpine';this.scenery.visible=day;this.grid.visible=!day;
    this.scene.background=day&&this.panorama?this.panorama:new THREE.Color(day?'#b7c3c7':'#0a0e13');
    this.scene.fog=new THREE.FogExp2(day?'#b7c3c7':'#0a0e13',day?0.002:0.00135);
    (this.ground.material as THREE.MeshStandardMaterial).color.set(day?'#5e7163':'#080e16');
    this.sun.intensity=day?3.5:2;this.ambient.intensity=day?2.4:1.4;this.bloom.strength=day?0.2:0.65;
  }
  setQuality(value:'high'|'low') {
    this.quality=value;this.renderer.setPixelRatio(value==='low'?1:Math.min(devicePixelRatio,1.5));
    this.renderer.shadowMap.enabled=value==='high';this.resize();
  }
  setRacers(count:number){
    this.racerCount=count;
    this.cars.forEach((car,i)=>{
      car.visible=i<count;this.labels[i].style.setProperty('--racer',racerInfo[i].color);this.labels[i].querySelector('span')!.textContent=i===0?'YOU':racerInfo[i].name.toUpperCase();
      car.traverse(o=>{if(o instanceof THREE.PointLight)o.color.set(racerInfo[i].color);});
    });
  }
  async setCar(index:number,id:string){
    const spec=getCar(id);if(!spec||!this.cars[index])return;
    if(this.carModels[index]===spec.id)return;this.carModels[index]=spec.id;
    if(!this.modelCache.has(spec.id))this.modelCache.set(spec.id,new GLTFLoader().loadAsync('/'+spec.model).then(g=>g.scene));
    const prototype=await this.modelCache.get(spec.id)!;if(this.carModels[index]!==spec.id)return;
    const group=this.cars[index];const old=group.getObjectByName('car-visual');if(old)group.remove(old);
    const model=prototype.clone(true);model.name='car-visual';model.rotation.y=spec.rotationY;
    model.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();}});
    group.add(model);
  }
  resize() {
    const {width,height}=this.container.getBoundingClientRect();this.width=Math.max(width,1);this.height=Math.max(height,1);
    this.camera.aspect=this.width/this.height;this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width,this.height);this.composer.setSize(this.width,this.height);
  }
  reset(){this.visualProgress=[0,0,0,0];this.chaseSpeed=0;this.cameraInitialized=false;}
  update(progress: number[], dt: number, speed:number, reducedMotion:boolean, phase: Phase = 'running') {
    if(this.lost)return;
    const ease=1-Math.exp(-dt*7);
    const previousProgress=this.visualProgress[0];
    this.cars.forEach((car,i)=>{
      this.visualProgress[i]+= (progress[i]-this.visualProgress[i])*ease;
      const u=this.visualProgress[i]*0.994+0.004;
      car.position.copy(trackPoint(u,[-4.8,-1.6,1.6,4.8][i],0.12));
      const t=curve.getTangentAt(u);car.rotation.y=Math.atan2(t.x,t.z);
      car.rotation.x=-Math.asin(t.y);
      car.getObjectByName('car-visual')?.traverse(n=>{if(n.name.startsWith('wheel-'))n.rotation.x-=dt*speed*0.6;});
    });
    const p=this.cars[0]?.position??trackPoint(0,-4.8);
    const t=curve.getTangentAt(this.visualProgress[0]*0.994+0.004);
    const velocity=phase==='running'&&dt>0?Math.max(0,this.visualProgress[0]-previousProgress)*curve.getLength()/dt:0;
    this.chaseSpeed+=(velocity-this.chaseSpeed)*(1-Math.exp(-dt*2.5));
    let desiredFov=43;
    if(this.mode==='chase'||this.mode==='auto') {
      const u=this.visualProgress[0]*0.994+0.004;
      const ahead=curve.getTangentAt((u+0.025)%1);
      const battle=this.cars.slice(1,this.racerCount).reduce((closest,car,i)=>
        progress[i+1]>=1?closest:Math.max(closest,1-THREE.MathUtils.clamp(car.position.distanceTo(p)/28,0,1)),0);
      const chase=chasePose(p,t,ahead,this.chaseSpeed,battle,phase,this.camera.aspect,reducedMotion);
      const pose=raceCameraPose(this.mode,phase,chase,p,t,this.visualProgress[0],this.camera.aspect);
      this.desiredCamera.copy(pose.camera);this.desiredTarget.copy(pose.target);desiredFov=pose.fov;
    } else if(this.mode==='top') {
      this.desiredCamera.set(0,440/Math.min(this.camera.aspect,1.7),25);this.desiredTarget.set(0,0,0);
    } else {
      const factor=Math.max(1,1.38/this.camera.aspect);
      this.desiredCamera.set(114*factor,185*factor,205*factor);
      this.desiredTarget.set(0,-15,0);
    }
    const cameraEase=!this.cameraInitialized||reducedMotion?1:1-Math.exp(-dt*(this.mode==='chase'||this.mode==='auto'?6:3));
    this.camera.position.lerp(this.desiredCamera,cameraEase);this.target.lerp(this.desiredTarget,cameraEase);this.camera.lookAt(this.target);
    this.camera.fov+=(desiredFov-this.camera.fov)*cameraEase;this.camera.updateProjectionMatrix();this.cameraInitialized=true;
    if(this.quality==='high')this.composer.render();else this.renderer.render(this.scene,this.camera);
    this.cars.forEach((car,i)=>{
      const screen=car.position.clone().add(new THREE.Vector3(0,4,0)).project(this.camera);
      const label=this.labels[i];label.style.left=`${(screen.x*.5+.5)*this.width}px`;label.style.top=`${(-screen.y*.5+.5)*this.height}px`;
      label.hidden=i>=this.racerCount||screen.z>1||screen.z<-1||Math.abs(screen.x)>1||Math.abs(screen.y)>1;
      if(i>0){const playerScreen=this.cars[0].position.clone().add(new THREE.Vector3(0,4,0)).project(this.camera);if(Math.hypot((screen.x-playerScreen.x)*this.width/2,(screen.y-playerScreen.y)*this.height/2)<38)label.hidden=true;}
    });
  }
  drawMap(canvas:HTMLCanvasElement,progress:number[]) {
    const c=canvas.getContext('2d')!;c.clearRect(0,0,canvas.width,canvas.height);
    const map=(p:THREE.Vector3)=>[(p.x+130)/260*canvas.width,(p.z+130)/260*canvas.height];
    c.lineWidth=7;c.strokeStyle='#293640';c.beginPath();for(let i=0;i<=160;i++){const [x,y]=map(trackPoint(i/160));i?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();
    c.lineWidth=1;c.strokeStyle='#60707c';c.stroke();
    for(let i=this.racerCount-1;i>=0;i--){const[x,y]=map(trackPoint(progress[i]*.994+.004));c.fillStyle=racerInfo[i].color;c.beginPath();c.arc(x,y,i===0?4:3,0,Math.PI*2);c.fill();}
  }
  dispose(){this.observer.disconnect();this.composer.dispose();this.renderer.dispose();}
}
