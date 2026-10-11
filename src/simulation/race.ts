export type Difficulty = 'rookie' | 'sport' | 'pro';
export type Phase = 'ready' | 'countdown' | 'running' | 'paused' | 'finished';
export const passages = [
  'The road unfolds ahead, a ribbon of possibility. Find your rhythm, trust your hands, and let each word carry you through the next corner. Speed comes from patience. Keep your eyes on the finish and make every keystroke count.',
  'Under the midnight sky, the circuit comes alive. Engines hum and the lights blur into long golden lines. You settle into a steady rhythm, one letter at a time. The next corner is yours. Stay focused, stay smooth, and chase the finish.',
  'There is a moment in every race when everything falls into place. The noise fades, your hands find their rhythm, and the track feels familiar. Forget the cars beside you. Keep moving forward, one clean word after another.',
  'A cool breeze moves through the mountain pass. The first light catches the peaks as the road curves into the valley. There is no perfect lap, only the next turn and the chance to take it better. Breathe, focus, and follow the road.'
];
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
