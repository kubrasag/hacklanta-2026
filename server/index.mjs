// server/index.mjs
// A small backend that keeps our API keys secret.
// The game (browser) talks to this server, and this server talks to ElevenLabs and Gemini.
//
// Run it with:  npm run server

import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
app.use(express.json({ limit: '200kb' }));

const PORT = process.env.PORT || 3001;
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
// One or more models, separated by commas. The first one is tried first, the others are backups.
// Fast models matter more than big ones here: a villager should answer in about a second.
// Example in .env:  GEMINI_MODEL=gemini-3.5-flash,gemini-3.5-flash-lite
const GEMINI_MODELS = (process.env.GEMINI_MODEL || 'gemini-3.5-flash,gemini-3.5-flash-lite')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

const LANG_CODES = new Set(['en', 'tr', 'es']);

if (!ELEVEN_KEY) {
  console.warn('⚠️  ELEVENLABS_API_KEY is missing. Villagers will use the browser voice instead.');
}
if (!GEMINI_KEY) {
  console.warn('⚠️  GEMINI_API_KEY is missing. Conversations fall back to simple word matching.');
}

// Health check: open http://localhost:3001/api/health to see if the server runs
app.get('/api/health', (req, res) => {
  res.json({ ok: true, elevenlabs: Boolean(ELEVEN_KEY), gemini: Boolean(GEMINI_KEY), geminiModels: GEMINI_MODELS });
});

// ---------- ElevenLabs: villager voices ----------

// The game sends { text, voiceId, lang, speed } and gets back an mp3
app.post('/api/tts', async (req, res) => {
  const { text, voiceId, lang, speed } = req.body || {};

  if (!text || !voiceId) {
    return res.status(400).json({ error: 'text and voiceId are required' });
  }
  if (text.length > 400) {
    return res.status(400).json({ error: 'text is too long' }); // protects our credits
  }
  if (!ELEVEN_KEY) {
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY is not set on the server' });
  }

  const body = {
    text,
    model_id: 'eleven_flash_v2_5', // fast and cheap, speaks 32 languages
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      speed: Math.min(1.2, Math.max(0.7, Number(speed) || 1)), // 0.75 = slow replay for learners
    },
  };
  if (LANG_CODES.has(lang)) body.language_code = lang; // say it with the right accent

  try {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVEN_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('ElevenLabs error', response.status, detail);
      return res.status(response.status).json({ error: 'ElevenLabs request failed', detail });
    }

    const audio = Buffer.from(await response.arrayBuffer());
    res.set('Content-Type', 'audio/mpeg');
    res.send(audio);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not reach ElevenLabs' });
  }
});

