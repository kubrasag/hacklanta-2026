// DialogueBox.js
// A simple HTML dialogue box drawn on top of the game canvas.
// HTML is easier than Phaser text for crisp fonts, wrapping and clickable buttons.

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

    this.hint = document.createElement('div');
    Object.assign(this.hint.style, { textAlign: 'right', fontSize: '12px', opacity: '0.6', marginTop: '6px' });

    this.root.append(this.nameTag, this.text, this.choicesEl, this.hint);
    document.body.appendChild(this.root);

    // Number keys pick a choice
    this.keyHandler = (e) => {
      const n = Number(e.key);
      if (this.isOpen && this.currentChoices && n >= 1 && n <= this.currentChoices.length) {
        this.pick(this.currentChoices[n - 1]);
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  open(name, lines, onClose) {
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
  }

  pick(choice) {
    // Replace the rest of the conversation with the NPC's reply to this answer
    this.lines = [{ say: choice.reply }];
    this.index = 0;
    this.show(this.lines[0]);
  }

  close() {
    this.isOpen = false;
    this.root.style.display = 'none';
    this.currentChoices = null;
    if (this.onClose) this.onClose();
  }

  destroy() {
    clearInterval(this.typing);
    window.removeEventListener('keydown', this.keyHandler);
    this.root.remove();
  }
}
