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

if (!ELEVEN_KEY) {
  console.warn('⚠️  ELEVENLABS_API_KEY is missing. Add it to the .env file in the project root.');
}

// Health check: open http://localhost:3001/api/health to see if the server runs
app.get('/api/health', (req, res) => {
  res.json({ ok: true, elevenlabs: Boolean(ELEVEN_KEY) });
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
