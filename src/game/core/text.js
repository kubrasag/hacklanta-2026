// text.js
// Small helpers for comparing what the player said with the words we teach.
// Speech recognition is messy, so we compare simplified text:
//   "¡Quisiera un CRUASÁN!" -> "quisiera un cruasan"
//   "Teşekkürler"           -> "tesekkurler"

export function simplify(text) {
  return String(text || '')
    .replace(/ı/g, 'i')            // Turkish dotless i
    .replace(/İ/g, 'i')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // drop accent marks
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Does the sentence contain this pattern? Patterns are matched at word starts,
// so "ven" matches "ven aqui" but not "verano". A pattern ending in "*" is a prefix.
export function hasPattern(sentence, pattern) {
  const s = ` ${simplify(sentence)} `;
  const prefix = pattern.endsWith('*');
  const p = simplify(prefix ? pattern.slice(0, -1) : pattern);
  if (!p) return false;
  if (prefix) return s.includes(` ${p}`);
  return s.includes(` ${p} `);
}

export function fill(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (m, key) => (vars[key] !== undefined ? vars[key] : m));
}

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function capitalize(word) {
  if (!word) return word;
  return word.charAt(0).toLocaleUpperCase() + word.slice(1);
}

// Deterministic shuffle, so the same question always shows the same order
export function shuffle(list, seed = 1) {
  const out = [...list];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
