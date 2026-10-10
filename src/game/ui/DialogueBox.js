// DialogueBox.js
// A simple HTML dialogue box drawn on top of the game canvas.
// HTML is easier than Phaser text for crisp fonts, wrapping and clickable buttons.
// Every line is also spoken out loud with the NPC's ElevenLabs voice.
// The player can answer by clicking, pressing 1-3, or holding SPACE and speaking.

import { speak, stopVoice } from '../audio/voice';
import { startRecording, stopRecording, isRecording, bestChoice } from '../audio/mic';

export default class DialogueBox {
  constructor() {
    this.isOpen = false;
    this.lines = [];
    this.index = 0;
    this.typing = null;
    this.onClose = null;

    this.root = document.createElement('div');
    Object.assign(this.root.style, {
      position: 'fixed', left: '50%', bottom: '24px', transform: 'translateX(-50%)',
      width: 'min(720px, calc(100vw - 32px))', boxSizing: 'border-box',
      background: '#f6e7c8', border: '4px solid #5a3a22', borderRadius: '10px',
      boxShadow: '0 6px 0 #3a2414', padding: '14px 18px 16px',
      fontFamily: '"Courier New", monospace', color: '#3a2414',
      display: 'none', zIndex: 10,
    });

    this.nameTag = document.createElement('div');
    Object.assign(this.nameTag.style, {
      display: 'inline-block', background: '#5a3a22', color: '#f6e7c8',
      padding: '2px 10px', borderRadius: '6px', fontWeight: 'bold',
      fontSize: '14px', marginBottom: '8px',
    });

    this.text = document.createElement('div');
    Object.assign(this.text.style, { fontSize: '18px', lineHeight: '1.5', minHeight: '54px' });

    this.choicesEl = document.createElement('div');
    Object.assign(this.choicesEl.style, { display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' });

    // "You said: ..." line under the choices
    this.saidEl = document.createElement('div');
    Object.assign(this.saidEl.style, { fontSize: '14px', marginTop: '8px', minHeight: '18px', fontStyle: 'italic' });

    // Microphone button (hold to talk)
    this.micBtn = document.createElement('button');
    Object.assign(this.micBtn.style, {
      marginTop: '10px', fontFamily: 'inherit', fontSize: '15px', cursor: 'pointer',
      background: '#5a3a22', color: '#f6e7c8', border: 'none', borderRadius: '6px',
      padding: '8px 12px', display: 'none', userSelect: 'none',
    });
    this.setMicLabel('idle');
    this.micBtn.addEventListener('mousedown', () => this.startListening());
    this.micBtn.addEventListener('mouseup', () => this.stopListening());
    this.micBtn.addEventListener('mouseleave', () => { if (isRecording()) this.stopListening(); });

    this.hint = document.createElement('div');
    Object.assign(this.hint.style, { textAlign: 'right', fontSize: '12px', opacity: '0.6', marginTop: '6px' });

    this.root.append(this.nameTag, this.text, this.choicesEl, this.micBtn, this.saidEl, this.hint);
    document.body.appendChild(this.root);

    // Number keys pick a choice
    this.keyHandler = (e) => {
      const n = Number(e.key);
      if (this.isOpen && this.currentChoices && n >= 1 && n <= this.currentChoices.length) {
        this.pick(this.currentChoices[n - 1]);
      }
    };
    window.addEventListener('keydown', this.keyHandler);

    // Hold SPACE to talk, release to send
    this.spaceDown = (e) => {
      if (e.code !== 'Space' || !this.isOpen || !this.currentChoices) return;
      e.preventDefault();
      if (!e.repeat) this.startListening();
    };
    this.spaceUp = (e) => {
      if (e.code !== 'Space' || !this.isOpen) return;
      e.preventDefault();
      this.stopListening();
    };
    window.addEventListener('keydown', this.spaceDown);
    window.addEventListener('keyup', this.spaceUp);
  }

  setMicLabel(state) {
    const labels = {
      idle: '🎤 Hold SPACE (or this button) and say your answer',
      listening: '🔴 Listening... release to send',
      thinking: '⏳ Understanding...',
    };
    this.micBtn.textContent = labels[state];
    this.micBtn.style.background = state === 'listening' ? '#b23a2a' : '#5a3a22';
  }

  async startListening() {
    if (!this.currentChoices || this.busy || isRecording()) return;
    stopVoice();                       // don't record the NPC's own voice
    try {
      await startRecording();
      this.setMicLabel('listening');
      this.saidEl.textContent = '';
    } catch (err) {
      console.warn(err);
      this.saidEl.textContent = 'Microphone is blocked. Allow it in the browser, or pick an answer.';
    }
  }

  async stopListening() {
    if (!isRecording()) return;
    this.busy = true;
    this.setMicLabel('thinking');
    try {
      const said = (await stopRecording()).trim();
      if (!this.currentChoices) return;            // dialogue moved on meanwhile
      if (!said) {
        this.saidEl.textContent = "I didn't hear anything. Try again!";
        return;
      }
      const match = bestChoice(said, this.currentChoices);
      if (match) {
        this.saidEl.textContent = `You said: "${said}" ✅`;
        this.highlight(match.choice);
        setTimeout(() => this.pick(match.choice), 700);
      } else {
        this.saidEl.textContent = `You said: "${said}". Hmm, try one of the answers above.`;
      }
    } catch (err) {
      console.warn(err);
      this.saidEl.textContent = 'Could not understand. Is the voice server running?';
    } finally {
      this.busy = false;
      this.setMicLabel('idle');
    }
  }

  highlight(choice) {
    const i = this.currentChoices.indexOf(choice);
    const btn = this.choicesEl.children[i];
    if (btn) {
      btn.style.background = '#c8e6a0';
      btn.style.borderColor = '#5a8a2a';
    }
  }

  open(name, lines, onClose, voiceId) {
    this.voiceId = voiceId;
    this.isOpen = true;
    this.lines = lines;
    this.index = 0;
    this.onClose = onClose;
    this.nameTag.textContent = name;
    this.root.style.display = 'block';
    this.show(this.lines[0]);
  }

  // Called when the player presses E while the box is open
  next() {
    if (this.typing) {                 // first press: finish the typing effect
      this.finishTyping();
      return;
    }
    if (this.currentChoices) return;   // waiting for the player to pick an answer
    this.index += 1;
    if (this.index < this.lines.length) this.show(this.lines[this.index]);
    else this.close();
  }

  show(line) {
    this.choicesEl.innerHTML = '';
    this.currentChoices = null;
    this.hint.textContent = '';
    this.micBtn.style.display = 'none';
    if (!line.keepSaid) this.saidEl.textContent = '';
    speak(line.say, this.voiceId);
    this.typeText(line.say, () => {
      if (line.choices) this.showChoices(line.choices);
      else this.hint.textContent = 'E ▶';
    });
  }

  typeText(full, done) {
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
    if (this.afterTyping) this.afterTyping();
  }

  showChoices(choices) {
    this.currentChoices = choices;
    choices.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.textContent = `${i + 1}. ${choice.text}`;
      Object.assign(btn.style, {
        textAlign: 'left', fontFamily: 'inherit', fontSize: '16px', cursor: 'pointer',
        background: '#fffaf0', color: '#3a2414', border: '2px solid #b08a5a',
        borderRadius: '6px', padding: '6px 10px',
      });
      btn.onmouseenter = () => { btn.style.background = '#ffe9b8'; };
      btn.onmouseleave = () => { btn.style.background = '#fffaf0'; };
      btn.onclick = () => this.pick(choice);
      this.choicesEl.appendChild(btn);
    });
    this.micBtn.style.display = 'inline-block';
  }

  pick(choice) {
    // Replace the rest of the conversation with the NPC's reply to this answer
    this.lines = [{ say: choice.reply, keepSaid: true }];
    this.index = 0;
    this.show(this.lines[0]);
  }

  close() {
    stopVoice();
    if (isRecording()) stopRecording().catch(() => {});
    this.isOpen = false;
    this.root.style.display = 'none';
    this.currentChoices = null;
    if (this.onClose) this.onClose();
  }

  destroy() {
    stopVoice();
    clearInterval(this.typing);
    window.removeEventListener('keydown', this.keyHandler);
    window.removeEventListener('keydown', this.spaceDown);
    window.removeEventListener('keyup', this.spaceUp);
    this.root.remove();
  }
}
