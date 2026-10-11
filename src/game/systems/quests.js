// quests.js
// Which quest is active, what to do next, and the rewards for finishing a step.
// Rewards only ever go up: no lost hearts, no broken streaks.

import { bus } from '../core/bus';
import { store, H } from '../state/store';
import { QUESTS, MAIN_ORDER, SIDE_ORDER } from '../data/story';
import { NPC_ORDER } from '../data/npcs';
import { memory } from './memory';

export const LEVELS = [0, 60, 150, 270, 420];

export function levelOf(xp) {
  let lv = 0;
  LEVELS.forEach((need, i) => { if (xp >= need) lv = i; });
  return lv;
}

export function levelProgress(xp) {
  const lv = levelOf(xp);
  const from = LEVELS[lv];
  const to = LEVELS[lv + 1];
  if (to === undefined) return { lv, pct: 1, from, to: from };
  return { lv, pct: (xp - from) / (to - from), from, to };
}

export function addXp(amount) {
  const s = store.state;
  const before = levelOf(s.xp);
  s.xp += amount;
  const after = levelOf(s.xp);
  store.save();
  bus.emit('xp:gained', { amount, xp: s.xp });
  if (after > before) bus.emit('level:up', after);
}

export function addHearts(npcId, amount) {
  if (!npcId || store.state.hearts[npcId] === undefined) return;
  store.state.hearts[npcId] = Math.min(10, store.state.hearts[npcId] + amount);
  store.save();
  bus.emit('hearts:changed', { npcId, amount });
}

export function giveItem(id, amount = 1) {
  const items = store.state.items;
  items[id] = Math.max(0, (items[id] || 0) + amount);
  if (!items[id]) delete items[id];
  store.save();
  bus.emit('items:changed', { id, amount });
}

export const quests = {
  def(qid) {
    return QUESTS[qid];
  },

  status(qid) {
    return store.state.quests[qid]?.status || 'locked';
  },

  currentStep(qid) {
    const q = store.state.quests[qid];
    if (!q || q.status !== 'active') return null;
    return QUESTS[qid].steps[q.step] || null;
  },

  // The villager with the most hearts invites you to the festival
  inviter() {
    const h = store.state.hearts;
    const order = ['mia', 'tom', 'leo', 'sam', 'lily'];
    return order.reduce((best, id) => (h[id] > h[best] ? id : best), order[0]);
  },

  npcOf(step) {
    return step.npc === 'inviter' ? this.inviter() : step.npc;
  },

  // Is there something to do with this villager (or Biscuit) right now?
  stepFor(npcId) {
    for (const qid of [...MAIN_ORDER, ...SIDE_ORDER]) {
      const step = this.currentStep(qid);
      if (step && this.npcOf(step) === npcId) return { qid, step };
    }
    return null;
  },

  // What the HUD shows: the main story first, then a side request
  objective() {
    for (const qid of [...MAIN_ORDER, ...SIDE_ORDER]) {
      const step = this.currentStep(qid);
      if (step) return { qid, quest: QUESTS[qid], step, npc: this.npcOf(step), text: H(step.objective) };
    }
    return null;
  },

  // Villagers who have something for you (for the "!" markers)
  markers() {
    const out = {};
    [...MAIN_ORDER, ...SIDE_ORDER].forEach((qid) => {
      const step = this.currentStep(qid);
      if (!step) return;
      const npc = this.npcOf(step);
      if (out[npc]) return;
      const firstStep = store.state.quests[qid].step === 0;
      out[npc] = { kind: QUESTS[qid].kind, mark: firstStep ? '!' : '?' };
    });
    return out;
  },

  unlock(qid) {
    const q = store.state.quests[qid];
    if (!q || q.status !== 'locked') return;
    q.status = 'active';
    q.step = 0;
    store.save();
    bus.emit('quest:started', qid);
  },

  // Finish the current step of a quest. "result" says how it went.
  //   result = { stars, spoken, npc, choice }
  completeStep(qid, result = {}) {
    const s = store.state;
    const q = s.quests[qid];
    const step = QUESTS[qid].steps[q.step];
    const reward = step.reward || {};
    const summary = { xp: 0, hearts: [], items: [], stars: result.stars || 0 };

    if (result.stars) s.stars[step.id] = Math.max(s.stars[step.id] || 0, result.stars);

    // XP: a base amount, more for each star, a bonus for speaking out loud
    let xp = 10;
    if (result.stars) xp += 10 * result.stars;
    if (result.spoken) xp += 10;
    if (result.choice === 'call') xp += 20;
    if (result.choice === 'croissant') xp += 10;
    summary.xp = xp;
    summary.spoken = Boolean(result.spoken);

    // Friendship
    const npc = result.npc;
    if (npc && s.hearts[npc] !== undefined) {
      const gain = result.stars >= 3 ? 2 : 1;
      addHearts(npc, gain);
      summary.hearts.push({ npc, amount: gain });
    }
    if (result.choice === 'croissant') {
      giveItem('croissant', -1);
      addHearts('tom', 1);
      summary.hearts.push({ npc: 'tom', amount: 1 });
      memory.rumor('dogMethod', 'croissant');
      memory.remember('tom', H({ en: 'You gave your croissant to a hungry dog.', tr: 'Kruvasanını aç bir köpeğe verdin.', es: 'Le diste tu cruasán a un perro con hambre.' }));
    }
    if (result.choice === 'call') {
      addHearts('mia', 1);
      summary.hearts.push({ npc: 'mia', amount: 1 });
      memory.rumor('dogMethod', 'call');
    }

    if (reward.item) {
      giveItem(reward.item, 1);
      summary.items.push(reward.item);
    }
    if (reward.memory && npc) memory.remember(npc, H(reward.memory));
    if (reward.follow) {
      s.dog = 'following';
      bus.emit('dog:changed', s.dog);
    }
    if (reward.dogHome) {
      s.dog = 'home';
      memory.rumor('dogFound', true);
      bus.emit('dog:changed', s.dog);
    }

    addXp(xp);

    // Next step, or the quest is done
    q.step += 1;
    if (q.step >= QUESTS[qid].steps.length) {
      q.status = 'done';
      summary.questDone = qid;
    }
    store.save();

    if (summary.questDone) bus.emit('quest:completed', qid);
    (reward.unlock || []).forEach((id) => this.unlock(id));
    if (reward.time && s.time !== reward.time) {
      s.time = reward.time;
      store.save();
      bus.emit('time:changed', s.time);
    }
    if (reward.dayDone) {
      s.dayDone = true;
      store.save();
      bus.emit('day:done');
    }
    bus.emit('objective:changed', this.objective());
    return summary;
  },

  totalStars() {
    return Object.values(store.state.stars).reduce((a, b) => a + b, 0);
  },

  bestFriend() {
    const h = store.state.hearts;
    return NPC_ORDER.reduce((best, id) => (h[id] > h[best] ? id : best), NPC_ORDER[0]);
  },
};
