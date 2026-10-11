// director.js
// Runs the story: what happens when you talk to someone, what the village shows next,
// and all the little rewards. It connects the world (TownScene) with the menus (ui/*).
//
// A conversation reads top to bottom like a script:
//   villager lines -> guess a new word -> your turn -> stars -> story continues -> question

import { bus } from './core/bus';
import { store, L, H, vars } from './state/store';
import { t } from './data/i18n';
import { NPCS, NPC_ORDER } from './data/npcs';
import { WORDS } from './data/words';
import { QUESTS, BARKS, DOG_HAPPY, ITEMS } from './data/story';
import { CHAT_IDEAS } from './data/life';
import { momentOf } from './systems/villagers';
import { prepareBackstories } from './systems/backstories';
import { quests, addXp } from './systems/quests';
import { garden } from './systems/garden';
import { memory } from './systems/memory';
import { converse } from './audio/converse';
import { speak, stopVoice } from './audio/voice';
import { sfx } from './audio/sfx';
import { toast, banner } from './ui/Toasts';

const TIME_ICONS = { morning: '☀️', afternoon: '🌤️', evening: '🌙' };

export default class Director {
  constructor({ scene, dialogue, hud, book, labels, endOfDay, ai }) {
    Object.assign(this, { scene, dialogue, hud, book, labels, endOfDay, ai });
    this.queue = [];          // big announcements wait until the conversation ends
    this.barked = new Set();
    this.barkCooldown = 0;
    this.lastNear = null;

    scene.labels = labels;
    scene.isBlocked = () => this.blocked();

    bus.on('interact', (id) => this.interact(id));
    bus.on('book:toggle', () => this.toggleBook());
    bus.on('labels:near', (id) => this.showPrompt(id));
    bus.on('player:pos', (pos) => { if (store.state) { store.state.pos = pos; store.save(); } });
    bus.on('player:moved', (player) => this.onMove(player));
    bus.on('state:changed', () => this.refreshWorld());

    bus.on('word:planted', (id) => {
      const w = WORDS[id];
      const s = store.state;
      sfx.plant();
      toast({ icon: '🌱', kicker: t('newWord'), text: `${w.icon} ${w.text[s.learn]} = ${w.text[s.help]}`, time: 2200 });
    });
    bus.on('level:up', (lv) => {
      sfx.levelUp();
      toast({ icon: '🏅', kicker: t('levelUp'), text: `${t('lv')} ${lv + 1} · ${t('levels')[lv]}`, big: true, time: 3200 });
    });
    bus.on('items:changed', ({ id, amount }) => {
      if (amount > 0) toast({ icon: ITEMS[id].icon, kicker: t('gotItem'), text: H(ITEMS[id].text) });
    });
    bus.on('quest:started', (qid) => this.announce(() => {
      if (qid === 'q1') return;
      sfx.chime();
      toast({ icon: QUESTS[qid].icon, kicker: t('newQuest'), text: H(QUESTS[qid].title), big: QUESTS[qid].kind === 'main', time: 3200 });
    }));
    bus.on('quest:completed', (qid) => this.announce(() => {
      sfx.quest();
      toast({ icon: '📜', kicker: t('questDone'), text: H(QUESTS[qid].title), big: true, time: 3200 });
    }));
    bus.on('time:changed', (time) => this.announce(() => {
      this.scene.setTime(time, true);
      banner(`${TIME_ICONS[time]} ${t(time)}`, t('timePasses'));
    }));
    bus.on('dog:changed', (state) => this.scene.setDog(state));
    bus.on('day:done', () => this.announce(() => setTimeout(() => this.endOfDay.show(), 900)));
  }

  // ---------- starting ----------

  begin(fresh) {
    const s = store.state;
    if (this.ai()) prepareBackstories();
    const v = vars();
    let dog = s.dog;
    if (dog === 'hidden' && quests.currentStep('q3')?.type === 'find') dog = 'lost';
    this.scene.startPlay({ pos: fresh ? null : s.pos, time: s.time, dog });
    this.hud.show();
    this.refreshWorld();
    if (fresh) {
      setTimeout(() => banner(`🌾 ${v.village}`, `${TIME_ICONS[s.time]} ${t('day')} · ${t(s.time)}`, 3000), 500);
      setTimeout(() => {
        sfx.chime();
        toast({ icon: QUESTS.q1.icon, kicker: t('newQuest'), text: H(QUESTS.q1.title), big: true, time: 3500 });
      }, 2600);
    }
    if (s.dayDone) setTimeout(() => this.endOfDay.show(), 600);
  }

