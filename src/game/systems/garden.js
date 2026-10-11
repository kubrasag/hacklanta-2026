// garden.js
// The Word Garden: every word grows as you use it (spaced retrieval practice).
//   stage 0  not met yet
//   stage 1  🌱 seed    you met the word (heard it or guessed it)
//   stage 2  🌿 sprout  you used it in a conversation
//   stage 3  🌻 bloom   you used it again in a LATER conversation, without a hint
// A word you needed a hint for is 💧 thirsty: villagers will bring it up again.

import { bus } from '../core/bus';
import { store } from '../state/store';
import { WORDS } from '../data/words';

export const STAGE_ICONS = ['·', '🌱', '🌿', '🌻'];

function entry(id) {
  const words = store.state.words;
  if (!words[id]) words[id] = { stage: 0, seen: 0, used: 0, thirsty: false, usedIn: [] };
  return words[id];
}

export const garden = {
  get(id) {
    return store.state.words[id] || { stage: 0, seen: 0, used: 0, thirsty: false, usedIn: [] };
  },

  // The player met the word (it was in a line, or they guessed it)
  see(id) {
    if (!WORDS[id]) return;
    const w = entry(id);
    w.seen += 1;
    if (w.stage === 0) {
      w.stage = 1;
      bus.emit('word:planted', id);
    }
    store.save();
  },

  // The player said the word. Returns { id, from, to } so the UI can show it growing.
  use(id, { stepId, helped }) {
    if (!WORDS[id]) return null;
    const w = entry(id);
    const from = w.stage;
    w.seen += 1;
    w.used += 1;
    if (stepId && !w.usedIn.includes(stepId)) w.usedIn.push(stepId);
    w.thirsty = Boolean(helped);
    if (w.stage < 2) w.stage = 2;
    if (!helped && w.usedIn.length >= 2) w.stage = 3;
    store.save();
    return { id, from, to: w.stage };
  },

  // A hint showed this word: it needs more practice
  helped(id) {
    if (!WORDS[id]) return;
    const w = entry(id);
    w.thirsty = true;
    if (w.stage === 0) w.stage = 1;
    store.save();
  },

  list() {
    return Object.entries(store.state.words)
      .filter(([id, w]) => w.stage > 0 && WORDS[id])
      .map(([id, w]) => ({ id, ...w }));
  },

  // Words to practise: the ones that needed a hint first, then the ones only heard so far
  thirsty(max = 6) {
    const words = this.list();
    const needHelp = words.filter((w) => w.thirsty).map((w) => w.id);
    const onlySeen = words.filter((w) => !w.thirsty && w.stage === 1).sort((a, b) => b.seen - a.seen).map((w) => w.id);
    return [...needHelp, ...onlySeen].slice(0, max);
  },

  count() {
    return this.list().length;
  },
};
