// memory.js
// What villagers remember about you:
//   facts      short notes in the help language ("You found Biscuit."), shown in the Quest Book
//   chats      the last lines you said to each other, across visits, so they can refer back
//   visits     how many times you talked, and when the last time was
//   rumors     things the whole village knows
// Everything is sent to Gemini, so villagers bring it up naturally.

import { bus } from '../core/bus';
import { store } from '../state/store';

const MAX_FACTS = 32;
const MAX_LINES = 80;

function chats() {
  if (!store.state.chats) store.state.chats = {};
  return store.state.chats;
}

function visits() {
  if (!store.state.visits) store.state.visits = {};
  return store.state.visits;
}

export const memory = {
  remember(npcId, text) {
    if (!text || !store.state.memories[npcId]) return;
    const list = store.state.memories[npcId];
    if (list.includes(text)) return;
    list.push(text);
    if (list.length > MAX_FACTS) list.shift();
    store.save();
    bus.emit('memory:added', { npcId, text });
  },

  of(npcId) {
    return store.state.memories[npcId] || [];
  },

  // Save what was said in a conversation (called when it ends)
  logTalk(npcId, lines, session, location = 'Outside in the village') {
    if (!npcId || !store.state.memories[npcId]) return;
    const said = (lines || []).filter((l) => l && l.text).slice(-60);
    if (!said.length) return;
    const log = chats()[npcId] || [];
    const start = session ? log.findIndex((l) => l.session === session) : -1;
    if (start >= 0) log.splice(start);
    log.push({ who: 'gap', time: store.state.time, session, location });
    said.forEach((l) => log.push({ who: l.who === 'player' ? 'player' : 'npc', text: String(l.text).slice(0, 400) }));
    chats()[npcId] = log.slice(-MAX_LINES);
    const v = visits()[npcId] || { count: 0, last: null };
    visits()[npcId] = { count: v.count + (start < 0 ? 1 : 0), last: store.state.time };
    store.saveNow();
  },

  // Earlier conversations, oldest first, written for Gemini
  earlier(npcId, session) {
    const log = chats()[npcId] || [];
    const current = session ? log.findIndex((l) => l.session === session) : -1;
    return (current < 0 ? log : log.slice(0, current)).map((l) => {
      if (l.who === 'gap') return `--- a visit (${l.time}, ${l.location || 'village'}) ---`;
      return `${l.who === 'player' ? 'Player' : 'You'}: ${l.text}`;
    });
  },

  // The lines of the most recent visit (for the Quest Book)
  lastTalk(npcId, max = 4) {
    const log = chats()[npcId] || [];
    const start = log.map((l) => l.who).lastIndexOf('gap');
    return log.slice(start + 1).slice(-max);
  },

  visitCount(npcId, session) {
    const current = session && (chats()[npcId] || []).some((l) => l.session === session);
    return Math.max(0, (visits()[npcId]?.count || 0) - (current ? 1 : 0));
  },

  lastVisit(npcId, session) {
    if (!session) return visits()[npcId]?.last || null;
    return (chats()[npcId] || []).filter((l) => l.who === 'gap' && l.session !== session).at(-1)?.time || null;
  },

  rumor(key, value = true) {
    store.state.rumors[key] = value;
    store.save();
  },

  // Plain English facts for Gemini (it understands any language, but English is most reliable)
  villageFacts() {
    const r = store.state.rumors;
    const facts = [];
    if (store.state.quests.q2?.status === 'done') facts.push('The player bought a croissant from Tom this morning.');
    if (store.state.quests.q2?.status === 'done' && !r.dogFound && store.state.dog !== 'following') facts.push("Mia's small brown dog ran away this morning and is still missing.");
    if (store.state.dog === 'following') facts.push("The player found Mia's dog and he is following them right now.");
    if (r.dogFound) facts.push("The player found Mia's lost dog and brought him home. Everyone heard about it.");
    if (r.dogMethod === 'croissant') facts.push('The player gave the dog their croissant to calm him down.');
    if (r.dogMethod === 'call') facts.push('The player called the dog in the local language and he came running.');
    if (store.state.time === 'evening') facts.push('It is the evening of the Lantern Festival at the fountain.');
    return facts;
  },
};
