// store.js
// Everything the game remembers about the player, saved in the browser (localStorage).
// A page refresh keeps your progress. "New game" on the title screen starts over.
//
// Text helpers:
//   L(line)  the line in the language the player LEARNS   (what villagers say)
//   H(line)  the line in the language the player SPEAKS   (help, translations)

import { bus } from '../core/bus';
import { fill } from '../core/text';
import { LANGUAGES } from '../data/languages';
import { NPC_ORDER } from '../data/npcs';
import { QUESTS } from '../data/story';

const KEY = 'wordharvest-save-v1';

function freshState(learn, help) {
  const quests = {};
  Object.keys(QUESTS).forEach((id) => {
    quests[id] = { status: id === 'q1' ? 'active' : 'locked', step: 0 };
  });
  const hearts = {};
  const memories = {};
  NPC_ORDER.forEach((id) => {
    hearts[id] = 0;
    memories[id] = [];
  });
  return {
    v: 1,
    learn,
    help,
    playerName: null,
    xp: 0,
    time: 'morning',
    quests,
    stars: {},          // step id -> 1..3
    items: {},          // item id -> count
    hearts,             // npc id -> 0..10
    memories,           // npc id -> [text in help language]
    chats: {},          // npc id -> last lines said to each other, across visits
    visits: {},         // npc id -> { count, last }
    backstories: {},     // Gemini-written, stable across visits and reloads
    bookmarks: [],
    rumors: {},         // things the whole village knows
    words: {},          // word id -> { stage, seen, used, thirsty, usedIn: [] }
    discovered: [],     // words already shown as a "guess first" card
    stats: { spoken: 0, typed: 0, hints: 0, reveals: 0, guesses: 0, guessesRight: 0, chats: 0 },
    dog: 'hidden',      // hidden | following | home
    dayDone: false,
    pos: null,
  };
}

let saveTimer = null;

export const store = {
  state: null,

  hasSave() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY));
      return Boolean(data && data.v === 1 && LANGUAGES[data.learn]);
    } catch {
      return false;
    }
  },

  savedLanguages() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY));
      return data ? { learn: data.learn, help: data.help } : null;
    } catch {
      return null;
    }
  },

  load() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY));
      if (!data || data.v !== 1) return false;
      // Fill in anything a newer version added
      const base = freshState(data.learn, data.help);
      this.state = { ...base, ...data, stats: { ...base.stats, ...data.stats } };
      Object.keys(base.quests).forEach((id) => {
        if (!this.state.quests[id]) this.state.quests[id] = base.quests[id];
      });
      return true;
    } catch {
      return false;
    }
  },

  newGame(learn, help) {
    this.state = freshState(learn, help);
    this.saveNow();
  },

  save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => this.saveNow(), 300);
    bus.emit('state:changed', this.state);
  },

  saveNow() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.state));
    } catch {
      // storage can be blocked (private window); the game still works
    }
  },

  wipe() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
    this.state = null;
  },
};

// ---------- text helpers ----------

export function learnLang() {
  return LANGUAGES[store.state.learn];
}

export function vars() {
  const s = store.state;
  const lang = LANGUAGES[s.learn];
  const helpLang = LANGUAGES[s.help];
  return {
    name: s.playerName || lang.friend,
    helpName: s.playerName || helpLang.friend,
    dog: lang.dog,
    village: lang.village,
  };
}

// Line in the learned language
export function L(line) {
  if (!line) return '';
  return fill(line[store.state.learn], vars());
}

// Line in the help language (names stay as the village says them)
export function H(line) {
  if (!line) return '';
  const v = vars();
  return fill(line[store.state.help], { ...v, name: v.helpName });
}
