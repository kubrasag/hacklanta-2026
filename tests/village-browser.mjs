// Run with Vite on 8090. PUPPETEER_MODULE may point at an existing puppeteer-core installation.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { default: puppeteer } = await import(process.env.PUPPETEER_MODULE ? pathToFileURL(process.env.PUPPETEER_MODULE).href : 'puppeteer-core');
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'], defaultViewport: { width: 1440, height: 900 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.setRequestInterception(true);
page.on('request', (req) => {
  if (!req.url().includes('/api/')) return req.continue();
  if (req.url().endsWith('/health')) return req.respond({ contentType: 'application/json', body: JSON.stringify({ gemini: false, elevenlabs: false }) });
  if (req.url().endsWith('/translate')) return req.respond({ contentType: 'application/json', body: JSON.stringify({ translation: 'Test translation' }) });
  return req.respond({ status: 503, body: '{}' });
});
const wait = (ms = 420) => new Promise((r) => setTimeout(r, ms));
const close = async () => {
  await page.keyboard.press('Escape'); await wait();
  if (await page.evaluate(() => window.__wh?.director.dialogue.isOpen)) { await page.keyboard.press('Escape'); await wait(); }
};
const tp = async (x, y) => { await page.evaluate((x, y) => { const s = window.__wh.scene; s.player.body.reset(x, y); s.game.loop.inFocus = true; }, x, y); await wait(); };
try {
  await fs.mkdir('test-results', { recursive: true });
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:8090', { waitUntil: 'networkidle0' });
  await page.click('.title-actions .btn');
  await page.waitForFunction(() => window.__wh?.scene.playing);
  await page.evaluate(async () => { const voice = await import('/src/game/audio/voice.js'); voice.setVoiceMuted(true); const sfx = await import('/src/game/audio/sfx.js'); sfx.setSfxMuted(true); });
  await wait(800);
  const offline = await page.evaluate(async () => {
    const { store } = window.__wh;
    store.state.learn = 'en'; store.state.help = 'es';
    const { memory } = await import('/src/game/systems/memory.js');
    const { offlineChat, momentOf } = await import('/src/game/systems/villagers.js');
    store.state.quests.q3 = { status: 'active', step: 1 };
    memory.remember('mia', 'You promised to find Biscuit.');
    memory.logTalk('mia', [{ who: 'player', text: 'I will look by the library.' }], 'check');
    memory.logTalk('mia', [{ who: 'player', text: 'I will look by the library.' }, { who: 'npc', text: 'Thank you!' }], 'check');
    const busy = offlineChat('mia', 'Why are you busy?').reply;
    store.state.dog = 'following';
    const found = offlineChat('mia', 'Where is your dog?').reply;
    const following = offlineChat('lily', 'Follow me').reply;
    const visits = memory.visitCount('mia');
    store.state.dog = 'hidden'; store.state.quests.q3.status = 'locked';
    return { busy, found, following, visits, lily: momentOf('lily').line.en };
  });
  assert.match(offline.busy, /Biscuit/); assert.match(offline.found, /following/);
  assert.match(offline.following, /stay here/); assert.equal(offline.visits, 1);
  assert.doesNotMatch(offline.lily, /this is the library/);
  console.log('PASS phase 1: dog state, capability fallback, repeat-visit checkpoints');

  for (const [id, point] of Object.entries({ bakery: [462, 390], cafe: [1128, 390], market: [403, 830], library: [1288, 845] })) {
    await tp(...point); await page.keyboard.press('f'); await wait();
    assert.equal(await page.evaluate(() => window.__wh.scene.currentInterior?.id), id);
    assert.match(await page.evaluate(() => window.__wh.scene.conversationContext('lily').location), /Inside/);
    await page.screenshot({ path: `test-results/${id}.png` });
    const p = await page.evaluate(() => { const p = window.__wh.scene.currentInterior.props[0]; return [2100 + p.x, 100 + p.y + 35]; });
    await tp(...p); await page.keyboard.press('e'); await wait();
    assert.equal(await page.evaluate(() => window.__wh.director.dialogue.isOpen), true);
    await close();
    await page.keyboard.press('f'); await wait();
    assert.equal(await page.evaluate(() => window.__wh.scene.currentInterior), null);
    assert.equal(await page.evaluate(() => Object.values(window.__wh.scene.npcs).every((n) => n.visible && n.body.enable)), true);
  }
  console.log('PASS phase 2: all four interiors, inspectable lore, return to town');

  await tp(805, 790); await page.keyboard.press('e'); await wait();
  assert.equal(await page.evaluate(() => window.__wh.director.dialogue.pending?.kind), 'card');
  await page.keyboard.press('1'); await wait();
  assert.equal(await page.evaluate(() => window.__wh.director.dialogue.mode), 'chat');
  await page.evaluate(() => window.__wh.director.dialogue.finishTyping());
  await page.mouse.move(10, 300);
  await page.hover('.dlg-line'); await wait();
  await page.waitForSelector('.translation-popup:not([hidden]) button');
  await page.click('.translation-popup button');
  assert.equal(await page.evaluate(() => window.__wh.store.state.bookmarks.length), 1);
  await page.screenshot({ path: 'test-results/translation.png' });
  await close();
  await page.keyboard.press('q'); await wait(); await page.keyboard.press('4'); await wait();
  assert.equal(await page.$$eval('.bookmark-card', (els) => els.length), 1);
  await page.screenshot({ path: 'test-results/bookmarks.png' }); await close();
  await page.evaluate(() => window.__wh.store.saveNow());
  await page.reload({ waitUntil: 'networkidle0' });
  // The saved language pair is restored on the title screen.
  await page.click('.title-actions .btn'); await page.waitForFunction(() => window.__wh?.scene.playing);
  assert.equal(await page.evaluate(() => window.__wh.store.state.bookmarks.length), 1);
  assert.equal(await page.evaluate(() => window.__wh.store.state.discoveries.length), 4);
  assert.match(await page.evaluate(() => window.__wh.store.state.chats.mia.map((l) => l.text).join(' ')), /library/);
  console.log('PASS phase 3: free chat before quest, popup bookmark, save/reload');
  await page.evaluate(() => { const { store, director } = window.__wh; store.newGame('en', 'es'); director.begin(true); });
  await wait();
  const finishStep = async (id) => {
    console.log('Quest interaction:', id);
    await page.evaluate((id) => { window.__wh.director.interact(id); }, id);
    for (let i = 0; i < 45; i++) {
      const status = await page.evaluate(async () => {
        const box = window.__wh.director.dialogue;
        if (!box.isOpen) return 'closed';
        if (box.busy) return 'busy';
        if (box.typingTimer) box.finishTyping();
        if (box.mode === 'task') await box.attempt(box.spec.model, false);
        else if (box.mode === 'chat') box.close();
        else if (box.pending?.kind === 'continue') box.advance();
        else if (box.pending?.kind === 'card') box.cardKeys(box.card.textContent.includes('Charlar') ? 2 : 1);
        return box.mode;
      });
      if (status === 'closed') break;
      await wait(150);
    }
    await wait();
  };
  for (const id of ['leo', 'tom', 'sam', 'lily', 'mia', 'biscuit', 'mia']) await finishStep(id);
  const story = await page.evaluate(() => ({ quests: window.__wh.store.state.quests, dog: window.__wh.store.state.dog }));
  for (const id of ['q1', 'q2', 'q3', 'r1', 'r2']) assert.equal(story.quests[id].status, 'done', id);
  assert.equal(story.dog, 'home');
  await wait(1200);
  await page.evaluate(() => { window.__wh.director.interact('lily'); });
  await wait();
  assert.doesNotMatch(await page.evaluate(() => window.__wh.director.dialogue.currentLine), /Welcome to the library/);
  await close();
  const inviter = await page.evaluate(async () => (await import('/src/game/systems/quests.js')).quests.inviter());
  await finishStep(inviter);
  assert.equal(await page.evaluate(() => window.__wh.store.state.dayDone), true);
  console.log('PASS phase 4: all main quests, side quests, dog return and festival');
  assert.deepEqual(errors, []);
  console.log('PASS no browser runtime errors');
} catch (e) {
  await page.screenshot({ path: 'test-results/failure.png' }).catch(() => {});
  console.log('Browser errors:', errors);
  console.log(await page.evaluate(() => ({ popup: document.querySelector('.translation-popup')?.outerHTML, line: document.querySelector('.dlg-line')?.outerHTML, open: window.__wh?.director.dialogue.isOpen })));
  throw e;
} finally { await browser.close(); }
