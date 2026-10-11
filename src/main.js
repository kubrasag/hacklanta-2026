// main.js
// Boots WordHarvest: the village (Phaser), the menus (HTML) and the AI services.

import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import '@fontsource/pixelify-sans/700.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import './styles/main.css';

import { startGame } from './game/main';
import { bus } from './game/core/bus';
import { store } from './game/state/store';
import { setUiLanguage, t } from './game/data/i18n';
import TitleScreen from './game/ui/TitleScreen';
import DialogueBox from './game/ui/DialogueBox';
import Hud from './game/ui/Hud';
import QuestBook from './game/ui/QuestBook';
import WorldLabels from './game/ui/WorldLabels';
import EndOfDay from './game/ui/EndOfDay';
import Director from './game/director';
import { preloadPortraits } from './game/ui/portraits';
import { useServerVoices, setVoiceMuted } from './game/audio/voice';
import { setSpeechMode } from './game/audio/mic';
import { setSfxMuted } from './game/audio/sfx';
import { useAI } from './game/audio/converse';

// Which services are running? The game works without any of them.
async function checkServices() {
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(2500) });
    const data = await res.json();
    return { elevenlabs: Boolean(data.elevenlabs), gemini: Boolean(data.gemini) };
  } catch {
    return { elevenlabs: false, gemini: false };
  }
}

function restart() {
  if (!window.confirm(t('restartConfirm'))) return;
  store.wipe();
  window.location.reload();
}

// Buttons should not keep focus, or SPACE / ENTER would press them again
document.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('button');
  if (b) b.blur();
});

async function boot() {
  preloadPortraits();
  const root = document.getElementById('ui');
  const labels = new WorldLabels(root);
  const sceneReady = new Promise((resolve) => bus.on('scene:ready', resolve));
  startGame('game-container');

  let services = { elevenlabs: false, gemini: false };
  const title = new TitleScreen(root, {
    onStart: async ({ learn, help, fresh }) => {
      const scene = await sceneReady;
      if (fresh || !store.load()) store.newGame(learn, help);
      setUiLanguage(store.state.help);

      const dialogue = new DialogueBox(root);
      const book = new QuestBook(root);
      let director = null;
      const hud = new Hud(root, {
        onBook: () => director && director.toggleBook(),
        onMute: (muted) => { setVoiceMuted(muted); setSfxMuted(muted); },
        onMenu: restart,
      });
      const endOfDay = new EndOfDay(root, { onKeep: () => {}, onRestart: restart });
      director = new Director({ scene, dialogue, hud, book, labels, endOfDay, ai: () => services.gemini });
      director.begin(fresh);
      if (import.meta.env.DEV) window.__wh = { scene, director, store };   // handy for debugging
    },
  });

  services = await checkServices();
  useServerVoices(services.elevenlabs);
  useAI(services.gemini);
  const mic = setSpeechMode(services.elevenlabs);
  title.setStatus({
    voices: services.elevenlabs ? true : 'browser',
    ai: services.gemini,
    mic: mic === 'server' ? true : mic === 'browser' ? 'browser' : false,
  });
}

boot();
