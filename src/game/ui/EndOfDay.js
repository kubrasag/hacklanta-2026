// EndOfDay.js
// The report card after the festival: what you learned today and what to review tomorrow.

import { el, clear } from './dom';
import { portrait } from './portraits';
import { t, langName } from '../data/i18n';
import { store, vars } from '../state/store';
import { WORDS } from '../data/words';
import { NPCS } from '../data/npcs';
import { QUESTS } from '../data/story';
import { quests } from '../systems/quests';
import { garden } from '../systems/garden';
import { speak } from '../audio/voice';
import { sfx } from '../audio/sfx';

export default class EndOfDay {
  constructor(root, { onKeep, onRestart }) {
    this.onKeep = onKeep;
    this.onRestart = onRestart;
    this.wrap = el('div', 'eod-wrap');
    root.appendChild(this.wrap);
  }

  show() {
    const s = store.state;
    const v = vars();
    clear(this.wrap);
    const words = garden.list();
    const maxStars = Object.values(QUESTS).reduce((n, q) => n + q.steps.length * 3, 0);
    const friend = quests.bestFriend();
    const choice = s.rumors.dogMethod;

    const stat = (big, label, i) => {
      const node = el('div', 'stat', [el('b', '', big), el('span', '', label)]);
      node.style.animationDelay = `${0.2 + i * 0.12}s`;
      return node;
    };

    const review = el('div', 'review');
    const thirsty = garden.thirsty();
    if (!thirsty.length) review.append(el('span', 'sub', t('reviewNone')));
    thirsty.forEach((id) => {
      const w = WORDS[id];
      const chip = el('span', 'chip', [`${w.icon} ${w.text[s.learn]}`, el('span', 'meaning', w.text[s.help])]);
      chip.onclick = () => speak(w.text[s.learn], { voiceId: NPCS.leo.voiceId, lang: s.learn });
      review.append(chip);
    });

    const keep = el('button', 'btn green', `🌙 ${t('keepExploring')}`);
    keep.onclick = () => { this.hide(); this.onKeep(); };
    const restart = el('button', 'btn paper', `⟲ ${t('startOver')}`);
    restart.onclick = () => this.onRestart();

    this.wrap.append(el('div', 'eod panel', [
      el('div', 'logo', '🏮'),
      el('h1', '', t('dayDone')),
      el('div', 'sub', t('dayDoneSub', { village: v.village })),
      el('div', 'grid', [
        stat(`⭐ ${quests.totalStars()}/${maxStars}`, t('starsEarned'), 0),
        stat(`🌱 ${words.length}`, t('wordsLearned'), 1),
        stat(`🌻 ${words.filter((w) => w.stage === 3).length}`, t('stageBloom').split(':')[0], 2),
        stat(`🎤 ${s.stats.spoken}`, t('phrasesSpoken'), 3),
      ]),
      el('div', 'row2', [
        el('div', 'box', [
          el('h4', '', `💛 ${t('bestFriend')}`),
          el('div', 'friend', [el('div', 'portrait', portrait(friend, 56)), el('div', '', [NPCS[friend].name, el('div', 'hearts', '♥'.repeat(Math.min(5, Math.ceil(s.hearts[friend] / 2))))])]),
        ]),
        el('div', 'box', [
          el('h4', '', `🐶 ${t('yourChoice')}`),
          el('div', '', choice === 'call'
            ? `🗣️ ${t('choiceCall', { dog: v.dog, lang: langName(s.learn) })}`
            : `🥐 ${t('choiceCroissant', { dog: v.dog })}`),
        ]),
      ]),
      el('div', 'box', [el('h4', '', `💧 ${t('reviewTomorrow')}`), review]),
      el('div', 'teaser', t('teaser')),
      el('div', 'acts', [keep, restart]),
    ]));
    this.wrap.classList.add('open');
    sfx.levelUp();
  }

  hide() {
    this.wrap.classList.remove('open');
  }
}
