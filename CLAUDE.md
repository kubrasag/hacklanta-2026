Treat the AGENTS.md file as the CLAUDE.md file.

# WordHarvest: Overhaul Plan

WordHarvest is a cozy pixel-art village where casual learners pick up a new language by talking to villagers out loud. This plan turns the current prototype into a short, polished, demo-ready game for a **3-minute hackathon presentation** (tracks: Adobe Creative + AI/ML; side challenges: ElevenLabs + Gemini).

## Project facts

- Stack: Phaser 4.0.0 + Vite (client), Express (`server/index.mjs`) as a proxy so API keys stay off the browser.
- Run: `npm run server` (port 3001) and `npm run dev` (port 8080, proxies `/api` to 3001). `npm start` builds and serves everything on 3001.
- `.env`: `ELEVENLABS_API_KEY`, `GEMINI_API_KEY`, optional `GEMINI_MODEL` (comma-separated fallback list).
  - The default is `gemini-3.5-flash,gemini-3.5-flash-lite` with `thinkingLevel: 'low'`. These answer in about 1-3 s.
  - `gemini-3.7/3.8-flash` timed out at 30 s during testing (2026-10-10), and 3.8 rejects `thinkingLevel: 'minimal'`.
- Art pipeline: `npm run build:art` (Python; needs `pip install -r tools/art/requirements.txt`).
  - Reads `tools/art/source/*` and `tools/art/town_annotations.json`.
  - Writes everything in `public/assets/`.
  - Never hand-edit the generated `town_map.json`. Edit the annotations and rebuild.
- Phaser gotchas found while building:
  - Phaser processes key events synchronously on the DOM event. A window `keydown` listener that reacts to the same key runs right after it, so the book's Q handler closed the book that Q had just opened. Handle each key in one place only.
  - `JustDown` polling loses very quick taps. Use `keyboard.on('keydown-X')`.
  - When the window has no focus (`!loop.inFocus`), Phaser clamps the frame delta to 16.7 ms. In a headless browser this makes everything move slowly. Set `game.loop.inFocus = true` in tests.
- UI is plain HTML/CSS on top of the canvas. Game code is plain ES modules. Comments are short and in plain words, like the existing code.
- Phaser 4 differs from Phaser 3 in places (FX/filters, pipelines, tint). Check `node_modules/phaser` before using anything beyond basic sprites, physics, cameras, tweens and particles.

## What exists today (starting point)

- One `TownScene`: a painted map (`town_bg.png`), a 16 px collision grid, 5 NPCs that stand still, and doors that do nothing.
- `DialogueBox`: NPC lines, hold SPACE to speak, ElevenLabs STT, Gemini judges the goal, ElevenLabs TTS speaks the reply, plus a star per NPC. It is English-only and aimed at kids aged 7–12.
- Leftovers from the Phaser template: `scenes/Game.js`, `bg.png`, `logo.png`, the page title "Phaser - Template", package name `template-vite`, and `log.js` (template telemetry that pings gryzor.co on every `npm run dev/build`).

### Problems to fix

1. **Pixel density mismatch.** `town_bg.png` is a blurry AI upscale with soft pixels about 3–4 px wide, while the character sprites are crisp 1 px pixel art. Camera zoom 1.5 with nearest-neighbour makes it worse.
2. **Wrong hitboxes.** The collision grid marks whole tree canopies and most grass as solid, so trees block paths "as if lying flat". Only trunks and building footprints should block.
3. **No depth sorting.** The player is always drawn on top, so you can't walk behind a tree or a roof.
4. **No game structure.** There are no quests, quest book, story, progression, title screen or ending.
5. **No real language learning.** The world is English only, and the feedback is minimal.

## Goals

- Feels like a real game (Stardew-style cozy village) and is polished enough to demo in 3 minutes.
- Target: casual adult beginners (A0–A1).
- Language choice at the start:
  - **"I want to learn":** English, Turkish (Türkçe), Spanish (Español).
  - **"I speak":** one of the other two. This "help language" is used for translations, hints and the UI text.
  - Every line of content exists in all three languages, so any pair works. More languages can be added later.
  - Title cards show the language's greeting (Hello! / Merhaba! / ¡Hola!) instead of flags. This avoids flag-emoji problems on Windows and the "which flag for English" question.
- Every conversation is a clear, gamified learning moment.
- It must never get stuck: if the mic, Gemini or ElevenLabs fails, typing plus offline matching still lets you finish.

