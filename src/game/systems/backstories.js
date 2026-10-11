import { store } from '../state/store';
import { NPCS } from '../data/npcs';

// One story per villager per save. Failed requests leave the authored profiles usable.
export async function prepareBackstories() {
  const state = store.state;
  const missing = Object.keys(NPCS).filter((id) => !state.backstories[id]);
  if (!missing.length) return;
  try {
    const res = await fetch('/api/backstories', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: missing, help: state.help }), signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return;
    const { stories } = await res.json();
    if (store.state !== state) return;
    for (const id of missing) {
      if (typeof stories?.[id] === 'string' && stories[id].trim()) state.backstories[id] = stories[id].slice(0, 1800);
    }
    store.saveNow();
  } catch { /* Offline profiles are already available. */ }
}
