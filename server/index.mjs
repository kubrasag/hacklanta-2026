// server/index.mjs
// A tiny backend that keeps our API keys secret.
// The game (browser) talks to this server, and this server talks to ElevenLabs.
//
// Run it with:  npm run server

import 'dotenv/config';
import express from 'express';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

if (!ELEVEN_KEY) {
  console.warn('⚠️  ELEVENLABS_API_KEY is missing. Add it to the .env file in the project root.');
}
if (!GEMINI_KEY) {
  console.warn('⚠️  GEMINI_API_KEY is missing. Feedback will fall back to simple word matching.');
}

// Health check: open http://localhost:3001/api/health to see if the server runs
app.get('/api/health', (req, res) => {
  res.json({ ok: true, elevenlabs: Boolean(ELEVEN_KEY), gemini: Boolean(GEMINI_KEY) });
});

// Text to speech: the game sends { text, voiceId } and gets back an mp3
app.post('/api/tts', async (req, res) => {
  const { text, voiceId } = req.body || {};

  if (!text || !voiceId) {
    return res.status(400).json({ error: 'text and voiceId are required' });
  }
  if (text.length > 400) {
    return res.status(400).json({ error: 'text is too long' }); // protects our credits
  }
  if (!ELEVEN_KEY) {
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY is not set on the server' });
  }

  try {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVEN_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_flash_v2_5', // fast and cheap, good for games
      }),
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

// Speech to text: the game sends the recorded audio, we send back { text }
app.post('/api/stt', express.raw({ type: '*/*', limit: '10mb' }), async (req, res) => {
  if (!ELEVEN_KEY) {
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY is not set on the server' });
  }
  if (!req.body || !req.body.length) {
    return res.status(400).json({ error: 'No audio received' });
  }

  try {
    const type = req.headers['content-type'] || 'audio/webm';
    const form = new FormData();
    form.append('model_id', process.env.ELEVENLABS_STT_MODEL || 'scribe_v1');
    form.append('language_code', 'en');
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

// ---------- Gemini: understand the player's answer and give friendly feedback ----------

// The "personality" of our language coach. Players are children aged 7 to 12.
const COACH_RULES = `
You help children aged 7 to 12 practice speaking English in a cozy village game.
You play a friendly NPC who runs a shop. The child talks to you out loud.
Their words come from speech recognition, so ignore small spelling or punctuation problems.

Each conversation has a GOAL for the child. Decide if the child's LATEST message completes it.
- goalDone is true when the meaning matches the goal, even if the grammar is not perfect.
  "Give me bread" completes "Buy something from the bakery".
- goalDone is false if the message is unclear, off topic, empty, or only a greeting.

Rules for "reply" (what the NPC says next, out loud):
- Stay in character. Simple words. One or two short sentences, at most 20 words in total.
- Be warm and encouraging. Never say the child was wrong.
- If goalDone is true, react naturally to what they asked (hand over the item, answer the question).
- If goalDone is false, answer kindly and gently lead them back to the goal with a simple question.
- If the child asks for something the shop does not have, offer something similar.
- Never ask for personal information (name, age, school, address). If the child shares any, do not repeat it.
- If the child says something unkind or unsafe, kindly steer back to the shop.

Rules for "tip" (shown on screen to help them learn):
- Only give a tip when their sentence was rude, very short, or had a clear grammar mistake.
- The tip is a full, polite sentence they could say instead, for example "Could I have some bread, please?"
- No grammar words like "verb" or "tense". Otherwise set tip to null.

Rules for "praise": a very short cheer like "Great job!" or "So polite!" when goalDone is true, else null.
`;

const FEEDBACK_SCHEMA = {
  type: 'OBJECT',
  properties: {
    goalDone: { type: 'BOOLEAN' },
    reply: { type: 'STRING' },
    tip: { type: 'STRING', nullable: true },
    praise: { type: 'STRING', nullable: true },
  },
  required: ['goalDone', 'reply', 'tip', 'praise'],
};

// Turns Gemini's text into a safe object, even if something looks odd
export function parseFeedback(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    const m = String(text).match(/\{[\s\S]*\}/);   // sometimes the JSON is wrapped in extra text
    try { data = m ? JSON.parse(m[0]) : {}; } catch { data = {}; }
  }
  const clean = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
  return {
    goalDone: data.goalDone === true,
    reply: clean(data.reply, 200) || 'Sorry, could you say that again?',
    tip: clean(data.tip, 160),
    praise: clean(data.praise, 40),
  };
}

// Builds the text we send to Gemini from the conversation so far
export function buildPrompt({ npcName, goal, goalCheck, history, said }) {
  const turns = (Array.isArray(history) ? history : []).slice(-10).map((t) => {
    const who = t.who === 'child' ? 'Child' : 'NPC';
    return `${who}: ${String(t.text || '').slice(0, 200)}`;
  });
  return [
    `NPC name: ${String(npcName || 'Shopkeeper').slice(0, 40)}`,
    `GOAL for the child: ${String(goal || 'Talk to the NPC').slice(0, 120)}`,
    goalCheck ? `Counts as done when: ${String(goalCheck).slice(0, 200)}` : '',
    '',
    'Conversation so far:',
    ...turns,
    '',
    `Child's latest message: "${String(said).slice(0, 300)}"`,
  ].filter((line) => line !== null).join('\n');
}

app.post('/api/feedback', async (req, res) => {
  const { said } = req.body || {};
  if (!said || typeof said !== 'string') {
    return res.status(400).json({ error: 'said is required' });
  }
  if (!GEMINI_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not set on the server' });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: COACH_RULES }] },
        contents: [{ role: 'user', parts: [{ text: buildPrompt(req.body) }] }],
        generationConfig: {
          temperature: 0.6,
          responseMimeType: 'application/json',
          responseSchema: FEEDBACK_SCHEMA,
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Gemini error', response.status, detail);
      return res.status(502).json({ error: 'Gemini request failed', detail });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '{}';
    res.json(parseFeedback(text));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not reach Gemini' });
  }
});

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

app.listen(PORT, () => {
  console.log(`🔊 SpeakQuest server running on http://localhost:${PORT}`);
});
