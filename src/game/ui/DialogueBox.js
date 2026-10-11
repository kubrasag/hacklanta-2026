// DialogueBox.js
// The conversation box at the bottom of the screen. Every learning moment happens here.
//
// It is driven step by step by the director, and every method waits for the player:
//   await box.say(line)         a villager line in the learned language (+ hidden translation)
//   await box.discover(wordId)  "guess first": pick the meaning of a new word
//   await box.task(spec)        the player's turn: speak (hold SPACE) or type to reach a goal
//   await box.question(q)       a quick comprehension check
//   await box.choose(options)   a decision
//   await box.result(summary)   stars, XP and growing words
// Each one resolves with null if the player pressed ESC to leave.

import { el, clear, typing } from './dom';
import { portrait } from './portraits';
import { t, langName } from '../data/i18n';
import { WORDS } from '../data/words';
import { NPCS } from '../data/npcs';
import { store } from '../state/store';
import { garden, STAGE_ICONS } from '../systems/garden';
import { speak, stopVoice, prefetch } from '../audio/voice';
import { startRecording, stopRecording, isRecording, speechMode } from '../audio/mic';
import { sfx, unlockAudio } from '../audio/sfx';
import { escapeHtml, shuffle } from '../core/text';
import TranslationPopup from './TranslationPopup';

const TYPE_SPEED = 22; // ms per letter

export default class DialogueBox {
  constructor(root) {
    this.isOpen = false;
    this.holdBack = new Set();   // words not to reveal yet (they get a "guess first" card)
    this.closedAt = 0;
    this.pending = null;   // { kind, resolve }
    this.typingTimer = null;

    this.root = el('div', 'dialogue panel');
    this.portraitBox = el('div', 'portrait');
    this.nameplate = el('span', 'nameplate');
    this.heartsEl = el('span', 'hearts');
    this.goalPill = el('span', 'dlg-goal');
    this.lineEl = el('div', 'dlg-line');
    this.transText = el('span', 'txt');
    this.transEl = el('div', 'dlg-trans', [this.transText, el('span', 'hint', t('tapTranslate'))]);
    this.replayBtn = el('button', 'btn small paper', `🔊 ${t('replay')}`);
    this.slowBtn = el('button', 'btn small paper', `🐢 ${t('slow')}`);
    this.toolsEl = el('div', 'dlg-tools', [this.replayBtn, this.slowBtn]);
    const main = el('div', 'dlg-main', [
      el('div', 'dlg-name', [this.nameplate, this.heartsEl, this.goalPill]),
      this.lineEl,
      this.transEl,
      this.toolsEl,
    ]);
    const head = el('div', 'dlg-head', [this.portraitBox, main]);

    // The player's turn
    this.turnTitle = el('span', 'goal');
    this.starsLive = el('span', 'stars-live');
    this.micBtn = el('button', 'mic', [el('span', 'dot'), el('span', 'lbl', t('holdToSpeak'))]);
    this.input = el('input');
    this.input.placeholder = t('typeHere');
    this.input.setAttribute('autocomplete', 'off');
    this.input.setAttribute('spellcheck', 'false');
    this.sendBtn = el('button', 'btn small green', t('send'));
    this.hint1Btn = el('button', 'btn small paper', `💡 ${t('hint1')} ${t('hintCost')}`);
    this.hint2Btn = el('button', 'btn small paper', `📜 ${t('hint2')} ${t('hintCost')}`);
    this.hintBox = el('div', 'hint-box');
    this.modelBox = el('div', 'model');
    this.saidEl = el('div', 'said');
    this.coachEl = el('div', 'coach');
    this.turnEl = el('div', 'turn', [
      el('div', 'turn-title', [el('span', 'yt', t('yourTurn')), this.turnTitle, this.starsLive]),
      el('div', 'turn-row', [this.micBtn, el('div', 'type-box', [this.input, this.sendBtn])]),
      el('div', 'hint-row', [this.hint1Btn, this.hint2Btn]),
      this.hintBox,
      this.modelBox,
      this.saidEl,
      this.coachEl,
    ]);

    this.card = el('div', 'card');
    this.footNext = el('span', 'next', t('pressE'));
    this.foot = el('div', 'dlg-foot', [this.footNext, el('span', '', t('escLeave'))]);

    this.root.append(head, this.turnEl, this.card, this.foot);
    root.appendChild(this.root);

    this.tip = el('div', 'gloss-tip');
    this.tip.style.display = 'none';
    root.appendChild(this.tip);

    this.bindEvents();
    this.translationPopup = new TranslationPopup(root, this);
  }

