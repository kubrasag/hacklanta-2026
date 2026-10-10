## 💻 Requirements

- **Node.js** (v22 or later) — https://nodejs.org/
- **npm** — Included with Node.js
- **Git** — https://git-scm.com/
- **Phaser 4** — 2D game development framework (installed via npm)
- **Vite** — Development server and build tool (installed via npm)
- **Express** — Small backend that talks to ElevenLabs (installed via npm)
- **ElevenLabs** account — For NPC voices, https://elevenlabs.io/

## Installation

1. Clone the repository

```
git clone https://github.com/kubrasag/hacklanta-2026.git
cd hacklanta-2026
```

2. Install dependencies

```
npm install
```

3. Add your ElevenLabs API key

The NPCs speak with ElevenLabs voices. Create an API key at [elevenlabs.io](https://elevenlabs.io) under **Developers → API Keys** and give it access to Text to Speech, Speech to Text and Voices (Read).

Then create a file called `.env` in the project root, next to `package.json`.

```
ELEVENLABS_API_KEY=your_key_here
```

Never commit this file. It is already listed in `.gitignore`.

4. Start the voice server

Open a terminal and keep it running. This small Express server keeps the API key out of the browser.

```
npm run server
```

You can check it at `http://localhost:3001/api/health`. You should see `"elevenlabs": true`.

5. Run the game

Open a second terminal.

```
npm run dev
```

6. Open the game

Open the local URL displayed in your terminal, usually `http://localhost:8080`.

The game still works without the voice server. The NPCs just stay silent.
