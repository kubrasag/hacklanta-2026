import { el, clear } from './dom';
import { store, H } from '../state/store';
import { WORDS } from '../data/words';

const cache = new Map();
export default class TranslationPopup {
  constructor(root, dialogue) {
    this.dialogue = dialogue;
    this.ticket = 0;
    this.tip = el('div', 'translation-popup');
    this.tip.setAttribute('role', 'dialog');
    this.tip.setAttribute('aria-label', 'Translation');
    this.tip.hidden = true;
    root.append(this.tip);
    const show = (e) => {
      const target = e.target.closest('.dlg-word');
      if (!target || !dialogue.lineEl.contains(target)) { this.scheduleHide(); return; }
      this.show(target);
    };
    dialogue.root.addEventListener('mouseover', show);
    dialogue.root.addEventListener('mousemove', show);
    dialogue.root.addEventListener('focusin', show);
    dialogue.root.addEventListener('mouseout', (e) => { if (!e.relatedTarget || !this.tip.contains(e.relatedTarget)) this.scheduleHide(); });
    dialogue.root.addEventListener('focusout', (e) => { if (!this.tip.contains(e.relatedTarget)) this.scheduleHide(); });
    const keepOpen = () => { clearTimeout(this.timer); this.timer = null; };
    this.tip.addEventListener('mouseenter', keepOpen);
    this.tip.addEventListener('mouseleave', () => this.scheduleHide());
    this.tip.addEventListener('focusin', keepOpen);
    this.tip.addEventListener('focusout', (e) => { if (!this.tip.contains(e.relatedTarget)) this.scheduleHide(); });
    this.tip.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') this.hide(); });
    this.tip.addEventListener('click', (e) => e.stopPropagation());
  }

  scheduleHide() { if (!this.timer) this.timer = setTimeout(() => this.hide(), 250); }
  hide() { this.ticket++; this.tip.hidden = true; this.target = null; clearTimeout(this.timer); this.timer = null; }

  async show(target) {
    clearTimeout(this.timer);
    this.timer = null;
    if (this.target === target && !this.tip.hidden) return;
    this.target = target;
    const ticket = ++this.ticket;
    const state = store.state;
    const word = WORDS[target.dataset.word];
    const from = state.learn;
    const to = state.help;
    const text = target.textContent.trim();
    if (!text) return;
    let translation = word?.text[to];
    const key = JSON.stringify([from, to, text]);
    translation ||= cache.get(key);
    const label = el('div', 'popup-meaning', translation || H({ en: 'Translating…', tr: 'Çevriliyor…', es: 'Traduciendo…' }));
    clear(this.tip).append(el('strong', '', text), label);
    this.tip.hidden = false;
    this.position(target);
    if (!translation) {
      // Avoid API calls when the pointer merely crosses a word.
      await new Promise((resolve) => setTimeout(resolve, 250));
      if (ticket !== this.ticket || !this.dialogue.isOpen) return;
      try {
        const res = await fetch('/api/translate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, from, to }), signal: AbortSignal.timeout(9500),
        });
        if (!res.ok) throw new Error('Translation unavailable');
        const result = await res.json();
        translation = result.translation;
        if (typeof translation !== 'string' || !translation.trim()) throw new Error('Empty translation');
        cache.set(key, translation);
      } catch {
        if (ticket === this.ticket) label.textContent = H({ en: 'Word meaning unavailable offline.', tr: 'Kelime anlamı çevrimdışı kullanılamıyor.', es: 'Significado no disponible sin conexión.' });
        return;
      }
    }
    if (ticket !== this.ticket || store.state !== state || !this.dialogue.isOpen) return;
    label.textContent = translation;
    const saved = () => state.bookmarks.some((b) => b.text === text && b.from === from && b.to === to);
    const button = el('button', 'btn small paper');
    const update = () => { button.textContent = saved() ? `✓ ${H({ en: 'Bookmarked', tr: 'Kaydedildi', es: 'Guardado' })}` : `🔖 ${H({ en: 'Bookmark', tr: 'Kaydet', es: 'Guardar' })}`; };
    update();
    button.onclick = () => {
      if (!saved()) state.bookmarks.push({ text, translation, from, to });
      store.saveNow(); update();
    };
    this.tip.append(button);
    this.position(target);
  }

  position(target) {
    const r = target.getBoundingClientRect();
    const width = this.tip.offsetWidth, height = this.tip.offsetHeight;
    this.tip.style.left = `${Math.max(8, Math.min(innerWidth - width - 8, r.left))}px`;
    this.tip.style.top = `${Math.max(8, r.top > height + 12 ? r.top - height - 8 : Math.min(innerHeight - height - 8, r.bottom + 8))}px`;
  }
}
