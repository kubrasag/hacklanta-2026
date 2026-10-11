// memory.js
// What villagers remember about you, and the rumors the whole village knows.
// Memories are shown in the Quest Book and sent to Gemini, so villagers can bring them up.

import { bus } from '../core/bus';
import { store } from '../state/store';

const MAX_PER_NPC = 8;

export const memory = {
  remember(npcId, text) {
    if (!text || !store.state.memories[npcId]) return;
    const list = store.state.memories[npcId];
    if (list.includes(text)) return;
    list.push(text);
    if (list.length > MAX_PER_NPC) list.shift();
    store.save();
    bus.emit('memory:added', { npcId, text });
  },

  of(npcId) {
    return store.state.memories[npcId] || [];
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
    if (r.dogFound) facts.push("The player found Mia's lost dog and brought him home. Everyone heard about it.");
    if (r.dogMethod === 'croissant') facts.push('The player gave the dog their croissant to calm him down.');
    if (r.dogMethod === 'call') facts.push('The player called the dog in the local language and he came running.');
    if (store.state.time === 'evening') facts.push('It is the evening of the Lantern Festival at the fountain.');
    return facts;
  },
};
