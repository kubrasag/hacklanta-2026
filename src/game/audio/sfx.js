// sfx.js
// Little game sounds made with WebAudio, so there are no sound files to load.
// Browsers only allow audio after the first click or key press; unlock() handles that.

let ctx = null;
let master = null;
let muted = false;

function audio() {
  if (!ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function unlockAudio() {
  audio();
}

export function setSfxMuted(value) {
  muted = value;
}

// One note: type, start frequency, end frequency, length (s), volume, delay (s)
function tone(type, f0, f1, dur, vol = 0.15, delay = 0) {
  const a = audio();
  if (!a || muted) return;
  const t = a.currentTime + delay;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur, vol, freq, delay = 0, q = 1) {
  const a = audio();
  if (!a || muted) return;
  const t = a.currentTime + delay;
  const buffer = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buffer;
  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  const gain = a.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(gain).connect(master);
  src.start(t);
}

const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;

export const sfx = {
  blip() { tone('square', 720 + Math.random() * 80, 720, 0.03, 0.025); },
  click() { tone('triangle', 900, 700, 0.05, 0.08); },
  open() { tone('triangle', 440, 440, 0.07, 0.1); tone('triangle', 660, 660, 0.09, 0.1, 0.06); },
  close() { tone('triangle', 660, 660, 0.07, 0.08); tone('triangle', 440, 440, 0.09, 0.08, 0.06); },
  recStart() { tone('sine', 660, 880, 0.08, 0.12); },
  recStop() { tone('sine', 880, 660, 0.08, 0.1); },
  soft() { tone('sine', 330, 260, 0.18, 0.1); },
  good() { tone('triangle', E5, E5, 0.08, 0.12); tone('triangle', G5, G5, 0.12, 0.12, 0.07); },
  star(i = 0) { tone('square', C6 * (1 + i * 0.25), C6 * (1 + i * 0.25), 0.12, 0.06); tone('sine', C6 * 2 * (1 + i * 0.25), C6 * (1 + i * 0.25), 0.25, 0.05); },
  success() {
    [C5, E5, G5, C6].forEach((f, i) => tone('triangle', f, f, 0.16, 0.12, i * 0.08));
  },
  quest() {
    [G5, C6, E5 * 2, G5 * 2].forEach((f, i) => tone('square', f, f, 0.14, 0.05, i * 0.1));
    [C5, G5].forEach((f, i) => tone('triangle', f, f, 0.5, 0.08, i * 0.2));
  },
  levelUp() {
    [C5, E5, G5, C6, G5, C6 * 1.26].forEach((f, i) => tone('square', f, f, 0.12, 0.05, i * 0.07));
  },
  plant() { tone('sine', 300, 900, 0.18, 0.12); noise(0.06, 0.05, 2000); },
  page() { noise(0.18, 0.12, 3000, 0, 0.6); },
  woof() {
    noise(0.12, 0.25, 600, 0, 2);
    tone('sawtooth', 380, 180, 0.12, 0.08);
    noise(0.12, 0.2, 650, 0.18, 2);
    tone('sawtooth', 400, 190, 0.12, 0.07, 0.18);
  },
  step() { noise(0.04, 0.03, 900, 0, 1.5); },
  chime() { tone('sine', G5 * 2, G5 * 2, 0.6, 0.04); tone('sine', C6 * 2, C6 * 2, 0.8, 0.03, 0.12); },
};
