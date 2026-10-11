# 🌾 WordHarvest

**A cozy pixel village where every conversation matters.** Learn English, Turkish or Spanish by moving into a village and talking to its people, out loud.

Stardew Valley meets language learning. Villagers speak your target language with real voices (ElevenLabs), understand what you say and remember you (Gemini), and give you real-life goals: order a croissant, help find a lost dog, accept an invitation to the Lantern Festival.

## 💻 Requirements

- **Node.js** (v22 or later): https://nodejs.org/
- **npm**: included with Node.js
- **ElevenLabs** account (optional): villager voices and speech recognition, https://elevenlabs.io/
- **Gemini API** key (optional): villagers who understand you and give feedback, https://aistudio.google.com/apikey

The game works without the API keys:
- Without ElevenLabs, voices come from the browser and Chrome/Edge recognise your speech.
- Without Gemini, simple word matching checks your answers.

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

3. Add your API keys

Create a file called `.env` in the project root, next to `package.json`:

```
ELEVENLABS_API_KEY=your_elevenlabs_key
GEMINI_API_KEY=your_gemini_key
```

- The ElevenLabs key needs access to Text to Speech, Speech to Text and Voices (Read).
- Optional: `GEMINI_MODEL=gemini-3.5-flash,gemini-3.5-flash-lite` sets the models to try, in order. These are the defaults. Fast models matter, because a villager should answer in about a second.
- Never commit this file. It is already listed in `.gitignore`.

4. Start the AI server (keep this terminal open)

```
npm run server
```

Check it at `http://localhost:3001/api/health`. You should see `"elevenlabs": true` and `"gemini": true`.

5. Run the game (in a second terminal)

```
npm run dev
```

Then open `http://localhost:8080`.

To show the game on one machine without the dev server, run `npm start`. It builds the game and serves everything at `http://localhost:3001`.

## 🎮 How to play

| Key | Action |
|-----|--------|
| WASD / arrows | Walk |
| E | Talk / continue |
| Hold SPACE | Speak your answer (or type it in the box) |
| T | Show the translation of what a villager said |
| 1 2 3 | Pick an answer on a card |
| Q | Quest Book (Quests, Word Garden, Villagers) |
| ESC | Leave a conversation |
| G | Show walls (debug) |

1. On the title screen, pick the language you want to **learn** and the language you **speak**. Menus, goals and translations use the language you speak.
2. Follow the **!** markers and the arrow at the screen edge.
3. Each conversation gives you a goal. Say it out loud, and the villager answers you.

## 📚 How it teaches

Every technique is visible in the game and comes from language-learning research. The sources are listed in [CLAUDE.md](CLAUDE.md).

| In the game | Technique |
|-------------|-----------|
| A real goal in every conversation ("Order a croissant politely") | Task-based learning and pushed speaking output |
| Whole phrases like *quisiera… por favor* | Chunks that beginners can reuse straight away |
| A "New word!" card asks you to guess before revealing the meaning | Pretesting: guessing first improves memory |
| Pictures on every word, hover glosses | Dual coding: words plus pictures |
| "Almost! Try using *por favor*" → key words → full sentence | Prompts before answers (self-correction), as a star-costing hint ladder |
| ✨ "A natural way to say it" | Recasts instead of "wrong" |
| 🔊 Replay and 🐢 Slow | Listening support and shadowing |
| "Did you understand?" questions | Comprehension checks |
| 🌱 → 🌿 → 🌻 Word Garden, 💧 thirsty words | Spaced retrieval: words grow when you reuse them later, and villagers bring weak words back |
| Patient villagers, typing always allowed | Low-anxiety practice |
| End-of-day report with "Review tomorrow" | Reflection and planned review |

## 🧠 AI features

- **Gemini** (`/api/converse`) handles every reply. It plays the villager in character, decides if you reached the goal (by meaning, not exact words), suggests a more natural sentence, and pulls out facts to remember ("You love chocolate").
- **NPC memory.** Villagers remember your name and what you did together. The Quest Book's *Villagers* page shows it. Rumors spread: in the evening, everyone knows you found the dog.
- **ElevenLabs.** Every villager has their own voice in the target language, with a slow mode for learners. Speech to text listens in the language you are learning.
- **Your choice matters.** You can give the dog your croissant, or call him in the new language. Your choice changes friendships, villager comments and the ending.

## 🛠 Project structure

```
src/main.js                 boots the game, menus and AI services
src/game/director.js        runs the story and every conversation
src/game/scenes/TownScene   the village: walls, depth sorting, light, characters
src/game/data/              languages, words, villagers, story (en/tr/es), UI texts
src/game/systems/           quests, Word Garden, memory
src/game/audio/             voices, microphone, sound effects, Gemini conversations
src/game/ui/                title, HUD, dialogue, Quest Book, end-of-day report
server/index.mjs            ElevenLabs and Gemini proxy (keeps keys secret)
tools/art/                  turns the source art into game assets
```

### Changing the map or art

The game assets in `public/assets` are generated from `tools/art/source` and `tools/art/town_annotations.json`. The annotations list the walk areas, walls and things you can walk behind.

```
pip install -r tools/art/requirements.txt
npm run build:art
```
