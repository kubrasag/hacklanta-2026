// StarCounter.js
// A small badge in the top left corner: ⭐ 2 / 5
// The player earns one star per NPC by completing that NPC's goal OUT LOUD.
// Progress is kept in the browser (localStorage), so a page refresh does not lose it.

const STORAGE_KEY = 'speakquest-stars';

export default class StarCounter {
  constructor(total) {
    this.total = total;
    this.done = new Set(this.load());

    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'fixed', top: '16px', left: '16px', zIndex: 10,
      background: '#f6e7c8', border: '3px solid #5a3a22', borderRadius: '10px',
      boxShadow: '0 4px 0 #3a2414', padding: '6px 12px',
      fontFamily: '"Courier New", monospace', fontWeight: 'bold', fontSize: '18px', color: '#3a2414',
      transition: 'transform 0.2s',
    });
    document.body.appendChild(this.el);
    this.render();
  }

  has(id) {
    return this.done.has(id);
  }

  // Returns true if this was a NEW star
  add(id) {
    if (this.done.has(id)) return false;
    this.done.add(id);
    this.save();
    this.render();
    // little "pop" animation
    this.el.style.transform = 'scale(1.3)';
    setTimeout(() => { this.el.style.transform = 'scale(1)'; }, 250);
    return true;
  }

  render() {
    const all = this.done.size >= this.total ? ' 🎉' : '';
    this.el.textContent = `⭐ ${this.done.size} / ${this.total}${all}`;
  }

  load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.done]));
    } catch {
      // storage can be blocked (private window); the game still works
    }
  }

  destroy() {
    this.el.remove();
  }
}
