// DialogueBox.js
// The conversation box at the bottom of the screen (plain HTML on top of the game canvas).
//
// A conversation has three steps:
//   1. intro  The NPC says its opening lines. Press E to continue.
//   2. talk   The NPC asks a question. The player holds SPACE and answers out loud.
//             Gemini checks if the GOAL is reached. Stuck? "Need an idea?" shows example answers.
//   3. done   The goal is reached. The NPC answers, the player earns a star. Press E to leave.
// ESC leaves the conversation at any time.

import { speak, stopVoice } from '../audio/voice';
import { startRecording, stopRecording, isRecording } from '../audio/mic';
import { getFeedback } from '../audio/feedback';

const COLORS = {
  paper: '#f6e7c8',
  ink: '#3a2414',
  wood: '#5a3a22',
  red: '#b23a2a',
  green: '#c8e6a0',
};

// Small helper: create an element with styles in one line
function el(tag, style = {}, text = '') {
  const node = document.createElement(tag);
  Object.assign(node.style, style);
  if (text) node.textContent = text;
  return node;
}

export default class DialogueBox {
  constructor(stars) {
    this.stars = stars;       // StarCounter, can be null
    this.isOpen = false;
    this.mode = null;         // 'intro' | 'talk' | 'done'
    this.typing = null;

    // ---------- layout ----------
    this.root = el('div', {
      position: 'fixed', left: '50%', bottom: '24px', transform: 'translateX(-50%)',
      width: 'min(720px, calc(100vw - 32px))', boxSizing: 'border-box',
      background: COLORS.paper, border: `4px solid ${COLORS.wood}`, borderRadius: '10px',
      boxShadow: `0 6px 0 ${COLORS.ink}`, padding: '14px 18px 12px',
      fontFamily: '"Courier New", monospace', color: COLORS.ink,
      display: 'none', zIndex: 10,
    });

    const header = el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' });
    this.nameTag = el('div', {
      background: COLORS.wood, color: COLORS.paper, padding: '2px 10px',
      borderRadius: '6px', fontWeight: 'bold', fontSize: '14px',
    });
    this.goalEl = el('div', { fontSize: '13px', fontWeight: 'bold' });
    header.append(this.nameTag, this.goalEl);

    this.text = el('div', { fontSize: '18px', lineHeight: '1.5', minHeight: '54px' });

    // Row with the mic button and the "Need an idea?" button
    this.actions = el('div', { display: 'none', gap: '8px', marginTop: '10px', flexWrap: 'wrap' });
    this.micBtn = el('button', this.buttonStyle(COLORS.wood, COLORS.paper));
    this.hintBtn = el('button', this.buttonStyle('#fffaf0', COLORS.ink, '#b08a5a'), '💡 Need an idea?');
    this.actions.append(this.micBtn, this.hintBtn);

    // Example answers (hidden until the player asks for help)
    this.hintsEl = el('div', { display: 'none', flexDirection: 'column', gap: '6px', marginTop: '10px' });

    this.saidEl = el('div', { fontSize: '14px', marginTop: '8px', minHeight: '18px', fontStyle: 'italic' });
    this.tipEl = el('div', {
      fontSize: '14px', marginTop: '6px', padding: '6px 10px', borderRadius: '6px',
      background: '#fff4c2', border: '2px dashed #d9b44a', display: 'none',
    });
    this.footer = el('div', { textAlign: 'right', fontSize: '12px', opacity: '0.6', marginTop: '6px' });

    this.root.append(header, this.text, this.actions, this.hintsEl, this.saidEl, this.tipEl, this.footer);
    document.body.appendChild(this.root);

    // ---------- input ----------
    this.setMicLabel('idle');
    this.micBtn.addEventListener('mousedown', () => this.startListening());
    this.micBtn.addEventListener('mouseup', () => this.stopListening());
    this.micBtn.addEventListener('mouseleave', () => { if (isRecording()) this.stopListening(); });
    this.hintBtn.addEventListener('click', () => this.showHints());

    this.onKeyDown = (e) => {
      if (!this.isOpen) return;
      if (e.code === 'Escape') {
        this.close();
      } else if (e.code === 'Space' && this.mode === 'talk') {
        e.preventDefault();
        if (!e.repeat) this.startListening();
      } else if (this.mode === 'talk' && this.hintsVisible) {
        const n = Number(e.key);
        if (n >= 1 && n <= this.npc.hints.length) this.useHint(this.npc.hints[n - 1]);
      }
    };
    this.onKeyUp = (e) => {
      if (this.isOpen && e.code === 'Space') {
        e.preventDefault();
        this.stopListening();
      }
    };
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  buttonStyle(bg, color, border) {
    return {
      fontFamily: 'inherit', fontSize: '15px', cursor: 'pointer', userSelect: 'none',
      background: bg, color, border: border ? `2px solid ${border}` : 'none',
      borderRadius: '6px', padding: '8px 12px',
    };
  }

  // ================= opening and closing =================

  open(npc, onClose) {
    this.npc = npc;
    this.onClose = onClose;
    this.isOpen = true;
    this.history = [];          // [{ who: 'npc' | 'child', text }], sent to Gemini
    this.attempts = 0;
    this.index = 0;

    this.nameTag.textContent = npc.name;
    this.renderGoal();
    this.root.style.display = 'block';
    this.setMode('intro');
    this.showLine(npc.dialogue[0].say);
  }

  close() {
    if (!this.isOpen) return;
    stopVoice();
    if (isRecording()) stopRecording().catch(() => {});
    clearInterval(this.typing);
    this.typing = null;
    this.isOpen = false;
    this.mode = null;
    this.root.style.display = 'none';
    if (this.onClose) this.onClose();
  }

  // Called by TownScene when the player presses E
  next() {
    if (this.typing) {                // first press finishes the typing effect
      this.finishTyping();
      return;
    }
    if (this.mode === 'done') {
      this.close();
      return;
    }
    if (this.mode !== 'intro') return; // in talk mode the player answers with SPACE
    this.index += 1;
    this.showLine(this.npc.dialogue[this.index].say);
  }

  // ================= what is on screen =================

  setMode(mode) {
    this.mode = mode;
    const talking = mode === 'talk';
    this.actions.style.display = talking ? 'flex' : 'none';
    this.hintBtn.style.display = talking && !this.hintsVisible ? 'inline-block' : 'none';
    if (!talking) this.hideHints();

    const footers = {
      intro: 'E ▶   ·   ESC to leave',
      talk: 'Hold SPACE and speak   ·   ESC to leave',
      done: 'E to finish',
    };
    this.footer.textContent = footers[mode] || '';
  }

  renderGoal() {
    const done = this.stars && this.stars.has(this.npc.id);
    this.goalEl.textContent = done ? `✅ ${this.npc.goal}` : `🎯 Goal: ${this.npc.goal}`;
  }

  // An NPC line with the typing effect. The last intro line switches to talk mode.
  showLine(text) {
    this.saidEl.textContent = '';
    this.tipEl.style.display = 'none';
    this.history.push({ who: 'npc', text });
    speak(text, this.npc.voiceId);
    this.typeText(text, () => {
      const isQuestion = this.mode === 'intro' && this.index === this.npc.dialogue.length - 1;
      if (isQuestion) this.setMode('talk');
    });
  }

  // The NPC answers during talk mode (no typing effect, keeps hints and messages)
  npcSays(text) {
    clearInterval(this.typing);
    this.typing = null;
    this.text.textContent = text;
    this.history.push({ who: 'npc', text });
    speak(text, this.npc.voiceId);
  }

  typeText(full, done) {
    clearInterval(this.typing);
    this.fullText = full;
    this.afterTyping = done;
    this.text.textContent = '';
    let i = 0;
    this.typing = setInterval(() => {
      i += 1;
      this.text.textContent = full.slice(0, i);
      if (i >= full.length) this.finishTyping();
    }, 28);
  }

  finishTyping() {
    clearInterval(this.typing);
    this.typing = null;
    this.text.textContent = this.fullText;
    const done = this.afterTyping;
    this.afterTyping = null;
    if (done) done();
  }

  showTip(tip) {
    if (tip) {
      this.tipEl.textContent = `💡 You can also say: "${tip}"`;
      this.tipEl.style.display = 'block';
    } else {
      this.tipEl.style.display = 'none';
    }
  }

  // ================= hints =================

  showHints() {
    this.hintsVisible = true;
    this.hintBtn.style.display = 'none';
    this.hintsEl.innerHTML = '';
    this.hintsEl.style.display = 'flex';
    const title = el('div', { fontSize: '13px', opacity: '0.75' }, 'Try saying one of these out loud:');
    this.hintsEl.appendChild(title);
    this.npc.hints.forEach((hint, i) => {
      const btn = el('button', {
        ...this.buttonStyle('#fffaf0', COLORS.ink, '#b08a5a'), textAlign: 'left', fontSize: '16px', padding: '6px 10px',
      }, `${i + 1}. ${hint.text}`);
      btn.onmouseenter = () => { btn.style.background = '#ffe9b8'; };
      btn.onmouseleave = () => { btn.style.background = '#fffaf0'; };
      btn.onclick = () => this.useHint(hint);
      this.hintsEl.appendChild(btn);
    });
  }

  hideHints() {
    this.hintsVisible = false;
    this.hintsEl.style.display = 'none';
  }

  // Clicking a hint finishes the conversation, but only speaking earns a star
  useHint(hint) {
    if (this.mode !== 'talk' || this.busy) return;
    this.history.push({ who: 'child', text: hint.text });
    this.saidEl.textContent = `You chose: "${hint.text}"`;
    this.finish(hint.reply, { spoken: false });
  }

  // ================= microphone =================

  setMicLabel(state) {
    const labels = {
      idle: '🎤 Hold SPACE to speak',
      listening: '🔴 Listening... let go to send',
      thinking: '⏳ Thinking...',
    };
    this.micBtn.textContent = labels[state];
    this.micBtn.style.background = state === 'listening' ? COLORS.red : COLORS.wood;
  }

  async startListening() {
    if (this.mode !== 'talk' || this.busy || isRecording()) return;
    stopVoice();                       // don't record the NPC's own voice
    try {
      await startRecording();
      this.setMicLabel('listening');
      this.saidEl.textContent = '';
    } catch (err) {
      console.warn(err);
      this.saidEl.textContent = 'The microphone is blocked. Allow it in the browser, or tap "Need an idea?".';
    }
  }

  async stopListening() {
    if (!isRecording()) return;
    this.busy = true;
    this.setMicLabel('thinking');
    try {
      const said = (await stopRecording()).trim();
      if (this.mode !== 'talk') return;           // the player left meanwhile
      if (!said) {
        this.saidEl.textContent = "I didn't hear anything. Hold SPACE a bit longer and try again!";
        return;
      }

      this.saidEl.textContent = `You said: "${said}"`;
      const fb = await getFeedback({ npc: this.npc, history: this.history, said });
      if (this.mode !== 'talk') return;
      this.history.push({ who: 'child', text: said });
      this.showTip(fb.tip);

      if (fb.goalDone) {
        this.saidEl.textContent = `You said: "${said}" ✅ ${fb.praise || ''}`;
        this.finish(fb.reply, { spoken: true });
      } else {
        this.attempts += 1;
        this.npcSays(fb.reply);
        // After two tries, offer the example answers automatically
        if (this.attempts >= 2 && !this.hintsVisible) this.showHints();
      }
    } catch (err) {
      console.warn(err);
      this.saidEl.textContent = 'Could not understand. Is the voice server running?';
    } finally {
      this.busy = false;
      this.setMicLabel('idle');
    }
  }

  // ================= goal reached =================

  finish(reply, { spoken }) {
    const newStar = spoken && this.stars ? this.stars.add(this.npc.id) : false;
    this.renderGoal();
    this.setMode('done');
    this.npcSays(reply);
    if (newStar) {
      this.footer.textContent = '⭐ +1 star!   ·   E to finish';
    } else if (!spoken && !(this.stars && this.stars.has(this.npc.id))) {
      this.footer.textContent = 'Say it out loud next time to earn a ⭐   ·   E to finish';
    }
  }

  destroy() {
    this.close();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.root.remove();
  }
}