  blocked() {
    return this.dialogue.isOpen || this.book.isOpen || this.endOfDay.wrap.classList.contains('open')
      || performance.now() - this.dialogue.closedAt < 350;
  }

  // Quest toasts and time changes wait until the conversation is over
  announce(fn) {
    if (this.dialogue.isOpen) this.queue.push(fn);
    else fn();
  }

  flush() {
    const list = this.queue;
    this.queue = [];
    list.forEach((fn, i) => setTimeout(fn, i * 450));
  }

  toggleBook() {
    if (this.dialogue.isOpen) return;
    if (performance.now() - (this.book.closedAt || 0) < 350) return;
    this.book.toggle();
  }

  // ---------- the world reacts to the save state ----------

  refreshWorld() {
    if (!store.state) return;
    const marks = quests.markers();
    [...NPC_ORDER, 'biscuit'].forEach((id) => this.labels.setMarker(id, marks[id] || null));
    const findActive = quests.currentStep('q3')?.type === 'find';
    if (findActive && this.scene.dogState === 'hidden') this.scene.setDog('lost');
  }

  showPrompt(id) {
    if (this.lastNear) this.labels.setPrompt(this.lastNear, null);
    this.lastNear = id;
    if (!id) return;
    const name = id === 'biscuit' ? vars().dog : NPCS[id].name;
    this.labels.setPrompt(id, `${id === 'biscuit' ? t('look') : t('talk')} · ${name}`);
  }

  onMove(player) {
    // Arrow at the edge of the screen toward the next goal
    const obj = quests.objective();
    const sprite = obj ? this.scene.npcSprite(obj.npc) : null;
    if (sprite && !this.blocked()) {
      const cam = this.scene.cameras.main;
      const v = cam.worldView;
      const inside = sprite.x > v.x + 10 && sprite.x < v.right - 10 && sprite.y - 40 > v.y && sprite.y < v.bottom;
      if (!inside) {
        const { width, height } = this.scene.scale.gameSize;
        const p = this.scene.screenOf(sprite.x, sprite.y - 30);
        const cx = width / 2;
        const cy = height / 2;
        const angle = Math.atan2(p.y - cy, p.x - cx);
        const m = 56;
        const sx = Math.cos(angle);
        const sy = Math.sin(angle);
        const k = Math.min((cx - m) / Math.max(0.001, Math.abs(sx)), (cy - m) / Math.max(0.001, Math.abs(sy)));
        this.hud.setArrow({ x: cx + sx * k, y: cy + sy * k, angle, who: obj.npc });
      } else {
        this.hud.setArrow(null);
      }
    } else {
      this.hud.setArrow(null);
    }

    // In the evening, villagers you pass tell you what they heard
    const s = store.state;
    if (s.time !== 'evening' || this.blocked()) return;
    this.barkCooldown -= 16;
    if (this.barkCooldown > 0) return;
    for (const b of BARKS) {
      const key = `${b.npc}|${L(b.line)}`;
      if (this.barked.has(key) || !b.when(s)) continue;
      const npc = this.scene.npcs[b.npc];
      if (Math.hypot(player.x - npc.x, player.y - npc.y) > 170) continue;
      if (this.barked.has(b.npc)) continue;
      this.barked.add(key);
      this.barked.add(b.npc);
      this.labels.bubble(b.npc, L(b.line), H(b.line), 4200);
      speak(L(b.line), { voiceId: NPCS[b.npc].voiceId, lang: s.learn });
      this.barkCooldown = 2600;
      break;
    }
  }

  // ---------- talking ----------

