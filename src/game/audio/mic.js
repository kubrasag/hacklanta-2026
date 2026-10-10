// mic.js
// Records the player's voice and turns it into text with our server (ElevenLabs Speech to Text).

let recorder = null;
let chunks = [];
let stream = null;

export function isRecording() {
  return Boolean(recorder && recorder.state === 'recording');
}

// Starts recording. The browser asks for microphone permission the first time.
export async function startRecording() {
  if (isRecording()) return;
  stream = stream || (await navigator.mediaDevices.getUserMedia({ audio: true }));
  chunks = [];
  recorder = new MediaRecorder(stream);
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start();
}

// Stops recording and returns what the player said as text.
export function stopRecording() {
  return new Promise((resolve, reject) => {
    if (!isRecording()) {
      resolve('');
      return;
    }
    recorder.onstop = async () => {
      try {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 2000) {
          resolve(''); // too short, probably just a tap
          return;
        }
        const res = await fetch('/api/stt', {
          method: 'POST',
          headers: { 'Content-Type': blob.type },
          body: blob,
        });
        if (!res.ok) throw new Error(`STT failed: ${res.status} ${await res.text()}`);
        const data = await res.json();
        resolve(data.text || '');
      } catch (err) {
        reject(err);
      }
    };
    recorder.stop();
  });
}

// ---------- Matching what the player said to the answer choices ----------

// "I'd like some bread, please!" -> ["i", "d", "like", "some", "bread", "please"]
// "Where is the café?" -> ["where", "is", "the", "cafe"]
function words(sentence) {
  return sentence
    .normalize('NFD')                  // "café" -> "cafe" + accent mark
    .replace(/[\u0300-\u036f]/g, '')    // drop the accent marks
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/'/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

// Small filler words that should not decide the match on their own
const FILLER = new Set(['i', 'a', 'an', 'the', 'to', 'is', 'it', 'do', 'you', 'me', 'my', 'can', 'please', 'd', 's', 'm', 'some', 'any', 'have', 'of']);

// Returns a score from 0 to 1: how many of the choice's important words the player said
export function similarity(said, choiceText) {
  const saidWords = new Set(words(said));
  const target = words(choiceText);
  const important = target.filter((w) => !FILLER.has(w));
  const list = important.length ? important : target;
  if (!list.length) return 0;
  const hits = list.filter((w) => saidWords.has(w)).length;
  return hits / list.length;
}

// Finds the best matching choice, or null if nothing is close enough
export function bestChoice(said, choices, threshold = 0.5) {
  let best = null;
  let bestScore = 0;
  choices.forEach((choice) => {
    const score = similarity(said, choice.text);
    if (score > bestScore) {
      bestScore = score;
      best = choice;
    }
  });
  return bestScore >= threshold ? { choice: best, score: bestScore } : null;
}
