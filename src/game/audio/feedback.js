// feedback.js
// Asks our server (Gemini) whether the player reached the goal and how the NPC should answer.
// If Gemini is not available, it falls back to simple word matching against the hints,
// so the game never gets stuck.

import { bestChoice } from './mic';

export async function getFeedback({ npc, history, said }) {
  try {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        npcName: npc.name,
        goal: npc.goal,
        goalCheck: npc.goalCheck,
        history,
        said,
      }),
    });
    if (!res.ok) throw new Error(`Feedback failed: ${res.status}`);
    const data = await res.json();
    return { ...data, source: 'gemini' };
  } catch (err) {
    console.warn('Gemini not available, using word matching instead.', err);
    const match = bestChoice(said, npc.hints || []);
    return {
      goalDone: Boolean(match),
      reply: match ? match.choice.reply : 'Hmm, can you say it another way? Tap "Need an idea?" for help.',
      tip: null,
      praise: match ? 'Great job!' : null,
      source: 'local',
    };
  }
}
