export type Difficulty = 'rookie' | 'sport' | 'pro';
export type Phase = 'ready' | 'countdown' | 'running' | 'paused' | 'finished';
export const passages = [
  'The road unfolds ahead, a ribbon of possibility. Find your rhythm, trust your hands, and let each word carry you through the next corner. Speed comes from patience. Keep your eyes on the finish and make every keystroke count.',
  'Under the midnight sky, the circuit comes alive. Engines hum and the lights blur into long golden lines. You settle into a steady rhythm, one letter at a time. The next corner is yours. Stay focused, stay smooth, and chase the finish.',
  'There is a moment in every race when everything falls into place. The noise fades, your hands find their rhythm, and the track feels familiar. Forget the cars beside you. Keep moving forward, one clean word after another.',
  'A cool breeze moves through the mountain pass. The first light catches the peaks as the road curves into the valley. There is no perfect lap, only the next turn and the chance to take it better. Breathe, focus, and follow the road.',
  'Rain gathers on the windows of the last train home. A passenger folds a newspaper while the city slides past in silver streaks. Somewhere beyond the station, a kitchen light is still on and a warm meal is waiting.',
  'The old garage smells of oil, cedar, and summer dust. On the workbench sits a radio with a broken dial, playing the same quiet station it has played for years. Outside, the first engine of the morning turns over.',
  'At sunrise the harbor belongs to the fishing boats. Their ropes creak against wooden posts as gulls circle over the water. A small cafe opens its shutters, and the smell of fresh bread drifts down to the docks.',
  'The map had been folded so often that the river ran along a crease. We followed it anyway, past the abandoned mill and into the hills. By evening we had found the bridge, but the road beyond it was a surprise.',
  'A good rhythm begins with a little patience. Let the next word arrive before you worry about the one after it. When a mistake interrupts the flow, take a breath, make the correction, and give the road your attention again.',
  'The museum was almost empty on a rainy afternoon. In a room full of painted landscapes, one tiny picture showed a yellow house beside a frozen lake. I stood there longer than I expected, wondering who had lived inside.',
  'Beyond the last streetlight, the desert seemed to stretch forever. Our headlights picked out pale stones and the occasional roadside sign. We drove with the windows down, listening to the soft hiss of tires on warm asphalt.',
  'Someone had left a chessboard on the park table. The pieces were arranged halfway through a game, with a white knight resting beside an empty cup. By the time the rain began, two strangers had sat down to finish it.',
  'The bakery opened before the town was awake. Flour floated through the kitchen while trays of rolls cooled near the door. At six, the first customer arrived with exact change and a story about the weather in the mountains.',
  'A narrow trail climbed above the tree line and disappeared into cloud. We stopped beside a cairn to share the last of the apples. For a moment the mist lifted, revealing a valley so green that nobody said a word.',
  'The record player clicked, and the room filled with a song we had almost forgotten. Outside, bicycles rattled over the cobblestones. We moved the chairs aside and let the afternoon become something we had never planned.',
  'Every corner asks a slightly different question. Some reward an early turn, while others need a patient approach and a clean exit. The trick is to notice what is ahead without losing touch with the stretch of road beneath you.',
  'The lighthouse keeper wrote the wind speed in a small blue notebook. Below the cliff, waves burst against the rocks and vanished into foam. Upstairs, a kettle began to whistle as another ship appeared on the horizon.',
  'We found the little bookshop at the end of an alley. Its windows were crowded with novels, postcards, and a sleeping cat. The owner recommended a story about a journey, then wrapped it in paper the color of autumn leaves.',
  'By noon the snow had stopped falling. Children dragged sleds toward the hill, leaving bright scarves and crooked tracks behind them. From the top, the whole neighborhood looked like a model village waiting for its lights to come on.',
  'The mechanic listened to the engine without saying anything. Then she reached for a small wrench, made one careful adjustment, and smiled. Sometimes years of practice look like knowing exactly which tiny thing deserves your attention.',
  'The market filled the square with color. Red peppers lay beside baskets of lemons, and a musician played beneath the clock tower. We bought more peaches than we could carry and ate the ripest ones on the walk home.',
  'At the edge of the forest stood a cabin with a green door. No smoke rose from the chimney, but fresh footprints crossed the path. We knocked twice and waited, listening to the branches move above the roof.',
  'The final lap is a promise you make to yourself. Keep the line clean, let your shoulders relax, and trust the rhythm you have built. The finish will arrive soon enough; for now, there is still a good stretch of road to enjoy.',
  'A paper airplane sailed across the classroom and landed on an open atlas. Its wings carried a message about an adventure after school. By four, three bicycles were leaning against the fence beside the old railway path.',
  'The city looked different from the roof of the library. Buses moved like little boxes between the buildings, and laundry stirred on distant balconies. Above it all, a single red kite pulled at its string in the evening wind.',
  'We took the coast road because there was no reason to hurry. Each bend revealed another empty beach, another white house facing the sea. When the radio lost its signal, the sound of the waves was more than enough.',
  'A gardener planted sunflowers along the station fence. All summer, commuters watched them grow taller than the ticket machine. In September their heavy heads bowed toward the tracks, greeting every train that rolled into town.',
  'The observatory opened its dome just after dusk. One by one, stars appeared above the ridge while the telescope turned with a gentle hum. Through the eyepiece, a distant planet looked small enough to hold between two fingers.',
  'The road was empty except for a blue coupe far ahead. Its tail lights disappeared around a bend, then returned on the next rise. We followed the same ribbon of asphalt through the hills, each traveling toward a different morning.',
  'In the workshop, a half-finished guitar rested under a lamp. The maker ran a hand along the wood and listened to its quiet tap. A beautiful sound begins long before the first string is tightened or the first song is played.',
  'The ferry left the island as the church bell rang seven. On the upper deck, travelers held their coats against the breeze. The shore grew smaller, but the lights along the promenade stayed with us until the harbor slipped from view.',
  'There is a quiet confidence in doing one thing carefully. A clean sentence, a well-timed shift, a corner taken without fuss. Build enough of those small moments together and an ordinary evening can become your best race yet.'
];