// Speech to text: the game sends the recorded audio (?lang=es), we send back { text }
app.post('/api/stt', express.raw({ type: '*/*', limit: '10mb' }), async (req, res) => {
  if (!ELEVEN_KEY) {
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY is not set on the server' });
  }
  if (!req.body || !req.body.length) {
    return res.status(400).json({ error: 'No audio received' });
  }

  try {
    const type = req.headers['content-type'] || 'audio/webm';
    const lang = LANG_CODES.has(req.query.lang) ? req.query.lang : 'en';
    const form = new FormData();
    form.append('model_id', process.env.ELEVENLABS_STT_MODEL || 'scribe_v1');
    form.append('language_code', lang);
    form.append('tag_audio_events', 'false');
    form.append('file', new Blob([req.body], { type }), 'answer.webm');

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': ELEVEN_KEY },
      body: form,
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('ElevenLabs STT error', response.status, detail);
      return res.status(response.status).json({ error: 'Speech to text failed', detail });
    }

    const data = await response.json();
    res.json({ text: data.text || '' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not reach ElevenLabs' });
  }
});

// ---------- Gemini: villagers who understand you and help you learn ----------

// How every villager behaves. The research-backed parts:
//   meaning over grammar (task-based), prompts before answers (self-correction),
//   recasts instead of "wrong" (natural correction), reuse of weak words (spaced retrieval).
function coachRules(learn, help) {
  return `
You play a villager in WordHarvest, a cozy village game where adults practise a new language by talking.
The player is a casual beginner (level A1) learning ${learn}. Their own language is ${help}.
Their words come from speech recognition or typing: ignore spelling, accents, capitals and punctuation.

Always answer as the villager described below. Be warm, patient and encouraging. Never say "wrong".

Fields:
- "reply": what the villager says out loud. ONLY ${learn}. Very simple, common words. At most 14 words.
- "replyHelp": the same reply translated into ${help}.
- "goalDone" (task mode only): true when the player's LATEST message reaches the GOAL in meaning.
  Grammar mistakes are fine. Mixing in a word of ${help} is fine.
  It is NOT done if the message is off topic, empty, or completely in ${help} instead of ${learn}.
  In chat mode, goalDone is always false.
- If goalDone is true: "reply" reacts naturally to exactly what they said in ONE short sentence.
  Do not move the story forward; the game continues the story itself.
- If goalDone is false: "reply" answers kindly in character and steers back to the goal with a simple question.
  Never say the full answer for them.
- "nudge" (only when the goal is not done, else null): in ${help}, max 18 words. A hint that lets the player
  fix it themselves, pointing at the missing piece. Example: "Almost! How do you say 'please' in ${learn}?"
  If they answered in ${help}, encourage them to try it in ${learn}. Never give the full sentence.
- "better": only if their sentence had a clear mistake, sounded unnatural, or was in ${help}:
  a short natural version in ${learn} (max 12 words). Otherwise null.
- "betterHelp": "better" translated into ${help}, or null.
- "praise": when goalDone is true, a cheer of 1 to 3 words in ${help}. Otherwise null.
- "playerName": if the player said their own first name, just the name. Otherwise null.
- "memory": one short fact worth remembering about the player from this message, written in ${help} and
  addressed to the player (example: "You love chocolate."). Null if nothing new.
  Never store sensitive details like addresses, phone numbers, age or school.
- If REVIEW WORDS are listed, use one of them in "reply" when it fits naturally.
- In chat mode, keep a short friendly conversation going: react, then ask one simple question back.
- If the player is rude or unsafe, stay kind and gently change the topic back to village life.
`;
}

const CONVERSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    goalDone: { type: 'BOOLEAN' },
    reply: { type: 'STRING' },
    replyHelp: { type: 'STRING' },
    nudge: { type: 'STRING', nullable: true },
    better: { type: 'STRING', nullable: true },
    betterHelp: { type: 'STRING', nullable: true },
    praise: { type: 'STRING', nullable: true },
    playerName: { type: 'STRING', nullable: true },
    memory: { type: 'STRING', nullable: true },
  },
  required: ['goalDone', 'reply', 'replyHelp', 'nudge', 'better', 'betterHelp', 'praise', 'playerName', 'memory'],
};

const LANG_NAMES = new Set(['English', 'Turkish', 'Spanish']);

// Turns Gemini's text into a safe object, even if something looks odd
export function parseConverse(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    const m = String(text).match(/\{[\s\S]*\}/);   // sometimes the JSON is wrapped in extra text
    try { data = m ? JSON.parse(m[0]) : {}; } catch { data = {}; }
  }
  const clean = (v, max) => (typeof v === 'string' && v.trim() && v.trim().toLowerCase() !== 'null' ? v.trim().slice(0, max) : null);
  return {
    goalDone: data.goalDone === true,
    reply: clean(data.reply, 220),
    replyHelp: clean(data.replyHelp, 260),
    nudge: clean(data.nudge, 200),
    better: clean(data.better, 140),
    betterHelp: clean(data.betterHelp, 180),
    praise: clean(data.praise, 40),
    playerName: clean(data.playerName, 24),
    memory: clean(data.memory, 120),
  };
}

// Builds the text we send to Gemini from the conversation so far
export function buildPrompt(b) {
  const list = (items, max) => (Array.isArray(items) ? items : []).slice(-max).map((x) => `- ${String(x).slice(0, 160)}`);
  const turns = (Array.isArray(b.history) ? b.history : []).slice(-8).map((h) => {
    const who = h.who === 'player' ? 'Player' : 'Villager';
    return `${who}: ${String(h.text || '').slice(0, 200)}`;
  });
  const mems = list(b.memories, 6);
  const facts = list(b.villageFacts, 5);
  const review = (Array.isArray(b.reviewWords) ? b.reviewWords : []).slice(0, 6).map((w) => String(w).slice(0, 30));
  return [
    `Mode: ${b.mode === 'chat' ? 'chat' : 'task'}`,
    `Villager: ${String(b.npcName || 'Villager').slice(0, 30)}. ${String(b.persona || '').slice(0, 240)}`,
    `Player's name: ${b.playerName ? String(b.playerName).slice(0, 24) : 'unknown'}`,
    mems.length ? `What this villager remembers about the player:\n${mems.join('\n')}` : '',
    facts.length ? `What the whole village knows:\n${facts.join('\n')}` : '',
    b.mode !== 'chat' && b.goal ? `GOAL for the player: ${String(b.goal).slice(0, 160)}` : '',
    b.mode !== 'chat' && b.goalCheck ? `Counts as done when: ${String(b.goalCheck).slice(0, 240)}` : '',
    b.mode !== 'chat' && b.model ? `Example answer (do not say it for them): ${String(b.model).slice(0, 120)}` : '',
    review.length ? `REVIEW WORDS: ${review.join(', ')}` : '',
    '',
    'Conversation so far:',
    ...turns,
    '',
    `Player's latest message: "${String(b.said).slice(0, 300)}"`,
  ].filter((line) => line !== '').join('\n');
}