  async interact(id) {
    if (this.blocked() || this.busy) return;
    this.busy = true;
    try {
      const found = quests.stepFor(id);
      if (found && found.step.type === 'find') {
        await this.runFind(found.qid, found.step);
      } else if (NPCS[id]) {
        this.startTalk(id);
        const intro = found?.step.introBy ? found.step.introBy[id] : found?.step.intro;
        const greeting = intro?.[0] || momentOf(id).line;
        if (!(await this.dialogue.say(this.line(greeting)))) return;
        const options = [
          { id: 'chat', icon: '💬', text: H({ en: 'Just chat', tr: 'Sohbet et', es: 'Charlar' }) },
          ...(found ? [{ id: 'quest', icon: '📜', text: H(found.step.objective), quest: true }] : []),
          { id: 'about', icon: '📖', text: H({ en: 'Tell me about yourself', tr: 'Bana kendini anlat', es: 'Háblame de ti' }) },
          { id: 'leave', icon: '👋', text: H({ en: 'See you later', tr: 'Sonra görüşürüz', es: 'Hasta luego' }) },
        ];
        const pick = await this.dialogue.choose(options);
        if (pick === 'chat') {
          await this.freeChat(id, false);
        } else if (pick === 'about') {
          if (await this.dialogue.say(this.line(NPCS[id].intro))) await this.freeChat(id, false);
        } else if (pick === 'quest' && await this.runTalk(found.qid, found.step, id, true)) {
          await this.freeChat(id, true);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      this.endTalk();
      this.busy = false;
    }
  }

  startTalk(id, name) {
    const s = store.state;
    this.talkingTo = id;
    this.talkSession = crypto.randomUUID();
    this.dialogue.holdBack = this.mysteryWords();
    this.scene.faceEachOther(id);
    this.scene.setTalkCamera(true);
    this.hud.setArrow(null);
    this.labels.layer.style.visibility = 'hidden';
    this.dialogue.open(id, { name, hearts: NPCS[id] ? s.hearts[id] : null });
    this.dialogue.onHistory = () => memory.logTalk(id, this.dialogue.history, this.talkSession, this.scene.conversationContext(id).location);
  }

  endTalk() {
    // The villager remembers this conversation next time
    if (this.talkingTo && NPCS[this.talkingTo]) this.dialogue.onHistory?.();
    this.talkingTo = null;
    if (this.dialogue.isOpen) this.dialogue.close();
    this.labels.layer.style.visibility = '';
    this.scene.setTalkCamera(false);
    this.refreshWorld();
    this.flush();
  }

  line(l) {
    return { text: L(l), help: H(l) };
  }

  // Your turn: speak or type until the goal is reached
  taskSpec(task, npcId, stepId, { localOnly = false } = {}) {
    const s = store.state;
    const usedAll = new Set();   // words used in ANY attempt count for the Word Garden
    return {
      usedAll,
      goal: H(task.goal),
      model: L(task.model),
      modelHelp: H(task.model),
      words: task.words,
      stepId,
      onAttempt: async (said, spoken, effort) => {
        if (spoken) s.stats.spoken += 1;
        else s.stats.typed += 1;
        store.save();
        const lenient = effort.attempts >= 2 || effort.hintLevel >= 1;
        const fb = await converse({ mode: 'task', npcId, task, history: this.dialogue.history, said, context: { ...this.scene.conversationContext(npcId), session: this.talkSession }, localOnly, lenient });
        (fb.used || []).forEach((id) => usedAll.add(id));
        fb.used = [...usedAll];
        if (fb.playerName && !s.playerName && npcId === 'leo') {
          s.playerName = fb.playerName;
          store.save();
        }
        return fb;
      },
    };
  }

  // Every word you used grows. Words shown in a hint you needed get a 💧 (practise again).
  mysteryWords() {
    const done = store.state.discovered || [];
    const all = Object.values(QUESTS).flatMap((q) => q.steps.map((st) => st.discover).filter(Boolean));
    return new Set(all.filter((id) => !done.includes(id)));
  }

  grow(res, stepId, task) {
    const hinted = res.hintLevel > 0 ? new Set(task ? task.words : []) : new Set();
    return (res.fb.used || []).map((id) => garden.use(id, { stepId, helped: hinted.has(id) })).filter(Boolean);
  }

  async runTalk(qid, step, npcId, started = false) {
    const s = store.state;
    const box = this.dialogue;
    if (!started) this.startTalk(npcId);
    const intro = step.introBy ? step.introBy[npcId] : step.intro;
    // "Guess first": words that get a guessing card later stay a mystery until then
    box.holdBack = this.mysteryWords();
    [...intro, ...(step.success || [])].forEach((l) => box.prefetchLine(L(l)));

    for (const l of intro.slice(started ? 1 : 0)) {
      if (!(await box.say(this.line(l)))) return;
    }

    // Guess first: a new word, before you have to use it
    if (step.discover && !s.discovered?.includes(step.discover)) {
      const guess = await box.discover(step.discover);
      if (!guess) return;
      s.discovered = [...(s.discovered || []), step.discover];
      box.holdBack = this.mysteryWords();
      store.save();
      if (guess.right) addXp(5);
    }

    const res = await box.task(this.taskSpec(step.task, npcId, step.id));
    if (!res) return;

    if (res.fb.memory) memory.remember(npcId, res.fb.memory);
    const grew = this.grow(res, step.id, step.task);
    const summary = quests.completeStep(qid, { stars: res.stars, spoken: res.spoken, npc: npcId });
    const polite = step.task.bonus && (res.fb.used || []).includes(step.task.bonus);
    if (!(await box.result({
      ...summary, grew, hintLevel: res.hintLevel, praise: polite ? t('polite') : res.fb.praise,
      better: res.fb.better, betterHelp: res.fb.betterHelp,
    }))) return;
    box.setHearts(s.hearts[npcId]);

    // The villager reacts to what you actually said (Gemini), then the story goes on
    const rest = [...(step.success || [])].map((l) => this.line(l));
    if (res.fb.source === 'ai' && res.fb.aiDone && res.fb.reply) rest[0] = { text: res.fb.reply, help: res.fb.replyHelp };
    if (step.endingBy) rest.push(this.line(step.endingBy[s.rumors.dogMethod || 'croissant']));
    for (const l of rest) {
      if (!(await box.say(l))) return;
    }

    if (step.question) {
      const q = step.question;
      const ok = await box.question({
        ask: H(q.ask),
        options: q.options.map((o) => ({ icon: o.icon, text: H(o.text), correct: o.correct })),
      });
      if (ok) addXp(5);
    }
    return true;
  }

  async runFind(qid, step) {
    const s = store.state;
    const box = this.dialogue;
    const v = vars();
    sfx.woof();
    this.startTalk('biscuit', v.dog);
    if (!(await box.say(this.line(step.bark), { voice: false }))) return;
    if (!(await box.narrate(H(step.narration)))) return;

    const options = step.choices.map((c) => ({
      id: c.id,
      quest: true,
      icon: c.icon,
      text: H(c.text),
      disabled: Boolean(c.item && !s.items[c.item]),
      disabledText: t('noItem'),
    }));
    const pick = await box.choose(options);
    if (!pick) return;
    const choice = step.choices.find((c) => c.id === pick);

    let result = { stars: 3, spoken: false, hintLevel: 0, fb: { used: [] } };
    if (choice.task) {
      const res = await box.task(this.taskSpec(choice.task, 'biscuit', step.id, { localOnly: true }));
      if (!res) return;
      result = res;
    }
    const grew = this.grow(result, step.id, choice.task);
    sfx.woof();
    if (!(await box.say(this.line(DOG_HAPPY), { voice: false }))) return;
    await box.narrate(H(choice.result));
    const summary = quests.completeStep(qid, { stars: result.stars, spoken: result.spoken, choice: pick, npc: null });
    await box.result({ ...summary, grew, hintLevel: result.hintLevel });
  }

  // Free conversation about anything. Gemini plays the villager with their story and memory;
  // without Gemini, they still answer simple questions (how are you, why, what do you like...).
  async freeChat(npcId, afterQuest) {
    const s = store.state;
    const box = this.dialogue;
    if (!box.isOpen) return;
    await box.chat({
      afterQuest,
      ideas: CHAT_IDEAS.map((i) => ({ icon: i.icon, text: i.text[s.learn], help: i.text[s.help] })),
      onAttempt: async (said, spoken) => {
        s.stats.chats += 1;
        if (spoken) s.stats.spoken += 1;
        store.save();
        const fb = await converse({ mode: 'chat', npcId, history: box.history, said, context: { ...this.scene.conversationContext(npcId), session: this.talkSession } });
        (fb.used || []).forEach((id) => garden.use(id, { stepId: `chat_${npcId}`, helped: false }));
        if (fb.memory) memory.remember(npcId, fb.memory);
        if (fb.playerName && !s.playerName) {
          s.playerName = fb.playerName;
          store.save();
        }
        addXp(spoken ? 4 : 2);
        return fb;
      },
    });
  }

  stopAll() {
    stopVoice();
  }
}