## Out of scope (for now)

Building interiors, multiple in-game days, accounts or a database, mobile/touch controls, more than 3 languages, streaming speech recognition, full UI translation beyond the in-game HUD, dialogue and book.

---

## 1. Visuals and world

### 1.1 One pixel grid for everything (decided after testing)
- Background: unsharp mask (radius 2, 120%), then LANCZOS downscale ×½, then quantize to 256 colours without dithering, then nearest-neighbour upscale ×2. This turns the blur into crisp 2 px art pixels.
- Sprites (player and NPCs): nearest-neighbour downscale ×½, a hard alpha cut, then upscale ×2. Frames stay 52×66, so the physics offsets keep working and the art matches the background's 2 px grid.
- Rendering uses Phaser 4 `smoothPixelArt`, which keeps pixels crisp at any zoom without shimmer. Zoom fits the window in 0.25 steps.
- Tooling: `tools/art/build_map.py` (Pillow + numpy + scipy). The generated PNGs are committed, so teammates don't need Python.

### 1.2 Correct collision and walk-behind depth
- A hand-checked annotation file, `tools/art/town_annotations.json`, lists:
  - trees: trunk position, base line and canopy box
  - buildings: footprint and roof region
  - fences: segments
  - water: polygons
  - props: benches, lamps, fountain, barrels, stalls, stumps, rocks
  - the forest border around the map
- How the annotations work: `walk` rectangles are where feet may go, and `block` rectangles cut out trunks, building fronts, fences and props. `build_map.py` turns them into a 4 px grid, merges it into about 140 wall rectangles, and writes `public/assets/town/town_map.json`.
- Foreground atlas `town_fg.png` / `town_fg.json` has about 157 pieces. Each `fg` region (ellipse or rect) keeps only its non-ground pixels (grass, sand and stone are found by colour). Tall fences are sliced (`vsplit`), so every slice sorts by its own base.
- Things you walk behind fade to 50% opacity while they cover the player.
- In game:
  - Each foreground object is a cropped image of `town_fg` with depth = its base y.
  - Player and NPC depth = feet y, so you walk behind trees and roofs naturally.
  - Only trunks and footprints block movement.
- Debug key **G** shows the collision rectangles and base lines.

### 1.3 Life and polish in the world
- NPCs idle: a slight breathing bob, glancing at the player as they pass, and looking around now and then. (Walking loops were cut to keep quest positions predictable.)
- Quest markers over heads: **!** means a new quest, **?** means turn in. When the target is off screen, an arrow at the screen edge points to the current objective.
- Ambient touches: drifting petals by day, fireflies at night, a soft shadow under every character, and footstep sounds.
- Time of day follows the story: morning, then afternoon, then an evening tint with glowing lanterns for the festival.
- New pixel sprite: **Biscuit the dog**, drawn from a character map in `build_map.py` on the same 2 px grid, with wag and walk animations. He follows the player along their trail.

## 2. Game design

### 2.1 Core loop
Talk to a villager → get a real-life goal → say it in the target language (voice or text) → AI feedback → stars, XP and hearts → new words are planted in the Word Garden → those words come back in later conversations.

### 2.2 Story: "Day 1 in Clover Hollow" (about 2.5 minutes)
| # | Quest | Villager | You learn to… | Memory / branch |
|---|-------|----------|---------------|-----------------|
| 1 | **A New Neighbor** | Leo (guide, fountain) | greet and say your name | Leo remembers your name; every NPC uses it from now on |
| 2 | **Fresh From the Oven** | Tom (baker) | order food politely | You get a 🥐 croissant. Tom mentions Mia's lost dog |
| 3 | **Where's Biscuit?** | Mia (café), then Biscuit, then Mia | offer help, understand a description (small, brown, near the library), "here is…" | **Decision:** give Biscuit your croissant (Tom hears and likes it, ♥ Tom), *or* call him out loud ("Come here, Biscuit!" / "Gel, Bisküvi!" / "¡Ven, Galleta!") (♥ Mia) |
| 4 | **The Lantern Festival** | everyone | accept an invitation, say thank you | Evening falls. Word spreads (villagers thank you in speech bubbles as you pass). The villager with the most hearts invites you. The ending line changes with your decision |

Optional side requests in the quest book: **Sam** (grocer), "Buy three apples" (numbers), and **Ms. Lily** (librarian), "Find a book about dogs". Both reuse earlier words.

