// voice.js
// Villagers speak out loud with ElevenLabs (through our server), in the language you learn.
// Lines are cached, so each sentence is only paid for once per session.
// If ElevenLabs is not available, the browser's own speech voice is used instead.

import { LANGUAGES } from '../data/languages';

const cache = new Map();   // key -> Promise<blob url | null>
let current = null;        // the audio playing right now
let currentDone = null;    // finishes the speak() promise of that audio
let muted = false;
let serverVoices = true;   // set from /api/health
let turn = 0;              // grows with every new line, so an old line never plays late

export function setVoiceMuted(value) {
  muted = value;
  if (muted) stopVoice();
}

export function useServerVoices(value) {
  serverVoices = value;
}

export function stopVoice() {
  turn += 1;
  if (current) {
    current.pause();
    current = null;
  }
  if (currentDone) {
    currentDone();
    currentDone = null;
  }
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

function keyOf(text, { voiceId, lang, slow }) {
  return `${voiceId}|${lang}|${slow ? 'slow' : 'normal'}|${text}`;
}

// ElevenLabs allows only a few requests at the same time, so we queue them.
// A line that should play now goes to the front; prefetches wait at the back.
const MAX_AT_ONCE = 2;
let running = 0;
const waiting = [];

function schedule(task, urgent) {
  return new Promise((resolve) => {
    const item = () => {
      running += 1;
      task().then(resolve, () => resolve(null)).finally(() => {
        running -= 1;
        if (waiting.length) waiting.shift()();
      });
    };
    if (running < MAX_AT_ONCE) item();
    else if (urgent) waiting.unshift(item);
    else waiting.push(item);
  });
}

async function requestTts(text, opts) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId: opts.voiceId, lang: LANGUAGES[opts.lang]?.tts, speed: opts.slow ? 0.75 : 1 }),
    });
    if (res.ok) return URL.createObjectURL(await res.blob());
    if (res.status !== 429) return null;
    await new Promise((r) => setTimeout(r, 700));   // busy: wait a moment and try once more
  }
  return null;
}

function fetchAudio(text, opts, urgent = false) {
  const key = keyOf(text, opts);
  if (!cache.has(key)) {
    const job = schedule(() => requestTts(text, opts), urgent);
    cache.set(key, job);
    // Forget failed requests, so we can try again later
    job.then((url) => { if (!url) cache.delete(key); });
  }
  return cache.get(key);
}

// Start downloading a line we will need soon (hides the waiting time)
export function prefetch(text, opts) {
  if (!serverVoices || !text || !opts.voiceId) return;
  fetchAudio(text, opts);
}

function browserSpeak(text, { lang, slow }) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return; }
    const u = new SpeechSynthesisUtterance(text);
    const code = LANGUAGES[lang]?.speech || 'en-US';
    u.lang = code;
    u.rate = slow ? 0.7 : 0.95;
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.replace('_', '-').startsWith(code.slice(0, 2)));
    if (voice) u.voice = voice;
    u.onend = resolve;
    u.onerror = resolve;
    window.speechSynthesis.speak(u);
  });
}

// Says a line. Resolves when it has finished playing (or could not play).
export async function speak(text, opts) {
  stopVoice();
  if (muted || !text) return;
  const myTurn = turn;
  let url = null;
  if (serverVoices && opts.voiceId) url = await fetchAudio(text, opts, true);
  if (turn !== myTurn || muted) return;  // another line started, or the talk ended
  if (!url) {
    await browserSpeak(text, opts);
    return;
  }
  await new Promise((resolve) => {
    const a = new Audio(url);
    current = a;
    currentDone = resolve;
    a.onended = resolve;
    a.onerror = resolve;
    a.play().catch(resolve);
  });
}