  // ================= opening and closing =================

  open(who, { name, hearts = null } = {}) {
    this.session = (this.session || 0) + 1;
    unlockAudio();
    this.who = who;
    this.voiceId = NPCS[who]?.voiceId || null;
    this.wordVoice = this.voiceId || NPCS.leo.voiceId;   // who reads single words and hints aloud
    this.isOpen = true;
    this.openedAt = performance.now();   // the E press that opened the talk should not skip the first line
    this.root.classList.add('open');
    clear(this.portraitBox).appendChild(portrait(who === 'narrator' ? 'player' : who, 84));
    this.nameplate.textContent = name || NPCS[who]?.name || '';
    this.heartsEl.textContent = hearts === null ? '' : this.heartString(hearts);
    this.setGoal('');
    this.hideTurn();
    this.hideCard();
    this.lineEl.textContent = '';
    this.transEl.style.display = 'none';
    this.toolsEl.style.display = 'none';
    this.history = [];
    sfx.open();
  }

  close() {
    if (!this.isOpen) return;
    this.session += 1;
    stopVoice();
    if (isRecording()) stopRecording().catch(() => {});
    clearInterval(this.typingTimer);
    this.typingTimer = null;
    this.isOpen = false;
    this.root.classList.remove('open');
    this.tip.style.display = 'none';
    this.translationPopup.hide();
    this.input.blur();
    this.closedAt = performance.now();   // so the same E press does not open a new talk
    this.finish(null);
    sfx.close();
  }

  heartString(n) {
    const full = Math.min(5, Math.ceil(n / 2));
    return '♥'.repeat(full) + '♡'.repeat(5 - full);
  }

  setHearts(n) {
    this.heartsEl.textContent = this.heartString(n);
    this.heartsEl.animate([{ transform: 'scale(1.5)' }, { transform: 'scale(1)' }], { duration: 400 });
  }

  setGoal(text) {
    this.goalPill.textContent = text ? `🎯 ${text}` : '';
    this.goalPill.style.display = text ? '' : 'none';
  }

  // ================= waiting for the player =================

  wait(kind) {
    this.finish(null);
    return new Promise((resolve) => {
      this.pending = { kind, resolve };
    });
  }

  finish(value) {
    const p = this.pending;
    this.pending = null;
    if (p) p.resolve(value);
  }

  setFoot(showNext) {
    this.footNext.style.visibility = showNext ? 'visible' : 'hidden';
  }

  // ================= villager lines =================

  // line = { text, help } : text in the learned language, help = translation
  async say({ text, help }, { voice = true } = {}) {
    if (!this.isOpen) return null;
    this.history.push({ who: 'npc', text });
    this.onHistory?.();
    this.showLine(text, help, voice);
    this.setFoot(true);
    const ok = await this.wait('continue');
    return ok;
  }

  // Narration in the help language (no voice, no translation)
  async narrate(text) {
    if (!this.isOpen) return null;
    clearInterval(this.typingTimer);
    this.typingTimer = null;
    this.lineEl.innerHTML = `<i>${escapeHtml(text)}</i>`;
    this.transEl.style.display = 'none';
    this.toolsEl.style.display = 'none';
    this.setFoot(true);
    return this.wait('continue');
  }

  showLine(text, help, voice = true) {
    this.translationPopup.hide();
    this.currentLine = text;
    this.transText.textContent = help || '';
    this.transEl.classList.remove('shown');
    this.transEl.style.display = help ? '' : 'none';
    this.toolsEl.style.display = voice && this.voiceId !== null ? '' : 'none';
    if (voice && this.voiceId) this.play(false);
    this.typeLine(text);
    this.markSeen(text);
  }

  play(slow) {
    if (!this.currentLine) return;
    this.portraitBox.classList.add('talking');
    speak(this.currentLine, { voiceId: this.voiceId, lang: store.state.learn, slow })
      .finally(() => this.portraitBox.classList.remove('talking'));
  }

  prefetchLine(text) {
    if (this.voiceId) prefetch(text, { voiceId: this.voiceId, lang: store.state.learn, slow: false });
  }

