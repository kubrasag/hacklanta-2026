// villagers.js
// Villagers as people: what they are doing right now, and how they chat when Gemini is offline.

import { store, L, H, vars } from '../state/store';
import { fill, hasPattern, simplify } from '../core/text';
import { NPCS } from '../data/npcs';
import { MOMENTS, INTENTS, CHAT_LINES } from '../data/life';
import { usedWord } from '../data/words';

let fallbackTurn = 0;

// The villager's current moment (depends on the story so far)
export function momentOf(npcId) {
  const list = MOMENTS[npcId] || [];
  return list.find((m) => m.when(store.state)) || list[list.length - 1];
}

// What is going on for this villager, in English, for Gemini
export function situationOf(npcId) {
  const m = momentOf(npcId);
  return m ? fill(m.now, vars()) : '';
}

export function profileOf(npcId) {
  const n = NPCS[npcId];
  return n ? fill(n.profile, vars()) + (store.state.backstories?.[npcId] ? `\nPersonal backstory (fixed): ${store.state.backstories[npcId]}` : '') : '';
}

function lineOf(textByLang, extra = {}) {
  const v = { npc: NPCS.leo.name, ...extra };
  return { reply: fill(L(textByLang), v), replyHelp: fill(H(textByLang), v) };
}

function asks(said, intent) {
  return (INTENTS[intent][store.state.learn] || []).some((p) => hasPattern(said, p));
}

// A simple chat reply without AI: understands a few common questions in the learned language
export function offlineChat(npcId, said) {
  const s = store.state;
  const n = NPCS[npcId];
  const m = momentOf(npcId);
  const me = { npc: n.name };
  const mentionsDog = usedWord(said, 'dog', s.learn) || simplify(said).includes(simplify(vars().dog));

  if (/(follow me|come with me|fetch|teleport|beni takip|benimle gel|sigueme|ven conmigo|acompaname)/.test(simplify(said))) {
    return lineOf({ en: 'I need to stay here, but I can give you directions or keep you company here.', tr: 'Burada kalmam gerekiyor, ama sana yol tarif edebilir veya burada sohbet edebilirim.', es: 'Tengo que quedarme aquí, pero puedo darte indicaciones o charlar contigo aquí.' });
  }

  if (asks(said, 'why')) return lineOf(m.why || m.line, me);
  if (asks(said, 'howareyou')) return lineOf(m.worried ? (m.why || m.line) : CHAT_LINES.fine, me);
  if (asks(said, 'name')) return lineOf(CHAT_LINES.name, me);
  if (asks(said, 'about')) return lineOf(n.intro, me);
  if (asks(said, 'likes')) return lineOf(n.likes, me);
  if (mentionsDog) {
    if (s.dog === 'following') return lineOf({ en: '{dog} is following you! Take him back to Mia.', tr: '{dog} seni takip ediyor! Onu Mia’ya götür.', es: '¡{dog} te sigue! Llévalo con Mia.' });
    if (npcId === 'mia' && !s.rumors.dogFound) return lineOf(m.why || m.line, me);
    return lineOf(s.rumors.dogFound ? CHAT_LINES.dogSafe : CHAT_LINES.dogLost, me);
  }
  if (asks(said, 'bye')) return lineOf(CHAT_LINES.bye, me);
  if (usedWord(said, 'thanks', s.learn)) return lineOf(CHAT_LINES.thanks, me);
  if (usedWord(said, 'hello', s.learn) || usedWord(said, 'goodmorning', s.learn)) return lineOf(CHAT_LINES.greet, me);
  const f = CHAT_LINES.fallback[fallbackTurn++ % CHAT_LINES.fallback.length];
  return lineOf(f, me);
}
