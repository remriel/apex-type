import './style.css';
import { Race, passages, racerInfo, type Difficulty, randomPassageIndex } from './simulation/race';
import { World, type CameraMode, type Atmosphere } from './render/world';
import { Multiplayer, type Room } from './network';
import { loadCars, cars, selectedCar, getCar, completedRaces, recordCompletion } from './garage';
import { inject } from '@vercel/analytics';

const icon = (name:string) => {
  const paths:Record<string,string>={settings:'<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="m9 3-1 3-3 1-2 5 2 5 3 1 1 3h6l1-3 3-1 2-5-2-5-3-1-1-3Z"/>',sound:'<path d="M4 9h4l5-4v14l-5-4H4Z"/><path d="M17 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',reset:'<path d="M4 10a8 8 0 1 1 2 8M4 4v6h6"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',pause:'<path d="M8 5v14M16 5v14"/>',flag:'<path d="M5 21V3m0 0h14l-2 5 2 5H5"/>',camera:'<rect x="3" y="6" width="18" height="14" rx="3"/><path d="m8 6 2-3h4l2 3"/><circle cx="12" cy="13" r="4"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>'};
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]??paths.arrow}</svg>`;
};
const read=(key:string,fallback:string)=>{try{return localStorage.getItem(key)??fallback;}catch{return fallback;}};
const save=(key:string,value:string)=>{try{localStorage.setItem(key,value);}catch{}};
let difficulty:Difficulty=['rookie','sport','pro'].includes(read('apex-difficulty','sport'))?read('apex-difficulty','sport') as Difficulty:'sport';
let passageIndex=randomPassageIndex();
let race=new Race(passages[passageIndex],difficulty);
let best=Number(read('apex-best','0'))||0;
let sound=read('apex-sound','false')==='true';
let ready=false;
let world:World|undefined;
let multiplayer:Multiplayer;
let multiplayerKey='';
let rosterKey='';
let hasNewBest=false;
let completionRecorded=false;
let unlockedThisRace:string[]=[];
const soloRacers=racerInfo.map(r=>({...r}));
const escapeHtml=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
let audioContext:AudioContext|undefined,engine:OscillatorNode|undefined,engineGain:GainNode|undefined;
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelector('#app')!.innerHTML=`
  <header class="header">
    <a class="brand" href="#" aria-label="APEX TYPE home"><span class="brand-mark">A</span><span>APEX<span class="brand-type">TYPE</span><small>EVERY KEYSTROKE COUNTS.</small></span></a>
    <nav aria-label="Game navigation"><button class="nav-active" id="race-tab">Quick race</button><button id="multiplayer-nav">Multiplayer</button><button id="garage-nav">Garage</button><button id="how-button">How to play <span class="question-mark">?</span></button></nav>
    <div class="header-tools"><div class="best"><span>PERSONAL BEST</span><b id="best">${best}<small> WPM</small></b></div><button class="icon-button" id="sound-button" title="Turn sound on" aria-label="Turn sound on">${icon('sound')}<span class="mute-dot"></span></button><button class="icon-button" id="settings-button" aria-label="Settings" title="Settings">${icon('settings')}</button></div>
  </header>
  <main class="game" data-phase="ready">
    <div id="world"></div>
    <div class="world-vignette"></div>
    <div class="circuit-heading"><span class="eyebrow"><i></i> CIRCUIT 01 <span>/</span> NIGHT SESSION</span><h1 id="track-name">Midnight circuit<span>.</span></h1><p id="track-caption">A little focus. A lot of fast.</p></div>
    <div class="race-metrics"><div class="position-stat"><span class="metric-label">POSITION</span><strong id="position">1<span>st</span><small>/ 4</small></strong></div><div class="metric"><span class="metric-label">SPEED</span><strong id="wpm">0<small>WPM</small></strong></div><div class="metric"><span class="metric-label">ACCURACY</span><strong id="accuracy">100<small>%</small></strong></div></div>
    <aside class="standings" aria-label="Race standings"><div class="standings-heading"><span>THE GRID</span><span class="ai-label">3 AI RACERS</span></div><div id="racers"></div><div class="session-detail"><span>ONE LAP</span><span id="timer">00:00.0</span></div></aside>
    <div id="car-labels">${racerInfo.map((r,i)=>`<div class="car-label ${i===0?'player-label':''}" style="--racer:${r.color}" data-racer="${i}"><span>${i===0?'YOU':r.name.toUpperCase()}</span></div>`).join('')}</div>
    <div class="map-panel"><canvas id="minimap" width="156" height="140" aria-label="Circuit minimap"></canvas><span id="map-percent">0% COMPLETE</span></div>
    <div class="camera-controls"><span>${icon('camera')} VIEW</span><div role="group" aria-label="Camera view"><button class="selected" data-camera="auto" aria-pressed="true">Auto</button><button data-camera="circuit" aria-pressed="false">Circuit</button><button data-camera="chase" aria-pressed="false">Chase</button><button data-camera="top" aria-pressed="false">Top</button></div><button id="garage-button" class="garage-shortcut">GARAGE <span id="current-car-name"></span></button></div>
    <div class="center-status" id="center-status" aria-live="polite"></div>
    <section class="typing-dock" aria-label="Typing race">
      <div class="dock-heading"><div><span class="live-indicator"></span><span id="typing-label">YOUR KEYBOARD IS THE ACCELERATOR</span></div><div class="dock-actions"><label class="difficulty-label" for="difficulty">PACE</label><select id="difficulty" aria-label="Opponent difficulty"><option value="rookie">Rookie</option><option value="sport">Sport</option><option value="pro">Pro</option></select><button class="dock-icon" id="pause-button" title="Pause race (Esc)" aria-label="Pause race" disabled>${icon('pause')}</button><button class="dock-icon" id="restart-button" title="New race (Tab + Enter)" aria-label="New race">${icon('reset')}</button></div></div>
      <div class="quote" id="quote" aria-label="Passage to type"></div>
      <div class="input-row"><input id="typing-input" type="text" aria-label="Type the passage exactly as shown" placeholder="Type here. Find your rhythm." autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" disabled /><button class="start-button" id="start-button">Start race ${icon('arrow')}<kbd>ENTER</kbd></button><button class="friends-button" id="friends-button">Race with friends ${icon('arrow')}</button><span class="input-hint" id="input-hint">Ready when you are.</span></div>
      <div class="race-progress"><div id="progress-fill"></div></div>
    </section>
    <footer class="footer"><span><i class="footer-dot"></i><span id="load-status">BUILDING YOUR CIRCUIT…</span></span><span>TYPE FAST. DRIVE FASTER.</span><span id="footer-hint"><kbd>ESC</kbd> PAUSE <b>·</b> BACKSPACE TO CORRECT</span></footer>
    <div class="modal-layer" id="pause-layer" hidden><div class="pause-panel"><span class="eyebrow">TAKE A BREATH</span><h2>Race paused<span>.</span></h2><p>Your place on the track is safe.</p><button class="primary" id="resume-button">Back to the race ${icon('arrow')}</button><button class="text-button" id="pause-restart">Start a new race</button></div></div>
    <div class="modal-layer" id="results-layer" hidden><section class="results-panel" aria-label="Race results"><div class="result-icon">${icon('flag')}</div><span class="eyebrow" id="result-eyebrow">ACROSS THE LINE</span><h2 id="result-title">What a finish<span>.</span></h2><p id="result-subtitle"></p><div class="result-stats"><div><strong id="result-wpm"></strong><span>WORDS / MIN</span></div><div><strong id="result-accuracy"></strong><span>ACCURACY</span></div><div><strong id="result-time"></strong><span>RACE TIME</span></div></div><div id="result-order"></div><button class="primary" id="again-button">Race again ${icon('arrow')}<kbd>ENTER</kbd></button></section></div>
  </main>
  <dialog id="how-dialog"><button class="dialog-close" aria-label="Close instructions">${icon('close')}</button><span class="eyebrow">THE DRIVER'S BRIEFING</span><h2>Words are your fuel<span>.</span></h2><p>Race around a real 3D circuit. Your typing is the accelerator.</p><ol class="instructions"><li><b>01</b><div><strong>Start your engines.</strong><p>Choose a pace, then press Enter. The race starts after a three-second countdown.</p></div></li><li><b>02</b><div><strong>Find your rhythm.</strong><p>Type the passage exactly, including spaces and punctuation. Correct characters move your car around the track.</p></div></li><li><b>03</b><div><strong>Keep it clean.</strong><p>A red character means a mistake. Backspace to fix it before you can make more progress. Pasting is disabled.</p></div></li><li><b>04</b><div><strong>Chase the finish.</strong><p>Complete the passage to finish one lap. Race three AI opponents and beat your personal best. Esc pauses the race.</p></div></li></ol><button class="primary dialog-done">Let's race ${icon('arrow')}</button></dialog>
  <dialog id="settings-dialog"><button class="dialog-close" aria-label="Close settings">${icon('close')}</button><span class="eyebrow">MAKE IT YOUR RACE</span><h2>The pit stop<span>.</span></h2><div class="setting-row"><div><strong>Track atmosphere</strong><p>Same circuit. A different feeling.</p></div><select id="atmosphere"><option value="midnight">Midnight</option><option value="alpine">Alpine sunrise</option></select></div><div class="setting-row"><div><strong>Graphics</strong><p>Use performance mode on slower devices.</p></div><select id="quality"><option value="high">High quality</option><option value="low">Performance</option></select></div><div class="setting-row"><div><strong>Engine & keystrokes</strong><p>A little feedback for your fast fingers.</p></div><button class="toggle" id="sound-setting" aria-pressed="false">Off</button></div><p class="settings-note">A hardware keyboard works best. Your personal best and settings are saved on this device.</p><button class="primary dialog-done">Back to the circuit ${icon('arrow')}</button></dialog>
