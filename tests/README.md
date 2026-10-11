# Village regression checks

Start Vite with `npm run dev -- --port 8090`, then run `node tests/village-browser.mjs`.
The test uses `puppeteer-core` and a locally installed Chrome. Install the test dependency with
`npm install --no-save puppeteer-core`, or set `PUPPETEER_MODULE` to an existing installation's
`lib/esm/puppeteer/puppeteer-core.js`. Set `CHROME_PATH` for a different browser executable.
Screenshots are written to the ignored `test-results/` directory.

The browser test mocks API calls and covers NPC memory, all four interiors, story discoveries,
translation bookmarks, reload persistence, and every main and side quest through the festival.

For opt-in live checks, start the API on port 3011 and run `node tests/live-api.mjs`.
This uses the configured Gemini account with **fictional test dialogue only**, and consumes API quota.
`--consistency` skips regenerating the five backstories. `API_URL` overrides the server URL.