/** Uniform random choice; new solo races skip the previous passage. */
export function randomPassageIndex(previous = -1, random = Math.random) {
  const exclude = previous >= 0 && previous < passages.length;
  const index = Math.floor(random() * (passages.length - (exclude ? 1 : 0)));
  return exclude && index >= previous ? index + 1 : index;
}
export const racerInfo = [
  { name: 'You', color: '#bcf76b', tag: 'PLAYER' },
  { name: 'Nova', color: '#a994ff', tag: 'AI' },
  { name: 'Blaze', color: '#ff926b', tag: 'AI' },
  { name: 'Echo', color: '#6acaf6', tag: 'AI' }
];
const speeds: Record<Difficulty, number[]> = { rookie: [32, 39, 45], sport: [48, 56, 64], pro: [76, 88, 102] };
export class Race {
  phase: Phase = 'ready';
  pausedFrom: 'countdown' | 'running' = 'running';
  countdown = 3;
  elapsed = 0;
  value = '';
  correct = 0;
  attempts = 0;
  successfulAttempts = 0;
  errors = 0;
  progress = [0, 0, 0, 0];
  finishedAt: (number | null)[] = [null, null, null, null];
  networkMode = false;
  racerCount = 4;
  passage: string;
  difficulty: Difficulty;
  constructor(passage: string, difficulty: Difficulty = 'sport') { this.passage = passage; this.difficulty = difficulty; }
  start() { if (this.phase === 'ready') this.phase = 'countdown'; }
  tick(dt: number) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    if (this.phase === 'countdown') {
      this.countdown = Math.max(0, this.countdown - dt);
      if (this.countdown === 0) this.phase = 'running';
      return;
    }
    if (this.phase !== 'running') return;
    this.elapsed += dt;
    if (this.networkMode) return;
    for (let i = 1; i < 4; i++) {
      const wpm = speeds[this.difficulty][i - 1];
      // A fixed rhythm variation makes the racers feel human without random test results.
      const rhythm = 1 + Math.sin(this.elapsed * 0.7 + i * 2) * 0.09;
      this.progress[i] = Math.min(1, this.progress[i] + wpm * 5 / 60 / this.passage.length * rhythm * dt);
      if (this.progress[i] === 1 && this.finishedAt[i] === null) this.finishedAt[i] = this.elapsed;
    }
  }
  input(next: string) {
    if (this.phase !== 'running') return;
    next = next.slice(0, this.passage.length);
    let shared = 0;
    while (shared < Math.min(next.length, this.value.length) && next[shared] === this.value[shared]) shared++;
    for (let i = shared; i < next.length; i++) {
      this.attempts++;
      if (next[i] === this.passage[i]) this.successfulAttempts++;
      else this.errors++;
    }
    this.value = next;
    this.correct = 0;
    while (this.correct < next.length && next[this.correct] === this.passage[this.correct]) this.correct++;
    this.progress[0] = this.correct / this.passage.length;
    if (next === this.passage) {
      this.finishedAt[0] = this.elapsed;
      this.phase = 'finished';
    }
  }
  pause() {
    if (this.phase === 'running' || this.phase === 'countdown') {
      this.pausedFrom = this.phase;
      this.phase = 'paused';
    }
  }
  resume() { if (this.phase === 'paused') this.phase = this.pausedFrom; }
  get wpm() { return this.elapsed > 0 ? Math.round(this.correct / 5 / (this.elapsed / 60)) : 0; }
  get accuracy() { return this.attempts ? Math.round(this.successfulAttempts / this.attempts * 100) : 100; }
  get order() {
    return Array.from({length:this.racerCount},(_,i)=>i).sort((a, b) => {
      if (this.finishedAt[a] !== null && this.finishedAt[b] !== null) return this.finishedAt[a]! - this.finishedAt[b]!;
      if (this.finishedAt[a] !== null) return -1;
      if (this.finishedAt[b] !== null) return 1;
      return this.progress[b] - this.progress[a] || a - b;
    });
  }
  get position() { return this.order.indexOf(0) + 1; }
}
