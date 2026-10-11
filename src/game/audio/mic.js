// mic.js
// Hold SPACE, speak, let go: we turn your voice into text.
//   'server'   record audio and send it to our server (ElevenLabs Speech to Text)
//   'browser'  the browser's own speech recognition (Chrome/Edge), used when the server is offline
//   'none'     no speech; the player types instead

import { LANGUAGES } from '../data/languages';

let mode = 'server';
let recorder = null;
let chunks = [];
let stream = null;
let recognition = null;
let heard = [];
let lang = 'en';

const BrowserRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export function setSpeechMode(serverAvailable) {
  if (serverAvailable && navigator.mediaDevices && window.MediaRecorder) mode = 'server';
  else if (BrowserRecognition) mode = 'browser';
  else mode = 'none';
  return mode;
}

export function speechMode() {
  return mode;
}

export function isRecording() {
  return Boolean((recorder && recorder.state === 'recording') || recognition);
}

// Starts listening. The browser asks for microphone permission the first time.
export async function startRecording(learnCode) {
  if (isRecording()) return;
  lang = learnCode;
  if (mode === 'none') throw new Error('no speech input');
  if (mode === 'browser') {
    heard = [];
    recognition = new BrowserRecognition();
    recognition.lang = LANGUAGES[lang].speech;
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) heard.push(e.results[i][0].transcript);
      }
    };
    recognition.start();
    return;
  }
  stream = stream || (await navigator.mediaDevices.getUserMedia({ audio: true }));
  chunks = [];
  recorder = new MediaRecorder(stream);
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start();
}

// Stops listening and returns what the player said as text.
export function stopRecording() {
  if (mode === 'browser') return stopBrowser();
  return new Promise((resolve, reject) => {
    if (!recorder || recorder.state !== 'recording') {
      resolve('');
      return;
    }
    recorder.onstop = async () => {
      try {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        recorder = null;
        if (blob.size < 2000) {
          resolve(''); // too short, probably just a tap
          return;
        }
        const res = await fetch(`/api/stt?lang=${LANGUAGES[lang].stt}`, {
          method: 'POST',
          headers: { 'Content-Type': blob.type },
          body: blob,
        });
        if (!res.ok) throw new Error(`STT failed: ${res.status}`);
        const data = await res.json();
        resolve(data.text || '');
      } catch (err) {
        reject(err);
      }
    };
    recorder.stop();
  });
}

function stopBrowser() {
  return new Promise((resolve) => {
    if (!recognition) {
      resolve('');
      return;
    }
    const r = recognition;
    const done = () => {
      recognition = null;
      resolve(heard.join(' ').trim());
    };
    r.onend = done;
    r.onerror = done;
    try {
      r.stop();
    } catch {
      done();
    }
    setTimeout(() => { if (recognition === r) done(); }, 2500);
  });
}

// Releases the microphone (the browser's red dot goes away)
export function releaseMic() {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
}
