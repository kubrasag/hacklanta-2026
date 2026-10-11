// TitleScreen.js
// The first screen, over a slowly panning view of the village.
// Pick the language you want to learn and the language you speak, then start.

import { el, clear } from './dom';
import { t, setUiLanguage } from '../data/i18n';
import { LANGUAGES, LANGUAGE_ORDER } from '../data/languages';
import { store } from '../state/store';
import { sfx, unlockAudio } from '../audio/sfx';

export default class TitleScreen {
  constructor(root, { onStart }) {
    this.onStart = onStart;
    const saved = store.savedLanguages();
    this.learn = saved?.learn || 'es';
    this.help = saved?.help || 'en';
    if (this.help === this.learn) this.help = this.learn === 'en' ? 'tr' : 'en';
    this.status = { voices: null, ai: null, mic: null };
    this.root = el('div', 'title');
    root.appendChild(this.root);
    this.render();
  }

  setStatus(status) {
    this.status = status;
    this.render();
  }

  render() {
    setUiLanguage(this.help);
    clear(this.root);
    const card = el('div', 'title-card panel');

    card.append(
      el('div', 'logo', [el('span', 'leaf', '🌾'), ' WordHarvest']),
      el('p', 'tagline', t('tagline')),
      el('div', 'pick-label', t('learnLabel')),
    );

    const cards = el('div', 'lang-cards');
    LANGUAGE_ORDER.forEach((code) => {
      const L = LANGUAGES[code];
      const c = el('div', `lang-card${code === this.learn ? ' selected' : ''}`, [
        el('div', 'greet', L.greeting),
        el('div', 'native', L.native),
        el('div', 'english', t('langNames')[code]),
      ]);
      c.onclick = () => {
        unlockAudio();
        sfx.click();
        this.learn = code;
        if (this.help === code) this.help = LANGUAGE_ORDER.find((x) => x !== code);
        this.render();
      };
      cards.append(c);
    });
    card.append(cards, el('div', 'pick-label', t('helpLabel')));

    const pills = el('div', 'help-pills');
    LANGUAGE_ORDER.forEach((code) => {
      const b = el('button', `help-pill${code === this.help ? ' selected' : ''}`, LANGUAGES[code].native);
      b.disabled = code === this.learn;
      b.onclick = () => { sfx.click(); this.help = code; this.render(); };
      pills.append(b);
    });
    card.append(pills);

    const actions = el('div', 'title-actions');
    const saved = store.savedLanguages();
    const canContinue = store.hasSave() && saved.learn === this.learn && saved.help === this.help;
    if (canContinue) {
      const cont = el('button', 'btn green', `▶ ${t('continue')}`);
      cont.onclick = () => this.start(false);
      actions.append(cont);
    }
    const start = el('button', `btn${canContinue ? ' paper' : ''}`, canContinue ? t('newGame') : `🌱 ${t('start')}`);
    start.onclick = () => this.start(true);
    actions.append(start);
    card.append(actions);

    card.append(el('div', 'howto', [
      el('span', '', [el('span', 'kbd', 'WASD'), t('howMove')]),
      el('span', '', [el('span', 'kbd', 'E'), t('howTalk')]),
      el('span', '', [el('span', 'kbd', 'SPACE'), t('howSpeak')]),
      el('span', '', [el('span', 'kbd', 'T'), t('howTranslate')]),
      el('span', '', [el('span', 'kbd', 'Q'), t('howBook')]),
    ]));

    const chip = (label, value) => {
      const cls = value === true ? 'ok' : value === 'browser' ? 'warn' : value === false ? 'warn' : '';
      const text = value === true ? t('on') : value === 'browser' ? t('browser') : value === false ? t('offline') : '…';
      return el('span', `chip ${cls}`, [el('span', 'dot'), `${label}: ${text}`]);
    };
    card.append(el('div', 'status', [
      chip(`🔊 ${t('statusVoices')}`, this.status.voices),
      chip(`🧠 ${t('statusAI')}`, this.status.ai),
      chip(`🎤 ${t('statusMic')}`, this.status.mic),
    ]));

    this.root.append(card);
    this.keyHandler = this.keyHandler || ((e) => {
      if (this.root.classList.contains('hide')) return;
      if (e.code === 'Enter') this.start(!(store.hasSave() && store.savedLanguages().learn === this.learn));
    });
    window.removeEventListener('keydown', this.keyHandler);
    window.addEventListener('keydown', this.keyHandler);
  }

  start(fresh) {
    unlockAudio();
    sfx.success();
    window.removeEventListener('keydown', this.keyHandler);
    this.root.classList.add('hide');
    setTimeout(() => { this.root.style.display = 'none'; }, 650);
    this.onStart({ learn: this.learn, help: this.help, fresh });
  }
}