Naming notes:
- The pitch says "Emma the baker", but the baker sprite is a young man, so the baker is **Tom**. The pitch's memory moment ("Welcome back! Another croissant?") still happens with him on a return visit.
- The village and dog names follow the target language: Clover Hollow / Yonca Vadisi / Valle Trébol, and Biscuit / Bisküvi / Galleta.
- The player sprite is a girl, so Spanish lines use feminine forms ("bienvenida").

### 2.3 Learning techniques (research-backed, each one visible in the UI)

The research behind each choice is summarised in 2.5.

1. **Task-based speaking (pushed output).** Every conversation has a real goal in the help language ("Order a croissant politely") that you solve by *saying* something in the target language, not by picking a menu option.
2. **Chunks, not lone words.** The game teaches whole phrases ("Quisiera…, por favor", "…istiyorum, lütfen", "My name is…") that beginners can reuse straight away.
3. **Guess first, then reveal (pretesting effect).**
   - When a key word first appears, a small card asks you to guess its meaning from 3 pictures before it is revealed.
   - NPC lines show the target language; the translation stays blurred until you press **T** or click.
4. **Words with pictures (dual coding).** Every word card, gloss and garden plant has an icon (🥐 🐶 📕). Underlined key words show meaning + icon + 🔊 on hover.
5. **Prompt first, then model (corrective feedback).**
   - First miss: a nudge that lets you fix it yourself ("Almost! How do you say *please*?").
   - Second miss: key-word chips.
   - Third miss: the full model sentence.
   - Each step is shown as the hint ladder and costs a star (3★, then 2★, then 1★).
6. **Recast, never "wrong".** The NPC answers naturally. A coach card shows a more natural version plus its translation.
7. **Listen and repeat (shadowing).** The model sentence has 🔊 and 🐢 slow playback (ElevenLabs `speed`). You repeat it out loud, and the transcript highlights which key words were heard.
8. **Comprehension checks.** After an important NPC line ("He loves the flowers near the library") you answer a one-click question (where do you look?). The story only continues if you understood.
9. **Spaced retrieval: the Word Garden.**
   - Words grow from 🌱 seed (seen) to 🌿 sprout (used once) to 🌻 bloom (used again later).
   - Words that needed hints become 💧 thirsty. They come back in later quests and are sent to Gemini so villagers reuse them naturally.
   - The story is written so every core word is met 5 or more times.
10. **Low-anxiety practice.**
    - Villagers are patient, there is no fail state, retries are unlimited, and hearts never go down.
    - Typing is always allowed; speaking earns a bonus, so it is encouraged but never forced.
11. **End-of-day recap.** Words learned, phrases spoken aloud, stars, best friend, and a "review tomorrow" list.

### 2.4 Gamification
- Stars per conversation, XP and a level bar (Newcomer → Neighbor → Local → Village Friend), and friendship hearts per villager.
- Quest log with completion stamps, items (🥐), toasts and sound effects, quest markers and an objective arrow.
- Speaking bonus XP and an end-of-day report card.
- **No streak pressure and no losses.** Rewards only add up, because research on Duolingo-style streaks and leagues shows they can create pressure.

### 2.5 Research notes (why these techniques)

