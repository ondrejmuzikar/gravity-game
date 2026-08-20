/** Web Audio synth + quiet looping drone. Unlock on first user gesture. */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let muted = false;
let musicStarted = false;
const musicNodes: Array<AudioNode | OscillatorNode | AudioBufferSourceNode> = [];

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor({ latencyHint: "interactive" });
    master = ctx.createGain();
    musicBus = ctx.createGain();
    sfxBus = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    musicBus.gain.value = 0.55;
    sfxBus.gain.value = 1;
    musicBus.connect(master);
    sfxBus.connect(master);
    master.connect(ctx.destination);
  }
  return ctx;
}

function setMasterGain(value: number) {
  if (!master || !ctx) return;
  master.gain.setTargetAtTime(value, ctx.currentTime, 0.04);
}

export function unlockAudio() {
  const c = ac();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
}

export function setMuted(next: boolean) {
  muted = next;
  setMasterGain(next ? 0 : 1);
}

export function isMuted() {
  return muted;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  gain: number,
  when = 0,
  slideTo?: number,
) {
  const c = ac();
  if (!c || !sfxBus) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  const detune = 1 + (Math.random() * 2 - 1) * 0.03;
  osc.frequency.setValueAtTime(freq * detune, t0);
  if (slideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 20), t0 + dur);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(sfxBus);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
  osc.onended = () => {
    osc.disconnect();
    g.disconnect();
  };
}

function startDrone() {
  const c = ac();
  if (!c || !musicBus || musicStarted) return;
  musicStarted = true;

  const mix = c.createGain();
  mix.gain.value = 0.0001;
  mix.gain.setTargetAtTime(0.045, c.currentTime, 1.4);
  mix.connect(musicBus);

  const makeOsc = (freq: number, type: OscillatorType, gain: number) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(mix);
    osc.start();
    musicNodes.push(osc, g);
  };

  makeOsc(46, "sine", 0.7);
  makeOsc(69.3, "sine", 0.38);
  makeOsc(92.5, "triangle", 0.12);

  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.value = 0.06;
  lfoGain.gain.value = 0.012;
  lfo.connect(lfoGain);
  lfoGain.connect(mix.gain);
  lfo.start();
  musicNodes.push(lfo, lfoGain);

  const len = 2 * c.sampleRate;
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const ng = c.createGain();
  ng.gain.value = 0.035;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 280;
  filter.Q.value = 0.7;
  noise.connect(filter);
  filter.connect(ng);
  ng.connect(mix);
  noise.start();
  musicNodes.push(noise, ng, filter, mix);
}

export function startMusic() {
  unlockAudio();
  startDrone();
}

if (typeof window !== "undefined") {
  const resume = () => {
    if (ctx && ctx.state === "suspended") void ctx.resume();
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") resume();
  });
}

export const sfx = {
  switch() {
    unlockAudio();
    tone(420, 0.09, "triangle", 0.07);
    tone(640, 0.12, "sine", 0.04, 0.03);
  },
  land() {
    unlockAudio();
    tone(140, 0.08, "sine", 0.06, 0, 70);
  },
  die() {
    unlockAudio();
    tone(280, 0.28, "sawtooth", 0.055, 0, 70);
    tone(180, 0.32, "triangle", 0.045, 0.04, 50);
  },
  win() {
    unlockAudio();
    tone(523, 0.14, "triangle", 0.06);
    tone(659, 0.16, "triangle", 0.05, 0.1);
    tone(784, 0.22, "sine", 0.06, 0.2);
  },
  start() {
    unlockAudio();
    tone(330, 0.08, "sine", 0.04);
  },
};
