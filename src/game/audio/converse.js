// converse.js
// What happens after the player speaks (or types):
//   1. Ask our server (Gemini) to judge the goal and answer in character.
//   2. Always also check locally with word matching, so the game never gets stuck,
//      even without internet or an API key.
//
// Result:
//   goalDone   did the player reach the goal?
//   reply      what the villager says back (learned language)  + replyHelp (translation)
//   nudge      a hint that lets the player fix it themselves (help language)
//   better     a more natural way to say it (learned language) + betterHelp
//   praise     a short cheer (help language)
//   playerName the name, if the player introduced themselves
//   used       word ids the player used (for the Word Garden)

import { store, L, H, vars } from '../state/store';
import { WORDS, usedWord } from '../data/words';
import { NPCS } from '../data/npcs';
import { RETRY_LINES } from '../data/story';
import { LANGUAGES } from '../data/languages';
import { simplify, capitalize } from '../core/text';
import { memory } from '../systems/memory';
import { garden } from '../systems/garden';
import { offlineChat, situationOf, profileOf } from '../systems/villagers';
import { t } from '../data/i18n';

let aiAvailable = true;
let retryIndex = 0;

export function useAI(value) {
  aiAvailable = value;
}

// "Me llamo Ana" -> "Ana"
const NAME_PATTERNS = {
  en: /(?:my name is|my name's|i am|i'm|call me|it's|it is)\s+([\p{L}'-]{2,20})/iu,
  tr: /(?:benim ad[ıi]m|ad[ıi]m|benim ismim|ismim|ben)\s+([\p{L}'-]{2,20})/iu,
  es: /(?:me llamo|mi nombre es|soy|ll[aá]mame)\s+([\p{L}'-]{2,20})/iu,
};
const NOT_NAMES = new Set(['leo', 'tom', 'mia', 'sam', 'lily', 'new', 'nueva', 'nuevo', 'from', 'de', 'very', 'muy', 'happy', 'fine', 'good', 'bien', 'yeni', 'iyi', 'a', 'un', 'una']);

export function findName(said, lang) {
  const m = String(said).match(NAME_PATTERNS[lang]);
  if (!m) return null;
  const name = m[1].replace(/[.,!?¡¿]/g, '');
  if (NOT_NAMES.has(simplify(name))) return null;
  return capitalize(name);
}

export function wordsUsed(said, wordIds) {
  const lang = store.state.learn;
  return wordIds.filter((id) => usedWord(said, id, lang));
}

function localCheck(task, said) {
  const lang = store.state.learn;
  const any = task.pass?.any || [];
  let ok = any.some((id) => usedWord(said, id, lang));
  if (!ok && task.pass?.orDogName) ok = simplify(said).includes(simplify(vars().dog));
  return ok;
}

function localNudge(task, said) {
  const lang = store.state.learn;
  const missing = (task.pass?.any || []).concat(task.words || []).find((id) => !usedWord(said, id, lang));
  if (!missing) return t('nudgeGeneric');
  const w = WORDS[missing];
  return t('nudgeTry', { word: w.text[lang], meaning: w.text[store.state.help] });
}

function offline({ mode, task, said, npcId }) {
  const s = store.state;
  if (mode === 'chat') {
    const r = offlineChat(npcId, said);
    return { goalDone: false, reply: r.reply, replyHelp: r.replyHelp, playerName: findName(said, s.learn), source: 'local' };
  }
  const done = localCheck(task, said);
  const retry = RETRY_LINES[retryIndex++ % RETRY_LINES.length];
  return {
    goalDone: done,
    reply: done ? null : L(retry),
    replyHelp: done ? null : H(retry),
    nudge: done ? null : localNudge(task, said),
    better: null,
    praise: done ? null : null,
    playerName: findName(said, s.learn),
    source: 'local',
  };
}

// lenient = the player already tried twice or used a hint: then a clear word match is enough
export async function converse({ mode = 'task', npcId, task, history, said, context = {}, localOnly = false, lenient = false }) {
  const s = store.state;
  const local = offline({ mode, task, said, npcId });
  // Every word the village teaches counts, so reusing an old word later makes it bloom
  const used = wordsUsed(said, Object.keys(WORDS));
  if (!aiAvailable || localOnly) return { ...local, used };

  const npc = NPCS[npcId];
  const body = {
    mode,
    learn: LANGUAGES[s.learn].name,
    help: LANGUAGES[s.help].name,
    npcName: npc ? npc.name : 'Biscuit',
    persona: npc ? profileOf(npcId) : 'A small brown dog.',
    situation: npc ? situationOf(npcId) : '',
    playerName: s.playerName,
    memories: npc ? memory.of(npcId) : [],
    earlier: npc ? memory.earlier(npcId, context.session) : [],
    visits: npc ? memory.visitCount(npcId, context.session) : 0,
    lastVisit: npc ? memory.lastVisit(npcId, context.session) : null,
    timeOfDay: s.time,
    location: context.location || 'Outside in the village, not inside a building.',
    worldState: { dog: s.dog, quests: s.quests, items: s.items },
    villageFacts: memory.villageFacts(),
    reviewWords: garden.thirsty().map((id) => WORDS[id].text[s.learn]),
    goal: task ? task.goal.en : null,
    goalCheck: task ? task.check : null,
    model: task ? L(task.model) : null,
    history: history.slice(-20),
    said,
  };

  try {
    const res = await fetch('/api/converse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`converse ${res.status}`);
    const ai = await res.json();
    // The AI understands meaning (and notices answers in the wrong language), so it decides.
    // After some effort, a clear word match also counts, so nobody gets stuck.
    const goalDone = mode === 'task' ? Boolean(ai.goalDone || (lenient && local.goalDone)) : false;
    return {
      goalDone,
      reply: ai.reply || local.reply,
      replyHelp: ai.replyHelp || local.replyHelp,
      nudge: goalDone ? null : (ai.nudge || local.nudge),
      better: ai.better,
      betterHelp: ai.betterHelp,
      praise: goalDone ? ai.praise : null,
      playerName: ai.playerName || local.playerName,
      memory: ai.memory,
      used,
      aiDone: Boolean(ai.goalDone),
      source: 'ai',
    };
  } catch (err) {
    console.warn('Gemini not available, using word matching instead.', err);
    return { ...local, used };
  }
}
