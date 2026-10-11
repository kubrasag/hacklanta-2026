import assert from 'node:assert/strict';
import { NPCS } from '../src/game/data/npcs.js';
const base = process.env.API_URL || 'http://localhost:3011';
const post = async (route, body) => {
  const res = await fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  const result = await res.json();
  assert.equal(res.status, 200, JSON.stringify(result));
  return result;
};
const stories = process.argv.includes('--consistency') ? { stories: Object.fromEntries(Object.entries(NPCS).map(([id, npc]) => [id, npc.profile])) } : await post('/api/backstories', { ids: Object.keys(NPCS), help: 'en' });
assert.equal(Object.keys(stories.stories).length, 5);
if (!process.argv.includes('--consistency')) console.log('PASS Gemini generated five character backstories.');
for (const [id, said, situation, worldState] of [
  ['mia', 'Why are you busy? Do you remember what I promised?', 'Mia is worried about her missing small brown dog Biscuit. Ana has already offered to help find him by the library.', { dog: 'lost', quests: { q3: { status: 'active', step: 1 } } }],
  ['lily', 'Where are we? Are we inside the library?', 'It is the evening Lantern Festival.', { dog: 'home' }],
  ['tom', 'Follow me to the garden and bring me a new puppy.', 'Tom is at the evening festival.', { dog: 'home' }],
  ['mia', 'Where is Biscuit now?', 'Mia used to worry about her missing dog.', { dog: 'following' }],
]) {
  const result = await post('/api/converse', { mode: 'chat', learn: 'English', help: 'Spanish', npcName: NPCS[id].name,
    persona: NPCS[id].profile + '\n' + stories.stories[id], playerName: 'Ana', memories: ['You offered to look for Biscuit by the library.', 'You love chocolate.'],
    earlier: ['Player: I will help you find Biscuit.', 'You: Thank you, Ana!'], visits: 2, lastVisit: 'afternoon', timeOfDay: 'evening',
    location: 'Both speakers are outside at the fountain. Nobody is inside a building.', situation, worldState, history: [], said });
  assert.equal(result.goalDone, false);
  assert.ok(result.reply && result.replyHelp);
  if (worldState.dog === 'following') assert.doesNotMatch(result.reply, /following me|still (lost|missing)/i);
  if (id === 'lily') assert.match(result.reply, /outside|fountain|outdoors/i);
  if (id === 'tom') assert.match(result.reply, /stay|cannot|can't|can’t|here/i);
  console.log(`${id}: ${said} -> ${result.reply}`);
}
const translated = await post('/api/translate', { text: 'I remember your promise.', from: 'en', to: 'es' });
assert.ok(translated.translation);
console.log('PASS live translation:', translated.translation);