`;
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const input=$<HTMLInputElement>('typing-input');
const game=document.querySelector<HTMLElement>('.game')!;
const difficultySelect=$<HTMLSelectElement>('difficulty');difficultySelect.value=difficulty;
const quote=$('quote');
const minimap=$<HTMLCanvasElement>('minimap');
const dockObserver=new ResizeObserver(()=>{const dock=document.querySelector<HTMLElement>('.typing-dock')!;const footerSpace=parseFloat(getComputedStyle(dock).bottom)||39;game.style.setProperty('--controls-bottom',`${dock.offsetHeight+footerSpace+14}px`);game.style.setProperty('--world-bottom',`${dock.offsetHeight+footerSpace-16}px`);});
dockObserver.observe(document.querySelector('.typing-dock')!);
let quoteSpans:HTMLElement[]=[];
let previousPhase='';
let lastUi=0;
let toastUntil=0;
function setQuote(){quote.replaceChildren(...[...race.passage].map(char=>{const s=document.createElement('span');s.textContent=char;return s;}));quoteSpans=[...quote.children] as HTMLElement[];quote.setAttribute('aria-label',`Passage to type: ${race.passage}`);renderQuote();}
function renderQuote(){quoteSpans.forEach((s,i)=>s.className=i<race.correct?'correct':i<race.value.length?'incorrect':i===race.correct?'current':'');input.classList.toggle('has-error',race.value.length>race.correct);}
function formatTime(seconds:number){const minutes=Math.floor(seconds/60);return `${String(minutes).padStart(2,'0')}:${(seconds%60).toFixed(1).padStart(4,'0')}`;}
function ordinal(n:number){return ['','st','nd','rd','th'][n];}
function message(text:string){$('load-status').textContent=text;toastUntil=performance.now()+2400;}
function focusTyping(){if(race.phase==='running')input.focus({preventScroll:true});}
function newRace(){if(multiplayer?.credentials){showLobby();return;}hasNewBest=false;completionRecorded=false;unlockedThisRace=[];passageIndex=randomPassageIndex(passageIndex);race=new Race(passages[passageIndex],difficulty);input.value='';world?.reset();world?.setCar(0,selectedCar()).catch(e=>message(e.message));for(let i=1;i<4;i++)if(cars.length)world?.setCar(i,cars[i%3].id).catch(e=>message(e.message));previousPhase='';setQuote();renderUi();}
function startRace(){if(!ready)return;if(multiplayer?.credentials){showLobby();return;}initAudio();race.start();renderUi();}
function setPaused(){if(multiplayer?.credentials){message('Multiplayer races keep running. Keep typing!');return;}race.pause();renderUi();}
function resumeRace(){race.resume();renderUi();focusTyping();}
function initAudio(){if(!sound||audioContext)return;try{audioContext=new AudioContext();engine=audioContext.createOscillator();engine.type='triangle';engineGain=audioContext.createGain();engineGain.gain.value=0;engine.connect(engineGain).connect(audioContext.destination);engine.start();}catch{sound=false;}}
function toggleSound(){sound=!sound;initAudio();audioContext?.resume().catch(()=>{});save('apex-sound',String(sound));$('sound-button').classList.toggle('sound-on',sound);$('sound-button').setAttribute('aria-label',sound?'Turn sound off':'Turn sound on');$('sound-button').title=sound?'Turn sound off':'Turn sound on';$('sound-setting').textContent=sound?'On':'Off';$('sound-setting').setAttribute('aria-pressed',String(sound));if(!sound&&engineGain)engineGain.gain.value=0;focusTyping();}
function clickTone(error:boolean){if(!sound||!audioContext)return;const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();oscillator.type='sine';oscillator.frequency.value=error?180:600;gain.gain.setValueAtTime(0.025,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,audioContext.currentTime+0.045);oscillator.connect(gain).connect(audioContext.destination);oscillator.start();oscillator.stop(audioContext.currentTime+0.05);}
function finish(){
  if(!completionRecorded&&race.progress[0]===1){completionRecorded=true;unlockedThisRace=recordCompletion().map(c=>c.name);renderGarage();}
  const didFinish=race.progress[0]===1;const isBest=didFinish&&race.wpm>best;if(isBest){hasNewBest=true;best=race.wpm;save('apex-best',String(best));$('best').innerHTML=`${best}<small> WPM</small>`;}
  $('result-eyebrow').textContent=hasNewBest?'NEW PERSONAL BEST':'ACROSS THE LINE';
  $('result-title').innerHTML=!didFinish?"Time's up<span>.</span>":race.position===1?'Pole position<span>.</span>':'What a finish<span>.</span>';
  $('result-subtitle').textContent=!didFinish?`The five-minute race limit is up. You completed ${Math.round(race.progress[0]*100)}% of the passage.`:unlockedThisRace.length?`New car unlocked: ${unlockedThisRace.join(', ')}. Find it in your garage.`:`You finished ${race.position}${ordinal(race.position)}. ${race.position===1?'The circuit is yours.':'Every lap makes you faster.'}`;
  $('result-wpm').textContent=String(race.wpm);$('result-accuracy').textContent=`${race.accuracy}%`;$('result-time').textContent=formatTime(race.elapsed);
  $('result-order').innerHTML=race.order.map((i,n)=>`<div class="result-row ${i===0?'you':''}"><span>${n+1}<i style="background:${racerInfo[i].color}"></i>${escapeHtml(racerInfo[i].name)}<small>${racerInfo[i].tag}</small></span><b>${race.finishedAt[i]!==null?formatTime(race.finishedAt[i]!):`${Math.round(race.progress[i]*100)}%`}</b></div>`).join('');
  $<HTMLButtonElement>('again-button').disabled=!!multiplayer?.credentials&&multiplayer.isHost&&multiplayer.room?.status==='racing';
  $('again-button').innerHTML=multiplayer?.credentials?`${multiplayer.isHost?multiplayer.room?.status==='racing'?'Waiting for the other racers…':'Set up a rematch':'Back to the room'} ${icon('arrow')}`:`Race again ${icon('arrow')}<kbd>ENTER</kbd>`;
  $('again-button').focus({preventScroll:true});
}
function renderUi(){
  const phaseChanged=previousPhase!==race.phase;
  game.dataset.phase=race.phase;
  if(phaseChanged){input.disabled=race.phase!=='running';$('start-button').hidden=race.phase!=='ready';$('pause-layer').hidden=race.phase!=='paused';$('results-layer').hidden=race.phase!=='finished';difficultySelect.disabled=race.phase==='running'||race.phase==='countdown'||race.phase==='paused';$<HTMLButtonElement>('pause-button').disabled=race.phase!=='running'&&race.phase!=='countdown';
    $('input-hint').textContent=race.phase==='ready'?'Ready when you are.':race.phase==='running'?'BACKSPACE TO CORRECT':'';
    $('typing-label').textContent=race.phase==='running'?'FIND YOUR RHYTHM. CHASE THE FINISH.':'YOUR KEYBOARD IS THE ACCELERATOR';
    if(race.phase==='running'){focusTyping();clickTone(false);}if(race.phase==='finished')finish();if(race.phase==='paused'&&!document.querySelector('dialog[open]'))$('resume-button').focus({preventScroll:true});previousPhase=race.phase;
  }
  $('center-status').innerHTML=race.phase==='countdown'?`<span class="count-number">${Math.ceil(race.countdown)}</span><span class="count-caption">GET READY</span>`:'';
  $('wpm').innerHTML=`${race.wpm}<small>WPM</small>`;$('accuracy').innerHTML=`${race.accuracy}<small>%</small>`;$('position').innerHTML=`${race.position}<span>${ordinal(race.position)}</span><small>/ ${race.racerCount}</small>`;
  $('timer').textContent=formatTime(race.elapsed);
  $('progress-fill').style.width=`${race.progress[0]*100}%`;$('map-percent').textContent=`${Math.round(race.progress[0]*100)}% COMPLETE`;
  $('racers').innerHTML=race.order.map((i,n)=>`<div class="racer ${i===0?'you':''}"><span class="racer-rank">${n+1}</span><i style="background:${racerInfo[i].color}"></i><span class="racer-name">${escapeHtml(racerInfo[i].name)}${i===0?'<small>YOU</small>':''}</span><span class="racer-progress">${race.finishedAt[i]!==null?'FIN':`${Math.round(race.progress[i]*100)}%`}</span><div class="racer-bar" style="width:${race.progress[i]*100}%;background:${racerInfo[i].color}"></div></div>`).join('');
  $('friends-button').hidden=race.phase!=='ready';if(multiplayer?.credentials){difficultySelect.disabled=true;$<HTMLButtonElement>('pause-button').disabled=true;$('start-button').textContent='Open race room';$('friends-button').hidden=true;}
  if(performance.now()>toastUntil&&ready)$('load-status').textContent=race.phase==='running'?'RACE IN PROGRESS':race.phase==='paused'?'RACE PAUSED':race.phase==='finished'?'LAP COMPLETE':'TRACK READY';
}
input.addEventListener('input',()=>{race.input(input.value);if(input.value!==race.value)input.value=race.value;renderQuote();clickTone(race.value.length>race.correct);renderUi();if(multiplayer?.credentials&&race.phase==='finished')multiplayer.sync().catch(e=>message(e.message));});
input.addEventListener('paste',e=>{e.preventDefault();message('No shortcuts. Type each character to race.');});
input.addEventListener('drop',e=>e.preventDefault());
input.addEventListener('beforeinput',e=>{if(e.inputType==='insertFromPaste'||e.inputType==='insertFromDrop')e.preventDefault();});
$('start-button').addEventListener('click',startRace);$('restart-button').addEventListener('click',newRace);$('again-button').addEventListener('click',()=>{if(multiplayer?.credentials){if(multiplayer.isHost)multiplayer.rematch().catch(e=>message(e.message));else showLobby();return;}newRace();startRace();});
$('pause-button').addEventListener('click',setPaused);$('resume-button').addEventListener('click',resumeRace);$('pause-restart').addEventListener('click',newRace);
$('sound-button').addEventListener('click',toggleSound);$('sound-setting').addEventListener('click',toggleSound);
document.querySelector('.brand')!.addEventListener('click',e=>{e.preventDefault();newRace();});$('race-tab').addEventListener('click',focusTyping);
difficultySelect.addEventListener('change',()=>{difficulty=difficultySelect.value as Difficulty;race.difficulty=difficulty;save('apex-difficulty',difficulty);});
document.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach(button=>button.addEventListener('click',()=>{if(world)world.mode=button.dataset.camera as CameraMode;document.querySelectorAll('[data-camera]').forEach(b=>{const selected=b===button;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});focusTyping();}));
let dialogPausedRace=false;
function openDialog(id:string){dialogPausedRace=race.phase==='running'||race.phase==='countdown';if(dialogPausedRace)setPaused();$(id) instanceof HTMLDialogElement&&($<HTMLDialogElement>(id)).showModal();}
$('how-button').addEventListener('click',()=>openDialog('how-dialog'));$('settings-button').addEventListener('click',()=>openDialog('settings-dialog'));
document.querySelectorAll<HTMLDialogElement>('dialog').forEach(d=>{d.querySelector('.dialog-close')!.addEventListener('click',()=>d.close());d.querySelector('.dialog-done')!.addEventListener('click',()=>d.close());d.addEventListener('close',()=>{if(dialogPausedRace)resumeRace();dialogPausedRace=false;});});
$<HTMLSelectElement>('atmosphere').addEventListener('change',e=>{const a=(e.target as HTMLSelectElement).value as Atmosphere;world?.setAtmosphere(a);save('apex-atmosphere',a);$('track-name').innerHTML=a==='midnight'?'Midnight circuit<span>.</span>':'Alpine circuit<span>.</span>';$('track-caption').textContent=a==='midnight'?'A little focus. A lot of fast.':'Clear your mind. Chase the horizon.';});
$<HTMLSelectElement>('quality').addEventListener('change',e=>{const q=(e.target as HTMLSelectElement).value as 'high'|'low';world?.setQuality(q);save('apex-quality',q);});
if(sound){$('sound-button').classList.add('sound-on');$('sound-button').setAttribute('aria-label','Turn sound off');$('sound-button').title='Turn sound off';$('sound-setting').textContent='On';$('sound-setting').setAttribute('aria-pressed','true');}
document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]'))return;if(e.key==='Escape'){e.preventDefault();race.phase==='paused'?resumeRace():setPaused();}if(e.key==='Enter'&&!(e.target instanceof HTMLButtonElement)&&!(e.target instanceof HTMLSelectElement)){if(race.phase==='ready'){e.preventDefault();startRace();}else if(race.phase==='finished'&&!multiplayer?.credentials){e.preventDefault();newRace();startRace();}}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPaused();});
window.addEventListener('blur',()=>{if(!document.querySelector('dialog[open]'))setPaused();});
setQuote();renderUi();
try {
  world=new World($('world'),[...document.querySelectorAll<HTMLElement>('.car-label')],message);
  if(read('apex-quality','high')==='low')world.setQuality('low');
  world.load().then(()=>{ready=true;if(multiplayer?.room){rosterKey='';roomChanged(multiplayer.room);}$<HTMLButtonElement>('start-button').disabled=false;const atmosphere=read('apex-atmosphere','midnight') as Atmosphere;if(atmosphere==='alpine'){$<HTMLSelectElement>('atmosphere').value=atmosphere;$('atmosphere').dispatchEvent(new Event('change'));}const quality=read('apex-quality','high') as 'high'|'low';if(quality==='low'){$<HTMLSelectElement>('quality').value=quality;world?.setQuality(quality);}renderUi();}).catch(error=>{console.error(error);$('load-status').textContent='Car assets could not load. Reload to try again.';});
} catch(error){console.error(error);$('load-status').textContent='This browser needs WebGL2. Try Chrome or Edge with graphics acceleration enabled.';$('center-status').innerHTML='<div class="graphics-error"><b>Your circuit needs graphics acceleration.</b><p>Open this game in Chrome or Edge with WebGL2 enabled, then reload.</p></div>';}
$<HTMLButtonElement>('start-button').disabled=true;
let last=performance.now();
function frame(now:number){const elapsedDt=(now-last)/1000;const dt=Math.min(elapsedDt,0.1);last=now;if(world?.lost&&race.phase==='running')setPaused();if(multiplayer?.room?.startsAt&&race.phase!=='finished'){race.countdown=Math.max(0,(multiplayer.room.startsAt-multiplayer.now)/1000);race.elapsed=Math.max(0,(multiplayer.now-multiplayer.room.startsAt)/1000);race.phase=race.countdown>0?'countdown':'running';}else if(!multiplayer?.credentials)race.tick(elapsedDt);world?.update(race.progress,dt,race.phase==='running'?Math.min(race.wpm/10,12):0,reducedMotion,race.phase);if(now-lastUi>70){renderUi();world?.drawMap(minimap,race.progress);lastUi=now;}if(engineGain&&audioContext){engineGain.gain.setTargetAtTime(sound&&race.phase==='running'?0.01:0,audioContext.currentTime,0.15);engine?.frequency.setTargetAtTime(45+race.wpm*.4,audioContext.currentTime,0.2);}requestAnimationFrame(frame);}
requestAnimationFrame(frame);
window.addEventListener('pagehide',()=>{dockObserver.disconnect();multiplayer?.stop();world?.dispose();audioContext?.close().catch(()=>{});});

// Human multiplayer uses the same simulation and render adapter as solo races.
document.body.insertAdjacentHTML('beforeend',`<dialog id="multiplayer-dialog"><button class="dialog-close" id="multiplayer-close" aria-label="Close race room">${icon('close')}</button><span class="eyebrow">BETTER TOGETHER</span><h2>Bring your fast friends<span>.</span></h2><p>Up to four humans. One circuit. Every keystroke counts.</p><div id="room-intake"><label class="room-field">YOUR DRIVER NAME<input id="driver-name" maxlength="18" placeholder="Enter your name" autocomplete="nickname" /></label><button class="primary" id="create-room">Create a race room ${icon('arrow')}</button><div class="room-divider">OR JOIN THE GRID</div><div class="join-row"><input id="join-code" maxlength="6" placeholder="ROOM CODE" aria-label="Six-character room code" /><button id="join-room">Join ${icon('arrow')}</button></div></div><div id="room-lobby" hidden><div class="room-code"><div><small>INVITE YOUR FRIENDS</small><strong id="room-code"></strong></div><button id="copy-room">Copy invite ${icon('arrow')}</button></div><input class="invite-link" id="invite-link" readonly aria-label="Invite link" /><div id="room-players"></div><p id="room-hint"></p><button class="primary" id="room-start">Start together ${icon('arrow')}</button><button class="text-button" id="leave-room">Leave room and race solo</button></div><p class="room-error" id="room-error" role="status"></p></dialog>`);
const roomDialog=$<HTMLDialogElement>('multiplayer-dialog');
const driverName=$<HTMLInputElement>('driver-name');driverName.value=read('apex-name','');
function showLobby(){if(!roomDialog.open)roomDialog.showModal();if(multiplayer.room)renderLobby(multiplayer.room);}
function renderLobby(room:Room){
  $('room-intake').hidden=true;$('room-lobby').hidden=false;$('room-code').textContent=room.code;
  const invite=new URL(location.href);invite.searchParams.set('room',room.code);$<HTMLInputElement>('invite-link').value=invite.href;
  $('room-players').innerHTML=room.players.map(p=>`<div class="lobby-player"><i style="background:${p.color}"></i><span>${escapeHtml(p.name)}<small>${p.id===room.hostId?'HOST':p.id===multiplayer.playerId?'YOU':'RACER'} · ${escapeHtml(getCar(p.carId)?.name??'CLASSIC')}</small></span><b>${p.connected?'ON THE GRID':'RECONNECTING'}</b></div>`).join('');
  $('room-hint').textContent=room.status==='lobby'?(multiplayer.isHost?'Share the invite link. Start when everyone is on the grid.':'Waiting for the host to start the race.'):'The race is underway. Your place is on the track.';
  $<HTMLButtonElement>('room-start').disabled=room.status==='lobby'&&(!multiplayer.isHost||room.players.filter(p=>p.connected).length<2);
  $('room-start').innerHTML=room.status==='lobby'?`Start together ${icon('arrow')}`:`Back to the race ${icon('arrow')}`;
}
function roomChanged(room:Room){
  if(!multiplayer.playerId)return;
  const players=[...room.players].sort((a,b)=>a.id===multiplayer.playerId?-1:b.id===multiplayer.playerId?1:a.seat-b.seat);
  const key=`${room.code}:${room.startsAt??'lobby'}:${room.passageIndex}`;
  if(key!==multiplayerKey){
    multiplayerKey=key;multiplayer.sequence=0;hasNewBest=false;completionRecorded=false;unlockedThisRace=[];race=new Race(passages[room.passageIndex],difficulty);race.networkMode=true;race.racerCount=players.length;input.value='';world?.reset();previousPhase='';setQuote();
    if(room.status==='lobby'){showLobby();}else{race.phase='countdown';document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach(d=>d.close());initAudio();}
    if(multiplayer.restoring&&multiplayer.self&&room.startsAt){race.elapsed=Math.max(0,(multiplayer.now-room.startsAt)/1000);race.phase='running';race.input(multiplayer.self.value);input.value=race.value;race.attempts=multiplayer.self.attempts;race.successfulAttempts=multiplayer.self.successful;completionRecorded=multiplayer.self.finished_at!==null;renderQuote();}
  }
  race.racerCount=players.length;
  const nextRoster=players.map(p=>p.id+p.carId).join(':');
  players.forEach((p,i)=>{Object.assign(racerInfo[i],{name:i===0?'You':p.name,color:p.color,tag:i===0?'PLAYER':'HUMAN'});if(i>0)race.progress[i]=p.progress;race.finishedAt[i]=p.finishedTime;});
  if(nextRoster!==rosterKey){rosterKey=nextRoster;world?.setRacers(players.length);players.forEach((p,i)=>world?.setCar(i,p.carId).catch(e=>message(e.message)));}
  document.querySelector('.ai-label')!.textContent=`${players.length} HUMAN RACERS`;
  $('multiplayer-nav').classList.add('nav-active');$('race-tab').classList.remove('nav-active');
  $('footer-hint').innerHTML=`ROOM ${room.code} <b>·</b> HUMAN MULTIPLAYER`;
  if(room.status==='finished'&&race.phase!=='finished'){race.phase='finished';renderUi();}
  if(race.phase==='finished'){if(players[0]?.finishedTime!=null)race.elapsed=players[0].finishedTime;finish();}renderLobby(room);renderUi();
}
multiplayer=new Multiplayer(roomChanged,message,()=>({value:race.value,attempts:race.attempts,successful:race.successfulAttempts}));
async function roomAction(button:HTMLButtonElement,action:()=>Promise<void>){button.disabled=true;$('room-error').textContent='';try{await action();}catch(e){$('room-error').textContent=(e as Error).message;}finally{button.disabled=false;if(multiplayer.room)renderLobby(multiplayer.room);}}
$('multiplayer-nav').addEventListener('click',showLobby);$('friends-button').addEventListener('click',showLobby);
$('create-room').addEventListener('click',()=>roomAction($<HTMLButtonElement>('create-room'),async()=>{save('apex-name',driverName.value);await multiplayer.create(driverName.value,selectedCar());}));
$('join-room').addEventListener('click',()=>roomAction($<HTMLButtonElement>('join-room'),async()=>{const code=$<HTMLInputElement>('join-code').value.trim().toUpperCase();if(!/^[A-Z0-9]{6}$/.test(code))throw new Error('Enter the six-character room code from your friend.');save('apex-name',driverName.value);await multiplayer.join(code,driverName.value,selectedCar());}));
$('room-start').addEventListener('click',()=>{if(multiplayer.room?.status!=='lobby'){roomDialog.close();focusTyping();}else roomAction($<HTMLButtonElement>('room-start'),()=>multiplayer.start());});
$('copy-room').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($<HTMLInputElement>('invite-link').value);$('room-error').textContent='Invite copied. Send it to your friends.';}catch{$<HTMLInputElement>('invite-link').select();$('room-error').textContent='Select and copy the invite link above.';}});
$('multiplayer-close').addEventListener('click',()=>roomDialog.close());
roomDialog.addEventListener('close',()=>{focusTyping();});
$('leave-room').addEventListener('click',async()=>{await multiplayer.leave();multiplayerKey='';rosterKey='';soloRacers.forEach((r,i)=>Object.assign(racerInfo[i],r));world?.setRacers(4);document.querySelector('.ai-label')!.textContent='3 AI RACERS';$('multiplayer-nav').classList.remove('nav-active');$('race-tab').classList.add('nav-active');$('start-button').innerHTML=`Start race ${icon('arrow')}<kbd>ENTER</kbd>`;$('footer-hint').innerHTML='<kbd>ESC</kbd> PAUSE <b>·</b> BACKSPACE TO CORRECT';roomDialog.close();$('room-intake').hidden=false;$('room-lobby').hidden=true;newRace();});
const invitedRoom=new URL(location.href).searchParams.get('room');if(invitedRoom&&/^[A-Z0-9]{6}$/i.test(invitedRoom)){$<HTMLInputElement>('join-code').value=invitedRoom.toUpperCase();showLobby();multiplayer.reconnect(invitedRoom.toUpperCase()).then(reconnected=>{if(reconnected&&multiplayer.room?.status!=='lobby')roomDialog.close();});}

document.body.insertAdjacentHTML('beforeend',`<dialog id="garage-dialog"><button class="dialog-close" id="garage-close" aria-label="Close garage">${icon('close')}</button><span class="eyebrow">BUILT TO BE DRIVEN</span><h2>Your classic collection<span>.</span></h2><div class="garage-summary"><p>Pick your ride. Your typing sets the pace.</p><span id="garage-completions"></span></div><div id="garage-grid"></div><p class="garage-note" id="garage-note">Complete races to unlock more classics. Your collection is saved on this device.</p><details class="asset-credits"><summary>Model credits & licenses</summary><div id="car-credits"></div></details></dialog>`);
let garagePaused=false;
function renderGarage(){
  if(!$('garage-grid')||!cars.length)return;
  const complete=completedRaces();const chosen=selectedCar();const canChoose=!multiplayer.credentials||multiplayer.room?.status==='lobby';
  $('garage-completions').textContent=`${complete} ${complete===1?'RACE':'RACES'} COMPLETE`;
  $('current-car-name').textContent=getCar(chosen)?.name??'';
  $('garage-grid').innerHTML=cars.map(c=>{const unlocked=c.unlockRaces<=complete;const selected=c.id===chosen;return `<button class="car-card ${selected?'selected':''} ${unlocked?'':'locked'}" data-car="${c.id}" aria-pressed="${selected}" ${!unlocked||!canChoose?'disabled':''}><div class="car-card-image"><img src="/${c.preview}" alt="${escapeHtml(c.name)} classic car" loading="lazy" /><span class="car-card-badge">${selected?'YOUR RIDE':unlocked?'READY TO RACE':`${c.unlockRaces} RACES`}</span></div><div class="car-card-body"><small>${escapeHtml(c.subtitle)}</small><strong>${escapeHtml(c.name)}</strong><div class="car-card-bottom">${unlocked?selected?'Selected':'Choose this classic':`Finish ${Math.max(0,c.unlockRaces-complete)} more races`}<span>${unlocked?'↗':'LOCKED'}</span></div>${unlocked?'':`<div class="unlock-progress"><i style="width:${Math.min(100,complete/c.unlockRaces*100)}%"></i></div>`}</div></button>`;}).join('');
  $('garage-note').textContent=canChoose?'Complete races to unlock more classics. Your collection is saved on this device.':'Choose your next car when the host returns everyone to the lobby.';
  $('car-credits').innerHTML=cars.map(c=>`<p><a href="${c.source}" target="_blank" rel="noreferrer">${escapeHtml(c.name)}</a> by ${escapeHtml(c.author)} · <a href="${c.licenseUrl??'https://creativecommons.org/licenses/by/3.0/'}" target="_blank" rel="noreferrer">${c.license}</a>. Models normalized, resized, and materials adjusted for this game.</p>`).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-car]').forEach(button=>button.addEventListener('click',async()=>{const id=button.dataset.car!;save('apex-car',id);renderGarage();try{if(multiplayer.credentials)await multiplayer.setCar(id);else await world?.setCar(0,id);message(`Ready to race in your ${getCar(id).name}.`);}catch(e){message((e as Error).message);}}));
}
function openGarage(){garagePaused=!multiplayer.credentials&&(race.phase==='running'||race.phase==='countdown');if(garagePaused)setPaused();renderGarage();$<HTMLDialogElement>('garage-dialog').showModal();}
$('garage-nav').addEventListener('click',openGarage);$('garage-button').addEventListener('click',openGarage);$('garage-close').addEventListener('click',()=>$<HTMLDialogElement>('garage-dialog').close());
$('room-start').insertAdjacentHTML('beforebegin','<button class="lobby-garage" id="lobby-garage">Choose your classic in the garage ↗</button>');
$('lobby-garage').addEventListener('click',openGarage);
$('garage-dialog').addEventListener('close',()=>{if(garagePaused)resumeRace();garagePaused=false;focusTyping();});
loadCars().then(renderGarage).catch(e=>message(e.message));

// Initialize Vercel Web Analytics
inject();
