// voice.js
// Plays NPC lines out loud using our server (which calls ElevenLabs).
// Each line is cached, so the same sentence is only paid for once per session.

const cache = new Map();   // "voiceId|text" -> blob URL
let current = null;        // the audio that is playing right now
let muted = false;

export function setMuted(value) {
  muted = value;
  if (muted) stopVoice();
}

export function isMuted() {
  return muted;
}

export function stopVoice() {
  if (current) {
    current.pause();
    current = null;
  }
}

export async function speak(text, voiceId) {
  stopVoice();
  if (muted || !voiceId || !text) return;

  const key = `${voiceId}|${text}`;
  try {
    let url = cache.get(key);
    if (!url) {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId }),
      });
      if (!res.ok) {
        console.warn('TTS failed', res.status, await res.text());
        return; // the game keeps working, just without sound
      }
      url = URL.createObjectURL(await res.blob());
      cache.set(key, url);
    }

    const audio = new Audio(url);
    current = audio;
    await audio.play();
  } catch (err) {
    console.warn('Voice error', err);
  }
}
