// Hud.js
// Always on screen while playing:
//   top left    your portrait, level, XP bar, words in the garden, stars, bag
//   top middle  day and time
//   top right   the current quest and what to do next
//   bottom      buttons (Quest Book, sound, menu) and key hints
// Plus an arrow at the screen edge that points to your next goal when it is off screen.

import { el, clear } from './dom';
import { portrait } from './portraits';
import { t } from '../data/i18n';
import { store, H } from '../state/store';
import { quests, levelProgress } from '../systems/quests';
import { garden } from '../systems/garden';
import { ITEMS } from '../data/story';
import { NPCS } from '../data/npcs';
import { bus } from '../core/bus';

const TIME_ICONS = { morning: '☀️', afternoon: '🌤️', evening: '🌙' };

export default class Hud {
  constructor(root, { onBook, onMute, onMenu }) {
    this.avatar = el('div', 'hud-avatar', portrait('player', 46));
    this.levelName = el('span');
    this.levelNum = el('span');
    this.xpFill = el('div');
    this.wordsEl = el('span');
    this.starsEl = el('span');
    this.bagEl = el('span');
    this.timeEl = el('div', 'hud-time');
    this.left = el('div', 'hud-left panel', [
      this.avatar,
      el('div', '', [
        el('div', 'hud-level', [this.levelName, this.levelNum]),
        el('div', 'xp-bar', this.xpFill),
        el('div', 'hud-stats', [this.wordsEl, this.starsEl, this.bagEl]),
        this.timeEl,
      ]),
    ]);

    this.qLabel = el('div', 'label');
    this.qTitle = el('div', 'qtitle');
    this.qObj = el('div', 'obj');
    this.qSide = el('div', 'side');
    this.quest = el('div', 'hud-quest panel', [this.qLabel, this.qTitle, this.qObj, this.qSide]);
    this.quest.onclick = onBook;

    this.bookBtn = el('button', 'btn', `📖 ${t('bookTitle')}`);
    this.bookBtn.onclick = onBook;
    this.muteBtn = el('button', 'btn paper icon', '🔊');
    this.muteBtn.title = t('mute');
    this.muteBtn.onclick = () => { this.muted = !this.muted; this.muteBtn.textContent = this.muted ? '🔇' : '🔊'; onMute(this.muted); };
    this.menuBtn = el('button', 'btn paper icon', '⟲');
    this.menuBtn.title = t('newGame');
    this.menuBtn.onclick = onMenu;
    this.buttons = el('div', 'hud-buttons', [this.bookBtn, this.muteBtn, this.menuBtn]);

    this.keys = el('div', 'hud-keys passive', [
      el('span', '', [el('span', 'kbd', 'WASD'), t('howMove')]),
      el('span', '', [el('span', 'kbd', 'E'), t('howTalk')]),
      el('span', '', [el('span', 'kbd', 'Q'), t('howBook')]),
    ]);

    this.arrow = el('div', 'arrow', [el('div', 'ring', el('div', 'tip')), el('div', 'who')]);
    this.arrow.style.display = 'none';

    this.nodes = [this.left, this.quest, this.buttons, this.keys, this.arrow];
    this.nodes.forEach((n) => { n.style.display = 'none'; root.appendChild(n); });

    this.lastLevel = null;
    let queued = false;
    bus.on('state:changed', () => {
      if (queued || !this.visible) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; this.refresh(); });
    });
    bus.on('objective:changed', () => {
      this.refresh();
      this.quest.classList.remove('flash');
      void this.quest.offsetWidth;
      this.quest.classList.add('flash');
    });
  }

  show() {
    this.visible = true;
    this.nodes.forEach((n) => { if (n !== this.arrow) n.style.display = ''; });
    this.refresh();
  }

  hide() {
    this.visible = false;
    this.nodes.forEach((n) => { n.style.display = 'none'; });
  }

  refresh() {
    const s = store.state;
    if (!s) return;
    const p = levelProgress(s.xp);
    const names = t('levels');
    this.levelName.textContent = names[p.lv];
    this.levelNum.textContent = `${t('lv')} ${p.lv + 1}`;
    this.xpFill.style.width = `${Math.round(p.pct * 100)}%`;
    this.bump(this.wordsEl, `🌱 ${garden.count()}`);
    this.bump(this.starsEl, `⭐ ${quests.totalStars()}`);
    const bag = Object.entries(s.items).map(([id, n]) => ITEMS[id]?.icon + (n > 1 ? `×${n}` : '')).join(' ');
    this.bagEl.textContent = bag ? `🎒 ${bag}` : '';
    this.timeEl.textContent = `${TIME_ICONS[s.time]} ${t('day')} · ${t(s.time)}`;

    const obj = quests.objective();
    clear(this.qLabel).append(el('span', '', obj && obj.quest.kind === 'side' ? t('requests') : t('currentQuest')), el('span', '', 'Q'));
    if (obj) {
      this.qTitle.textContent = `${obj.quest.icon} ${H(obj.quest.title)}`;
      this.qObj.textContent = obj.text;
    } else {
      this.qTitle.textContent = '🌻 WordHarvest';
      this.qObj.textContent = t('allDone');
    }
    const sides = ['r1', 'r2'].filter((id) => quests.status(id) === 'active' && (!obj || obj.qid !== id));
    this.qSide.textContent = sides.length ? sides.map((id) => `${quests.def(id).icon} ${H(quests.def(id).title)}`).join('  ·  ') : '';
  }

  bump(node, text) {
    if (node.textContent === text) return;
    node.textContent = text;
    node.classList.remove('bump');
    void node.offsetWidth;
    node.classList.add('bump');
  }

  // Arrow at the screen edge toward the next goal: { x, y, angle, who } or null
  setArrow(info) {
    if (!info || !this.visible) {
      this.arrow.style.display = 'none';
      return;
    }
    this.arrow.style.display = '';
    this.arrow.style.left = `${info.x}px`;
    this.arrow.style.top = `${info.y}px`;
    this.arrow.querySelector('.ring').style.transform = `rotate(${info.angle + Math.PI / 2}rad)`;
    this.arrow.querySelector('.who').textContent = NPCS[info.who]?.name || '';
  }
}