  typeLine(text) {
    clearInterval(this.typingTimer);
    let i = 0;
    this.lineEl.textContent = '';
    this.typingTimer = setInterval(() => {
      i += 1;
      this.lineEl.textContent = text.slice(0, i);
      if (i % 3 === 0) sfx.blip();
      if (i >= text.length) this.finishTyping();
    }, TYPE_SPEED);
  }

  finishTyping() {
    clearInterval(this.typingTimer);
    this.typingTimer = null;
    this.lineEl.innerHTML = this.glossed(this.currentLine);
  }

  // Words are separate hover targets; spaces and punctuation stay plain text.
  glossed(text) {
    const lang = store.state.learn;
    const known = new Map();
    Object.entries(WORDS).forEach(([id, word]) => {
      if (this.holdBack.has(id)) return;
      (word.forms[lang] || []).forEach((form) => {
        if (!/\s/.test(form)) known.set(form.toLocaleLowerCase(lang), id);
      });
    });
    const tokens = /[\p{L}\p{M}]+(?:['\u2019-][\p{L}\p{M}]+)*/gu;
    let html = '', pos = 0;
    for (const match of text.matchAll(tokens)) {
      const word = match[0];
      const id = known.get(word.toLocaleLowerCase(lang));
      html += escapeHtml(text.slice(pos, match.index));
      html += `<span class="dlg-word${id ? ' gloss' : ''}" tabindex="0"${id ? ` data-word="${id}"` : ''}>${escapeHtml(word)}</span>`;
      pos = match.index + word.length;
    }
    return html + escapeHtml(text.slice(pos));
  }

  markSeen(text) {
    const lang = store.state.learn;
    const lower = text.toLocaleLowerCase(lang);
    Object.entries(WORDS).forEach(([id, w]) => {
      if (this.holdBack.has(id)) return;
      if ((w.forms[lang] || []).some((f) => lower.includes(f.toLocaleLowerCase(lang)))) garden.see(id);
    });
  }

  revealTranslation() {
    if (this.transEl.style.display === 'none' || this.transEl.classList.contains('shown')) return;
    this.transEl.classList.add('shown');
    store.state.stats.reveals += 1;
    store.save();
    sfx.click();
  }

  // ================= guess first =================

  async discover(wordId) {
    if (!this.isOpen) return null;
    const s = store.state;
    const word = WORDS[wordId];
    const others = shuffle(Object.keys(WORDS).filter((id) => id !== wordId), wordId.length * 7).slice(0, 2);
    const options = shuffle([wordId, ...others], wordId.length * 13);
    this.hideTurn();
    const opts = el('div', 'options');
    const reveal = el('div', 'reveal');
    const target = el('span', 'target', word.text[s.learn]);
    this.showCard([el('h3', '', [`🌱 ${t('discoverTitle')}`, target]), opts, reveal]);
    this.setFoot(false);
    sfx.chime();

    const pick = await new Promise((resolve) => {
      options.forEach((id, i) => {
        const b = el('button', 'option', [el('span', 'big', WORDS[id].icon), WORDS[id].text[s.help], el('div', 'k', `${i + 1}`)]);
        b.onclick = () => resolve(id);
        b.dataset.key = String(i + 1);
        opts.appendChild(b);
      });
      this.cardKeys = (n) => { if (options[n - 1]) resolve(options[n - 1]); };
      this.pending = { kind: 'card', resolve: () => resolve(null) };
    });
    this.cardKeys = null;
    this.pending = null;
    if (pick === null) return null;

    const right = pick === wordId;
    [...opts.children].forEach((b, i) => {
      b.disabled = true;
      if (options[i] === wordId) b.classList.add('right');
      else if (options[i] === pick) b.classList.add('wrong');
      else b.classList.add('dim');
    });
    s.stats.guesses += 1;
    if (right) s.stats.guessesRight += 1;
    store.save();
    if (right) sfx.good(); else sfx.soft();
    garden.see(wordId);
    const listen = el('button', 'btn small paper', '🔊');
    listen.onclick = () => speak(word.text[s.learn], { voiceId: this.wordVoice, lang: s.learn });
    reveal.append(
      el('span', '', right ? `✅ ${t('discoverRight')}` : `💡 ${t('discoverWrong')}`),
      el('b', '', `${word.icon} ${word.text[s.learn]} = ${word.text[s.help]}`),
      listen,
      el('span', 'planted', `🌱 ${t('planted')}`),
    );
    speak(word.text[s.learn], { voiceId: this.wordVoice, lang: s.learn });
    this.setFoot(true);
    const ok = await this.wait('continue');
    this.hideCard();
    return ok === null ? null : { right };
  }

  // ================= the player's turn =================
  //   spec = { goal, model, modelHelp, words, stepId, onAttempt(said, spoken, hintLevel) -> feedback }
  // Resolves { stars, spoken, said, fb, hintLevel } when the goal is reached.

  async task(spec) {
    if (!this.isOpen) return null;
    this.spec = spec;
    this.mode = 'task';
    this.hintLevel = 0;
    this.attempts = 0;
    this.busy = false;
    this.setGoal(spec.goal);
    this.turnTitle.textContent = spec.goal;
    this.renderStars();
    this.hint1Btn.style.display = '';
    this.hint2Btn.style.display = '';
    this.hint1Btn.disabled = false;
    this.hint2Btn.disabled = true;
    clear(this.hintBox).classList.remove('open');
    clear(this.modelBox).classList.remove('open');
    this.saidEl.classList.remove('open');
    this.coachEl.classList.remove('open');
    this.showTurn();
    this.setFoot(false);
    if (spec.model) prefetch(spec.model, { voiceId: this.wordVoice, lang: store.state.learn });
    return this.wait('task');
  }

  // Free conversation after the quests: say anything, E to leave
  async chat(spec) {
    if (!this.isOpen) return null;
    this.spec = spec;
    this.mode = 'chat';
    this.busy = false;
    this.setGoal('');
    const words = { npc: this.nameplate.textContent, lang: langName(store.state.learn) };
    this.turnTitle.textContent = t(spec.afterQuest ? 'chatPromptAfter' : 'chatPrompt', words);
    this.starsLive.textContent = '';
    this.hint1Btn.style.display = 'none';
    this.hint2Btn.style.display = 'none';
    clear(this.hintBox).classList.remove('open');
    clear(this.modelBox).classList.remove('open');
    this.saidEl.classList.remove('open');
    this.coachEl.classList.remove('open');
    // Ideas for beginners: tap one to hear it, then say it (or press Send)
    if (spec.ideas && spec.ideas.length) {
      this.hintBox.appendChild(el('span', 'lbl', `💡 ${t('ideas')}:`));
      spec.ideas.forEach((idea) => {
        const chip = el('span', 'chip', [`${idea.icon} ${idea.text}`, el('span', 'meaning', idea.help)]);
        chip.onclick = () => {
          this.input.value = idea.text;
          speak(idea.text, { voiceId: this.wordVoice, lang: store.state.learn, slow: true });
        };
        this.hintBox.appendChild(chip);
      });
      this.hintBox.classList.add('open');
    }
    this.showTurn();
    this.setFoot(true);
    return this.wait('chat');
  }

  showTurn() {
    this.turnEl.classList.add('open');
    this.setMic('idle');
    this.input.value = '';
    if (speechMode() === 'none') this.micBtn.style.display = 'none';
    else this.micBtn.style.display = '';
  }

  hideTurn() {
    this.turnEl.classList.remove('open');
    this.mode = null;
  }

  stars() {
    return Math.max(1, 3 - this.hintLevel);
  }

  renderStars() {
    const n = this.stars();
    this.starsLive.innerHTML = '★'.repeat(n) + `<span class="lost">${'★'.repeat(3 - n)}</span>`;
  }

  showHint(level) {
    const s = store.state;
    const spec = this.spec;
    if (!spec || this.mode !== 'task' || level <= this.hintLevel) return;
    if (level >= 1 && !this.hintBox.classList.contains('open')) {
      clear(this.hintBox);
      this.hintBox.appendChild(el('span', 'lbl', `💡 ${t('hint1')}:`));
      spec.words.forEach((id) => {
        const w = WORDS[id];
        const chip = el('span', 'chip', [`${w.icon} ${w.text[s.learn]}`, el('span', 'meaning', w.text[s.help])]);
        chip.dataset.word = id;
        chip.onclick = () => speak(w.text[s.learn], { voiceId: this.wordVoice, lang: s.learn });
        this.hintBox.appendChild(chip);
        garden.helped(id);
      });
      this.hintBox.classList.add('open');
      this.hint1Btn.disabled = true;
      this.hint2Btn.disabled = false;
    }
    if (level >= 2 && !this.modelBox.classList.contains('open')) {
      clear(this.modelBox);
      const listen = el('button', 'btn small paper', '🔊');
      const slow = el('button', 'btn small paper', '🐢');
      listen.onclick = () => speak(spec.model, { voiceId: this.wordVoice, lang: s.learn });
      slow.onclick = () => speak(spec.model, { voiceId: this.wordVoice, lang: s.learn, slow: true });
      this.modelBox.append(el('span', '', `📜 ${spec.model}`), listen, slow, el('span', 'meaning', spec.modelHelp || ''));
      this.modelBox.classList.add('open');
      this.hint2Btn.disabled = true;
      this.hint1Btn.disabled = true;
      speak(spec.model, { voiceId: this.wordVoice, lang: s.learn, slow: true });
    }
    s.stats.hints += level - this.hintLevel;
    store.save();
    this.hintLevel = level;
    this.renderStars();
    sfx.click();
  }

  setMic(state) {
    const labels = { idle: t('holdToSpeak'), listening: t('listening'), thinking: t('thinking') };
    this.micBtn.className = `mic ${state === 'idle' ? '' : state}`;
    this.micBtn.querySelector('.lbl').textContent = labels[state];
  }

  async startListening() {
    if (!this.isTurn() || this.busy || isRecording()) return;
    stopVoice();   // don't record the villager's own voice
    try {
      await startRecording(store.state.learn);
      this.setMic('listening');
      sfx.recStart();
    } catch (err) {
      console.warn(err);
      this.showSaid(null, t('micBlocked'));
    }
  }

  async stopListening() {
    if (!isRecording()) return;
    this.busy = true;
    this.setMic('thinking');
    sfx.recStop();
    let said = '';
    try {
      said = (await stopRecording()).trim();
    } catch (err) {
      console.warn(err);
      this.busy = false;
      this.setMic('idle');
      this.showSaid(null, t('sttFailed'));
      return;
    }
    this.busy = false;
    this.setMic('idle');
    if (!this.isTurn()) return;
    if (!said) {
      this.showSaid(null, t('notHeard'));
      return;
    }
    this.attempt(said, true);
  }

  isTurn() {
    return this.isOpen && (this.mode === 'task' || this.mode === 'chat');
  }

  sendTyped() {
    const said = this.input.value.trim();
    if (!said || !this.isTurn() || this.busy) return;
    this.input.value = '';
    this.input.blur();   // so SPACE works for speaking again
    this.attempt(said, false);
  }

  async attempt(said, spoken) {
    const spec = this.spec;
    const session = this.session;
    this.busy = true;
    this.setMic('thinking');
    this.history.push({ who: 'player', text: said });
    this.onHistory?.();
    this.showSaid(said, null, spoken);
    let fb;
    try {
      fb = await spec.onAttempt(said, spoken, { hintLevel: this.hintLevel || 0, attempts: this.attempts || 0 });
    } finally {
      if (session === this.session) {
        this.busy = false;
        this.setMic('idle');
      }
    }
    if (session !== this.session || !this.isTurn() || !fb) return;
    this.showSaid(said, null, spoken, fb.used || []);

    if (this.mode === 'chat') {
      if (fb.reply) {
        this.history.push({ who: 'npc', text: fb.reply });
        this.onHistory?.();
        this.showLine(fb.reply, fb.replyHelp);
      }
      this.showCoach(null, fb.better, fb.betterHelp);
      return;
    }

    if (fb.goalDone) {
      sfx.success();
      const result = { stars: this.stars(), spoken, said, fb, hintLevel: this.hintLevel };
      this.hideTurn();
      this.finish(result);
      return;
    }

    // Not yet: the villager answers, then a nudge that lets the player fix it (prompt before model)
    this.attempts += 1;
    sfx.soft();
    if (fb.reply) {
      this.history.push({ who: 'npc', text: fb.reply });
      this.onHistory?.();
      this.showLine(fb.reply, fb.replyHelp);
    }
    this.showCoach(fb.nudge, fb.better, fb.betterHelp);
    if (this.attempts >= 2 && this.hintLevel < 1) this.showHint(1);
    if (this.attempts >= 3 && this.hintLevel < 2) this.showHint(2);
  }

  showSaid(said, warning, spoken = true, used = []) {
    clear(this.saidEl);
    if (warning) {
      this.saidEl.append(el('span', '', `⚠️ ${warning}`));
    } else {
      const label = spoken ? `🎤 ${t('youSaid')}:` : `⌨️ ${t('youTyped')}:`;
      this.saidEl.append(label, ' ', el('q', '', said));
      if (used.length) {
        const s = store.state;
        this.saidEl.append('  ', el('span', '', `· ${t('heard')}: `));
        used.forEach((id) => this.saidEl.append(el('span', 'w-ok', `✓ ${WORDS[id].text[s.learn]}`), ' '));
      }
      // light up the hint chips that were used
      [...this.hintBox.querySelectorAll('.chip')].forEach((c) => c.classList.toggle('used', used.includes(c.dataset.word)));
    }
    this.saidEl.classList.add('open');
  }

  showCoach(nudge, better, betterHelp) {
    clear(this.coachEl);
    if (!nudge && !better) {
      this.coachEl.classList.remove('open');
      return;
    }
    const body = el('div');
    if (nudge) body.append(el('div', '', nudge));
    if (better) {
      const listen = el('button', 'btn small paper', '🔊');
      listen.onclick = () => speak(better, { voiceId: this.wordVoice, lang: store.state.learn });
      body.append(el('div', 'bt', `✨ ${t('betterSay')}:`), el('span', 'better', [better, ' ', listen]));
      if (betterHelp) body.append(el('div', 'bt', betterHelp));
    }
    this.coachEl.append(el('span', 'ic', nudge ? '💬' : '✨'), body);
    this.coachEl.classList.add('open');
  }

  // ================= cards: question, choice, result =================

  showCard(children) {
    clear(this.card);
    children.forEach((c) => c && this.card.appendChild(c));
    this.card.classList.add('open');
  }

  hideCard() {
    this.card.classList.remove('open');
    clear(this.card);
    this.cardKeys = null;
  }

  async question(q) {
    if (!this.isOpen) return null;
    const opts = el('div', 'options');
    const msg = el('div', 'reveal');
    this.showCard([el('h3', '', `🧠 ${t('questionTitle')} ${q.ask}`), opts, msg]);
    this.setFoot(false);
    const answer = await new Promise((resolve) => {
      const tryPick = (i, b) => {
        if (q.options[i].correct) {
          b.classList.add('right');
          sfx.good();
          resolve(true);
        } else {
          b.classList.add('wrong');
          sfx.soft();
          msg.textContent = `👂 ${t('listenAgain')}`;
          this.play(true);
          setTimeout(() => b.classList.remove('wrong'), 400);
        }
      };
      q.options.forEach((o, i) => {
        const b = el('button', 'option', [el('span', 'big', o.icon), o.text, el('div', 'k', `${i + 1}`)]);
        b.onclick = () => tryPick(i, b);
        opts.appendChild(b);
      });
      this.cardKeys = (n) => { if (opts.children[n - 1]) tryPick(n - 1, opts.children[n - 1]); };
      this.pending = { kind: 'card', resolve: () => resolve(null) };
    });
    this.pending = null;
    if (answer === null) return null;
    msg.textContent = `✅ ${t('correct')}`;
    await new Promise((r) => setTimeout(r, 700));
    this.hideCard();
    return true;
  }

  async choose(options, title = t('choose')) {
    if (!this.isOpen) return null;
    const opts = el('div', 'options');
    this.showCard([el('h3', '', `🤔 ${title}`), opts]);
    this.setFoot(false);
    const pick = await new Promise((resolve) => {
      options.forEach((o, i) => {
        const b = el('button', `option${o.disabled ? ' disabled' : ''}`, [el('span', 'big', o.icon), o.text, el('div', 'k', o.disabled ? o.disabledText || '' : `${i + 1}`)]);
        if (!o.disabled) b.onclick = () => resolve(o.id);
        opts.appendChild(b);
      });
      this.cardKeys = (n) => { const o = options[n - 1]; if (o && !o.disabled) resolve(o.id); };
      this.pending = { kind: 'card', resolve: () => resolve(null) };
    });
    this.pending = null;
    this.hideCard();
    if (pick) sfx.click();
    return pick;
  }

  //   summary = { stars, xp, spoken, hintLevel, grew: [{id, from, to}], hearts: [{npc, amount}], better, betterHelp }
  async result(summary) {
    if (!this.isOpen) return null;
    const s = store.state;
    const starsEl = el('div', 'stars', [el('span', '', '⭐'), el('span', '', '⭐'), el('span', '', '⭐')]);
    const rows = el('div', 'rows');
    const pills = [el('span', 'pill xp', `+${summary.xp} XP`)];
    if (summary.spoken) pills.push(el('span', 'pill', `🎤 ${t('voiceBonus')}`));
    if (summary.hintLevel === 0) pills.push(el('span', 'pill', `🏅 ${t('noHints')}`));
    (summary.grew || []).forEach((g) => {
      if (g.to > g.from) pills.push(el('span', 'pill', `${STAGE_ICONS[Math.max(1, g.from)]}→${STAGE_ICONS[g.to]} ${WORDS[g.id].text[s.learn]}`));
    });
    (summary.hearts || []).forEach((h) => {
      if (NPCS[h.npc]) pills.push(el('span', 'pill', `♥ ${t('likesYou', { npc: NPCS[h.npc].name })}`));
    });
    pills.forEach((p, i) => { p.style.animationDelay = `${0.5 + i * 0.12}s`; rows.appendChild(p); });
    const parts = [starsEl, el('div', 'rtitle', `${t('resultTitle')}${summary.praise ? ` ${summary.praise}` : ''}`), rows];
    if (summary.better) {
      const listen = el('button', 'btn small paper', '🔊');
      listen.onclick = () => speak(summary.better, { voiceId: this.wordVoice, lang: s.learn });
      parts.push(el('div', 'coach open', [el('span', 'ic', '✨'), el('div', '', [
        el('div', 'bt', `${t('betterSay')}:`), el('span', 'better', [summary.better, ' ', listen]),
        summary.betterHelp ? el('div', 'bt', summary.betterHelp) : null,
      ])]));
    }
    this.showCard([el('div', 'result', parts)]);
    [...starsEl.children].forEach((star, i) => {
      if (i < summary.stars) setTimeout(() => { star.classList.add('on'); sfx.star(i); }, 250 + i * 220);
    });
    this.setFoot(true);
    const ok = await this.wait('continue');
    this.hideCard();
    return ok;
  }

  // ================= input =================

  bindEvents() {
    this.replayBtn.onclick = () => this.play(false);
    this.slowBtn.onclick = () => this.play(true);
    this.transEl.onclick = () => this.revealTranslation();
    this.hint1Btn.onclick = () => this.showHint(1);
    this.hint2Btn.onclick = () => this.showHint(2);
    this.sendBtn.onclick = () => this.sendTyped();
    this.input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') this.sendTyped();
      if (e.key === 'Escape') this.input.blur();
    });
    this.input.addEventListener('keyup', (e) => e.stopPropagation());

    const down = (e) => { e.preventDefault(); this.startListening(); };
    const up = (e) => { e.preventDefault(); this.stopListening(); };
    this.micBtn.addEventListener('mousedown', down);
    this.micBtn.addEventListener('mouseup', up);
    this.micBtn.addEventListener('mouseleave', () => { if (isRecording()) this.stopListening(); });
    this.micBtn.addEventListener('touchstart', down, { passive: false });
    this.micBtn.addEventListener('touchend', up, { passive: false });

    this.lineEl.addEventListener('click', () => this.advance());

    window.addEventListener('keydown', (e) => {
      if (!this.isOpen || typing() || performance.now() - this.openedAt < 120) return;
      if (e.code === 'Escape') {
        e.preventDefault();
        this.close();
      } else if (e.code === 'Space') {
        if (this.isTurn()) {
          e.preventDefault();
          if (!e.repeat) this.startListening();
        }
      } else if (e.code === 'KeyE' || e.code === 'Enter') {
        if (!e.repeat) this.advance();
      } else if (e.code === 'KeyT') {
        this.revealTranslation();
      } else if (this.cardKeys && /^Digit[1-9]$/.test(e.code)) {
        this.cardKeys(Number(e.code.slice(5)));
      }
    });
    window.addEventListener('keyup', (e) => {
      if (!this.isOpen) return;
      if (e.code === 'Space' && isRecording()) {
        e.preventDefault();
        this.stopListening();
      }
    });
  }

  // E: finish the typing effect, or go on
  advance() {
    if (this.typingTimer) {
      this.finishTyping();
      return;
    }
    if (!this.pending) return;
    if (this.pending.kind === 'continue') {
      sfx.click();
      this.finish(true);
    } else if (this.pending.kind === 'chat' && !this.busy) {
      this.hideTurn();
      this.finish(true);
    }
  }
}
