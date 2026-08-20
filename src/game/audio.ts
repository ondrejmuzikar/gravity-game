/** Tiny Web Audio synth. Unlock on first user gesture. */

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

export function unlockAudio() {
  const c = ac();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
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
  if (!c) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 20), t0 + dur);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  switch() {
    unlockAudio();
    tone(420, 0.09, "triangle", 0.08);
    tone(640, 0.12, "sine", 0.05, 0.03);
  },
  land() {
    unlockAudio();
    tone(140, 0.08, "sine", 0.07, 0, 70);
  },
  die() {
    unlockAudio();
    tone(280, 0.28, "sawtooth", 0.06, 0, 70);
    tone(180, 0.32, "triangle", 0.05, 0.04, 50);
  },
  win() {
    unlockAudio();
    tone(523, 0.14, "triangle", 0.07);
    tone(659, 0.16, "triangle", 0.06, 0.1);
    tone(784, 0.22, "sine", 0.07, 0.2);
  },
  start() {
    unlockAudio();
    tone(330, 0.08, "sine", 0.05);
  },
};
