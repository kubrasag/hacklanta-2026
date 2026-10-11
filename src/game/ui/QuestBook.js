// QuestBook.js
// The leather book you open with Q. Three tabs:
//   📜 Quests       the main story and side requests, with objectives and stamps
//   🌱 Word Garden  every word you met, and how much it has grown
//   🏡 Villagers    friendship hearts and what each villager remembers about you

import { el, clear } from './dom';
import { portrait } from './portraits';
import { t } from '../data/i18n';
import { store, H } from '../state/store';
import { QUESTS, MAIN_ORDER, SIDE_ORDER, ITEMS } from '../data/story';
import { WORDS } from '../data/words';
import { NPCS, NPC_ORDER } from '../data/npcs';
import { quests, levelProgress } from '../systems/quests';
import { garden, STAGE_ICONS } from '../systems/garden';
import { memory } from '../systems/memory';
import { speak } from '../audio/voice';
import { sfx } from '../audio/sfx';

const TABS = [
  { id: 'quests', icon: '📜', label: 'tabQuests' },
  { id: 'garden', icon: '🌱', label: 'tabGarden' },
  { id: 'villagers', icon: '🏡', label: 'tabVillagers' },
];

export default class QuestBook {
  constructor(root) {
    this.isOpen = false;
    this.tab = 'quests';
    this.selectedQuest = null;
    this.selectedNpc = 'leo';

    this.left = el('div', 'page left');
    this.right = el('div', 'page right');
    this.tabsEl = el('div', 'tabs');
    this.closeBtn = el('button', 'btn small red book-close', `✕ ${t('close')}`);
    this.closeBtn.onclick = () => this.close();
    const book = el('div', 'book', [this.left, this.right, this.tabsEl, this.closeBtn]);
    this.wrap = el('div', 'book-wrap', book);
    this.wrap.addEventListener('mousedown', (e) => { if (e.target === this.wrap) this.close(); });
    root.appendChild(this.wrap);

    window.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      if (e.code === 'Escape') { e.preventDefault(); this.close(); }   // Q is handled by the game (toggle)
      if (e.code === 'Digit1') this.show('quests');
      if (e.code === 'Digit2') this.show('garden');
      if (e.code === 'Digit3') this.show('villagers');
    });
  }

  open(tab) {
    this.isOpen = true;
    this.wrap.classList.add('open');
    sfx.page();
    this.show(tab || this.tab);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.wrap.classList.remove('open');
    this.closedAt = performance.now();
    sfx.page();
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  show(tab) {
    if (tab !== this.tab) sfx.page();
    this.tab = tab;
    clear(this.tabsEl);
    TABS.forEach((tb) => {
      const b = el('div', `tab${tb.id === tab ? ' active' : ''}`, [tb.icon, el('span', 'tl', t(tb.label))]);
      b.onclick = () => this.show(tb.id);
      this.tabsEl.appendChild(b);
    });
    clear(this.left);
    clear(this.right);
    if (tab === 'quests') this.renderQuests();
    if (tab === 'garden') this.renderGarden();
    if (tab === 'villagers') this.renderVillagers();
  }

  // ================= quests =================

  renderQuests() {
    const s = store.state;
    if (!this.selectedQuest || quests.status(this.selectedQuest) === 'locked') {
      this.selectedQuest = quests.objective()?.qid || 'q1';
    }
    this.left.append(el('h2', '', `📜 ${t('bookTitle')}`));
    const list = (ids, title) => {
      this.left.append(el('h4', '', title));
      const box = el('div', 'qlist');
      ids.forEach((id) => {
        const st = quests.status(id);
        const q = QUESTS[id];
        const item = el('div', `qitem ${st}${id === this.selectedQuest ? ' selected' : ''}`, [
          el('span', 'ic', st === 'locked' ? '🔒' : q.icon),
          el('span', '', st === 'locked' ? '???' : H(q.title)),
          el('span', 'st', t(st)),
        ]);
        if (st !== 'locked') item.onclick = () => { this.selectedQuest = id; this.show('quests'); };
        box.appendChild(item);
      });
      this.left.append(box);
    };
    list(MAIN_ORDER, t('mainStory'));
    list(SIDE_ORDER, t('requests'));

    // Bag and progress
    this.left.append(el('h4', '', `🎒 ${t('bag')}`));
    const bag = el('div', 'bagrow');
    const items = Object.entries(s.items);
    if (!items.length) bag.append(el('span', 'sub', t('empty')));
    items.forEach(([id, n]) => bag.append(el('span', 'chip', `${ITEMS[id].icon} ${H(ITEMS[id].text)}${n > 1 ? ` ×${n}` : ''}`)));
    this.left.append(bag);

    const p = levelProgress(s.xp);
    this.left.append(el('h4', '', '🏅'), el('div', 'statgrid', [
      el('div', 'stat', [el('b', '', `${t('lv')} ${p.lv + 1}`), el('span', '', `${t('levels')[p.lv]} · ${s.xp} XP`)]),
      el('div', 'stat', [el('b', '', `⭐ ${quests.totalStars()}`), el('span', '', t('starsEarned'))]),
      el('div', 'stat', [el('b', '', `🌱 ${garden.count()}`), el('span', '', t('wordsLearned'))]),
      el('div', 'stat', [el('b', '', `🎤 ${s.stats.spoken}`), el('span', '', t('phrasesSpoken'))]),
    ]));

    // Details of the selected quest
    const qid = this.selectedQuest;
    const q = QUESTS[qid];
    const st = quests.status(qid);
    const state = s.quests[qid];
    this.right.append(el('div', 'qdetail', [
      el('div', 'qhead', [el('span', 'ic', q.icon), el('div', '', [el('h2', '', H(q.title)), el('div', 'sub', q.kind === 'main' ? t('mainStory') : t('requests'))])]),
      el('p', '', H(q.desc)),
      el('h4', '', t('objectives')),
      (() => {
        const ul = el('ul', 'objs');
        q.steps.forEach((step, i) => {
          const done = st === 'done' || i < state.step;
          const current = st === 'active' && i === state.step;
          if (!done && !current) return;
          const stars = s.stars[step.id] ? ` ${'★'.repeat(s.stars[step.id])}` : '';
          ul.append(el('li', done ? 'done' : '', [el('span', 'box', done ? '✓' : ''), `${H(step.objective)}${stars}`]));
        });
        if (st === 'active' && state.step < q.steps.length - 1) ul.append(el('li', 'todo', [el('span', 'box', ''), '…']));
        return ul;
      })(),
    ]));
    if (st === 'done') this.right.append(el('div', 'stamp', `✓ ${t('done')}`));
  }

  // ================= word garden =================

  renderGarden() {
    const s = store.state;
    const words = garden.list();
    const counts = [0, 0, 0, 0];
    words.forEach((w) => { counts[w.stage] += 1; });
    this.left.append(
      el('h2', '', `🌱 ${t('tabGarden')}`),
      el('p', 'sub', t('gardenHelp')),
      el('div', 'statgrid', [
        el('div', 'stat', [el('b', '', `🌱 ${counts[1]}`), el('span', '', t('stageSeed'))]),
        el('div', 'stat', [el('b', '', `🌿 ${counts[2]}`), el('span', '', t('stageSprout'))]),
        el('div', 'stat', [el('b', '', `🌻 ${counts[3]}`), el('span', '', t('stageBloom'))]),
        el('div', 'stat', [el('b', '', `💧 ${words.filter((w) => w.thirsty).length}`), el('span', '', t('thirsty'))]),
      ]),
    );
    const grid = el('div', 'garden');
    if (!words.length) this.right.append(el('p', 'sub', t('emptyGarden')));
    words
      .sort((a, b) => b.stage - a.stage)
      .forEach((w) => {
        const word = WORDS[w.id];
        const plot = el('div', `plot s${w.stage}`, [
          el('span', 'pic', word.icon),
          w.thirsty ? el('span', 'drop', '💧') : null,
          el('div', 'plant', STAGE_ICONS[w.stage]),
          el('div', 'w', word.text[s.learn]),
          el('div', 'm', word.text[s.help]),
        ]);
        plot.title = '🔊';
        plot.onclick = () => speak(word.text[s.learn], { voiceId: NPCS.leo.voiceId, lang: s.learn });
        grid.append(plot);
      });
    this.right.append(grid);
  }

  // ================= villagers =================

  renderVillagers() {
    const s = store.state;
    this.left.append(el('h2', '', `🏡 ${t('tabVillagers')}`), el('p', 'sub', t('villagersHelp')));
    const list = el('div', 'qlist');
    this.left.append(list);
    NPC_ORDER.forEach((id) => {
      const n = NPCS[id];
      const hearts = s.hearts[id];
      const full = Math.min(5, Math.ceil(hearts / 2));
      const row = el('div', `qitem${id === this.selectedNpc ? ' selected' : ''}`, [
        el('span', 'portrait', portrait(id, 40)),
        el('span', '', [n.name, el('div', 'role', H(n.role))]),
        el('span', 'st hearts', '♥'.repeat(full) + '♡'.repeat(5 - full)),
      ]);
      row.querySelector('.portrait').style.cssText = 'width:40px;height:40px;border-radius:8px;border-width:2px;box-shadow:none';
      row.onclick = () => { this.selectedNpc = id; this.show('villagers'); };
      list.append(row);
    });

    const id = this.selectedNpc;
    const n = NPCS[id];
    const mems = memory.of(id);
    const hearts = s.hearts[id];
    const full = Math.min(5, Math.ceil(hearts / 2));
    this.right.append(el('div', 'villager', [
      el('div', 'portrait', portrait(id, 64)),
      el('div', '', [
        el('div', 'who', n.name),
        el('div', 'role', H(n.role)),
        el('div', 'hearts', '♥'.repeat(full) + '♡'.repeat(5 - full)),
      ]),
    ]));
    this.right.append(el('h4', '', `💭 ${t('remembers')}`));
    if (!mems.length) this.right.append(el('div', 'sub', t('nothingYet')));
    else this.right.append(el('ul', 'objs', mems.map((m) => el('li', '', [el('span', 'box', '💭'), m]))));
  }
}