app.post('/api/converse', async (req, res) => {
  const b = req.body || {};
  if (!b.said || typeof b.said !== 'string') {
    return res.status(400).json({ error: 'said is required' });
  }
  if (!GEMINI_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not set on the server' });
  }
  const learn = LANG_NAMES.has(b.learn) ? b.learn : 'Spanish';
  const help = LANG_NAMES.has(b.help) ? b.help : 'English';

  // Villagers should answer fast, so we ask for little "thinking". Models that do not
  // support the setting get the same request without it.
  const makeBody = (fast) => JSON.stringify({
    systemInstruction: { parts: [{ text: coachRules(learn, help) }] },
    contents: [{ role: 'user', parts: [{ text: buildPrompt(b) }] }],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: 'application/json',
      responseSchema: CONVERSE_SCHEMA,
      ...(fast ? { thinkingConfig: { thinkingLevel: 'low' } } : {}),
    },
  });

  try {
    const result = await callGemini(makeBody);
    if (!result.ok) {
      return res.status(502).json({ error: 'Gemini request failed', detail: result.detail });
    }
    const text = result.data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '{}';
    const out = parseConverse(text);
    if (b.mode === 'chat') out.goalDone = false;
    res.json({ ...out, model: result.model });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not reach Gemini' });
  }
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BUSY = new Set([429, 500, 503]);   // "too many requests" or "overloaded": worth trying again

// Tries each model in GEMINI_MODELS. Busy models get 2 quick retries before we move to the next one.
// Everything must finish within ~8 seconds, so a player never waits too long.
// makeBody(fast) builds the request; fast = with little thinking.
// One slow model may use at most 4.5 seconds, so a backup model still has time to answer.
async function callGemini(makeBody) {
  const deadline = Date.now() + 8000;
  let lastDetail = '';

  for (const model of GEMINI_MODELS) {
    let fast = true;
    for (let attempt = 0; attempt < 3; attempt++) {
      const body = makeBody(fast);
      const timeLeft = deadline - Date.now();
      if (timeLeft < 500) return { ok: false, detail: 'Timed out. ' + lastDetail };

      let response;
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
            body,
            signal: AbortSignal.timeout(Math.min(timeLeft, 4500)),
          },
        );
      } catch (err) {
        lastDetail = `${model}: ${err.name === 'TimeoutError' ? 'timed out' : err.message}`;
        console.warn('Gemini', lastDetail);
        break;   // network problem or timeout: try the next model
      }

      if (response.ok) {
        return { ok: true, model, data: await response.json() };
      }

      lastDetail = `${model} ${response.status}: ${(await response.text()).slice(0, 300)}`;
      console.warn('Gemini error', lastDetail);
      if (response.status === 400 && fast && /thinking/i.test(lastDetail)) {
        fast = false;   // this model does not know the thinking setting: ask again without it
        continue;
      }
      if (!BUSY.has(response.status)) break;   // wrong model name or key: retrying will not help
      if (attempt < 2) await sleep(400 * (attempt + 1));   // wait 0.4s, then 0.8s
    }
  }
  return { ok: false, detail: lastDetail };
}

// Lists the voices on your ElevenLabs account, handy for picking voice IDs
app.get('/api/voices', async (req, res) => {
  if (!ELEVEN_KEY) return res.status(500).json({ error: 'ELEVENLABS_API_KEY is not set' });
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': ELEVEN_KEY },
    });
    const data = await response.json();
    const voices = (data.voices || []).map((v) => ({
      name: v.name,
      voiceId: v.voice_id,
      labels: v.labels,
    }));
    res.json(voices);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not reach ElevenLabs' });
  }
});

// The built game (npm run build) is served from here too, so one command runs everything
const distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
app.use(express.static(distDir));

app.listen(PORT, () => {
  console.log(`🌾 WordHarvest server running on http://localhost:${PORT}`);
});