| Technique | Finding | Source |
|---|---|---|
| Spaced retrieval | Spacing out retrieval practice beats massed practice (meta-analysis of 29 studies, g = 0.74). For L2 words, repetition alone is weak unless paired with spaced retrieval | [UTA](https://uta-ir.tdl.org/uta-ir/handle/10106/31392), [SSLA review](https://www.cambridge.org/core/journals/studies-in-second-language-acquisition/article/review-of-laboratory-studies-of-adult-second-language-vocabulary-training/18F0A5D1FFC829CE05931B2EEE83124A) |
| Many encounters | Estimates range from 5–16 exposures for a word to stick, and context matters | [Nation 2014](https://files.eric.ed.gov/fulltext/EJ1044345.pdf), [Frontiers 2022](https://frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2022.997951/full) |
| Guess first | Adults who guessed a word–picture pair before feedback remembered new Spanish words better (4 experiments, 341 adults) | [NUS 2026](https://fass.nus.edu.sg/news/2026/04/16/study-confirms-guessing-before-learning-improves-memory-in-language-learning/) |
| Pictures with words | Text + picture glosses beat text-only glosses for vocabulary | [Frontiers 2020](https://www.frontiersin.org/articles/10.3389/fpsyg.2020.602520/pdf) |
| Prompts before recasts | Corrective feedback has durable effects. Prompts (letting learners self-correct) often beat recasts | [Lyster & Saito 2010](https://escholarship.mcgill.ca/downloads/6w924g64b), [Ammar & Spada 2006](https://www.researchgate.net/profile/Ahlem-Ammar-2/publication/232021519_One_size_fits_all_Recasts_prompts_and_L2_learning/links/590885a0458515ebb49088ac/One-size-fits-all-Recasts-prompts-and-L2-learning.pdf) |
| Pushed output | Producing language makes learners notice gaps and process grammar more deeply (Swain) | [Output hypothesis review](https://revistas.pucsp.br/index.php/esp/article/view/6174) |
| Chunks | Teaching lexical chunks improved speaking fluency | [Albelihi 2022](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9379275/) |
| Shadowing | Improves intelligibility, fluency and prosody (systematic review of 44 studies) | [Oxford review](https://ora.ox.ac.uk/objects/uuid:3104cae1-3a6b-400a-b173-de44384238d2) |
| Low-anxiety agents | AI chatbots and embodied agents reduced foreign-language speaking anxiety in several studies | [arXiv 2026](https://arxiv.org/pdf/2607.21887), [HRMARS](https://hrmars.com/papers_submitted/23894/effects-of-an-ai-chatbot-mobile-application-on-foreign-language-anxiety-among-chinese-efl-undergraduates.pdf) |
| Game-based vocabulary | Meta-analyses find medium-to-large gains, depending on game design | [Tsai & Tsai 2018 summary](https://metatoc.com/papers/96106-the-effectiveness-of-digital-game-based-vocabulary-learning-a-framework-based-view-of-meta-analysis) |
| Gamification caveat | Streaks and XP help consistency but can create pressure that hurts intrinsic motivation | [Utrecht thesis](https://studenttheses.uu.nl/handle/20.500.12932/48993?show=full) |
| Game references | Influent (click objects, hear words) shows the value of vocabulary in a lived space. Lingotopia reviews warn against "guessing games" with no real use | [Influent](https://store.steampowered.com/app/274980), [Lingotopia review](https://www.gamingonlinux.com/2018/08/language-learning-game-lingotopia-is-out-some-thoughts/) |

## 3. AI integration

- **Gemini `/api/converse`** replaces `/api/feedback`.
  - Input: language, NPC persona, goal, goalCheck, memory facts, thirsty words, history, and what the player said.
  - Output (JSON schema): `goalDone`, `reply`, `replyEn`, `correction`, `correctionEn`, `praise`, `usedWords[]`, `newMemories[]`, `playerName?`.
  - Keep the existing model fallback, retry and 8 s deadline logic.
- **Free chat.** After a villager's quest step is done, talking to them again is open conversation that uses their memory (small XP per good sentence).
- **NPC memory.**
  - Facts are stored per villager in the save ("ordered a croissant", "helped find Biscuit").
  - Shared village rumors (`dog_found`) let other villagers react.
  - The Quest Book shows what each villager remembers, so judges can *see* the memory system.
- **ElevenLabs.** TTS sends `language_code` and `speed` (normal or slow), and the cache key includes both. STT uses the target language's `language_code`. Upcoming scripted lines are pre-fetched to hide latency.
- **Offline fallback.** Each step has accepted keyword patterns and canned replies per language, so the whole story can be finished without Gemini.

## 4. UI (HTML/CSS overlay, cozy wood-and-parchment style, pixel font)

- **Title screen.** It sits over a slowly panning live view of the village and shows:
  - the WordHarvest logo
  - language cards with CSS/SVG flags (Windows can't show flag emoji)
  - Continue and New game buttons
  - a short "how to play" card
- **HUD.**
  - Top-left: day/time chip, level and XP bar, words harvested.
  - Top-right: the current quest and objective.
  - Bottom-right: buttons for Quest Book (**Q**), mute (**M**) and settings.
- **Dialogue box.** Pixel portrait, name and hearts, target-language text with word glosses, a blurred translation, replay and slow buttons, the goal, the hint ladder, hold-SPACE mic plus a text box, a transcript and coach card, and a star result.
- **Quest Book** (leather book with two parchment pages, opened with **Q**):
  - **Quests** tab: the main story and side requests, with objectives and stamps.
  - **Word Garden** tab: words with growth stage, meaning, and a 🔊 play button.
  - **Villagers** tab: portrait, hearts, and "Remembers…" notes.
- Also: toasts, quest-complete banner, level-up flash, festival invite, and the end-of-day report.
- **Sound effects.** Generated in code with WebAudio: text blips, chime, star pops, page turn and level up. Optional soft music loop with mute.

## 5. Code layout

```
src/main.js                 boots UI + Phaser + service check, imports fonts and CSS
src/styles/main.css         the whole cozy UI look
src/game/main.js            Phaser config (smoothPixelArt, RESIZE)
src/game/director.js        story runner: every conversation as a readable async script
src/game/scenes/TownScene   world, walls, y-sort, fade covers, NPCs, dog, time of day, lanterns, particles
src/game/core/              bus.js (events), text.js (matching helpers)
src/game/state/store.js     save state + L()/H() text helpers (learned / help language)
src/game/data/              languages.js, words.js, npcs.js, story.js (all lines in en/tr/es), i18n.js (UI strings)
src/game/systems/           quests.js (progress, rewards), garden.js (Word Garden), memory.js
src/game/audio/             voice.js (TTS queue), mic.js (STT), sfx.js (WebAudio), converse.js (Gemini + offline)
src/game/ui/                TitleScreen, Hud, DialogueBox, QuestBook, WorldLabels, Toasts, EndOfDay, portraits
server/index.mjs            /api/converse, /api/tts (language, speed), /api/stt (language), /api/health
tools/art/                  build_map.py, town_annotations.json, source/ (original art)
```

## 6. Build phases (checklist)

- [x] **0. Cleanup.** Template scene and assets removed, title and package renamed, `log.js` telemetry removed.
- [x] **1. World.**
  - Art processed onto one grid.
  - Map annotated, walls and walk-behind atlas built.
  - Y-sorting, fading covers and the G debug view.
  - Idle NPCs, particles, Biscuit.
- [x] **2. Core systems.**
  - Save store.
  - English, Turkish and Spanish content.
  - Quests, Word Garden, memory and rumors.
- [x] **3. Conversation.**
  - Translation reveal, glosses, guess-first card.
  - Hint ladder (prompt, then key words, then model sentence) and coach card.
  - Comprehension question, choices, star result.
- [x] **4. Server.**
  - `/api/converse` with a JSON schema.
  - TTS language and speed, STT language.
  - Fast models with fallback.
- [x] **5. Game UI.**
  - Title screen, HUD, Quest Book (3 tabs).
  - Toasts, markers and edge arrow, SFX, end-of-day report.
- [x] **6. Story.**
  - Quests 1-4 with the dog decision, evening rumors and the festival inviter.
  - Two side requests.
- [ ] **7. Polish and demo**
  - [x] Offline regression runs end to end in Spanish, plus English with Turkish as the help language.
  - [ ] Rehearse the demo with a real mic and API keys, and time it to under 3 minutes.
  - [ ] Optional: music loop, mobile controls.

### How the story was checked
- **Headless Chrome walkthrough** (puppeteer-core), with `/api/*` mocked offline: title → Leo → Tom → Mia → find the dog (both choices) → return him → festival → end-of-day report.
- **Bundled Node check:** every model answer, and common alternatives, pass the offline matcher in en/tr/es. A bare greeting never completes a task.

## 7. Demo script (3 minutes)

| Time | What happens |
|------|--------------|
| 0:00 | Title screen; pick "I want to learn Spanish" and "I speak English" (or Turkish → English) |
| 0:15 | Leo: say hello and your name. Shows the memory system |
| 0:45 | Bakery: order a croissant. Show translation reveal, one hint and the star result |
| 1:15 | Mia: Biscuit is lost |
| 1:40 | Find Biscuit and choose: croissant or call him |
| 2:10 | Return Biscuit; villagers thank you; the festival evening starts |
| 2:40 | End-of-day report, then the Quest Book: Word Garden and the Villagers memory tab |

## 8. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Noisy room or blocked mic | Text input is always available; offline matching |
| API latency or outage | 8 s deadline, scripted lines pre-fetched, offline replies |
| ElevenLabs credits | Cached lines, 400-character limit |
| Phaser 4 API gaps | Stick to core APIs; check the source in `node_modules` |
| Map annotation accuracy | G debug overlay, then a walk-through of every path |
