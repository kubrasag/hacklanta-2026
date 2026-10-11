// WorldLabels.js
// Crisp HTML labels that float above characters in the world:
// quest markers (! and ?), the "E · Talk" prompt, names, and speech bubbles.
// TownScene tells us every frame where each character's head is on screen.

import { el, clear } from './dom';

export default class WorldLabels {
  constructor(root) {
    this.layer = el('div', 'world');
    root.appendChild(this.layer);
    this.items = new Map();   // id -> { box, marker, prompt, bubble, name }
  }

  item(id) {
    if (!this.items.has(id)) {
      const box = el('div', 'wl');
      box.style.display = 'flex';
      box.style.flexDirection = 'column';
      box.style.alignItems = 'center';
      box.style.gap = '4px';
      this.layer.appendChild(box);
      this.items.set(id, { box, marker: null, prompt: null, bubble: null, name: null, bubbleTimer: null });
    }
    return this.items.get(id);
  }

  setMarker(id, mark) {
    const it = this.item(id);
    const key = mark ? `${mark.mark}|${mark.kind}` : null;
    if (it.markerKey === key) return;
    it.markerKey = key;
    if (it.marker) { it.marker.remove(); it.marker = null; }
    if (!mark) return;
    const cls = mark.mark === '?' ? 'turnin' : mark.kind === 'side' ? 'side' : '';
    it.marker = el('div', `marker ${cls}`, mark.mark);
    it.box.appendChild(it.marker);
  }

  setPrompt(id, label) {
    const it = this.item(id);
    if (it.promptLabel === label) return;
    it.promptLabel = label;
    if (it.prompt) { it.prompt.remove(); it.prompt = null; }
    if (!label) return;
    it.prompt = el('div', 'prompt', [el('span', 'kbd', 'E'), label]);
    it.box.appendChild(it.prompt);
  }

  setName(id, name) {
    const it = this.item(id);
    if (it.nameText === name) return;
    it.nameText = name;
    if (it.name) { it.name.remove(); it.name = null; }
    if (!name) return;
    it.name = el('div', 'nametag', name);
    it.box.appendChild(it.name);
  }

  bubble(id, text, help, ms = 3500) {
    const it = this.item(id);
    if (it.bubble) it.bubble.remove();
    clearTimeout(it.bubbleTimer);
    it.bubble = el('div', 'bubble', [text, help ? el('span', 'tr', help) : null]);
    it.bubble.style.position = 'relative';
    it.box.prepend(it.bubble);
    it.bubbleTimer = setTimeout(() => {
      if (it.bubble) { it.bubble.remove(); it.bubble = null; }
    }, ms);
  }

  // positions: id -> { x, y, visible } in screen pixels (head top)
  update(positions) {
    this.items.forEach((it, id) => {
      const p = positions[id];
      if (!p || !p.visible) {
        it.box.style.display = 'none';
        return;
      }
      it.box.style.display = 'flex';
      it.box.style.left = `${p.x}px`;
      it.box.style.top = `${p.y}px`;
    });
  }

  clearAll() {
    this.items.forEach((it) => it.box.remove());
    this.items.clear();
    clear(this.layer);
  }
}
