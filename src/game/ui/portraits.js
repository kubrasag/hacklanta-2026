// portraits.js
// Pixel portraits for menus, cut from the character sprite sheets (front-facing frame).
// Faces are drawn at a whole-number zoom (1x, 2x, 3x), so every pixel stays sharp.

import { NPCS } from '../data/npcs';

const images = new Map();

function image(texture) {
  if (!images.has(texture)) {
    const img = new Image();
    img.src = `assets/characters/${texture}.png`;
    images.set(texture, img);
  }
  return images.get(texture);
}

// Where the face is in each sheet: center x, center y, and the size of a "close-up"
const FACES = {
  character: { cx: 26, cy: 24, crop: 40 },
  player: { cx: 26, cy: 24, crop: 30 },
  dog: { cx: 29, cy: 9, crop: 20 },
};

export function textureOf(who) {
  if (who === 'player') return 'player';
  if (who === 'biscuit') return 'dog';
  return NPCS[who]?.texture || 'player';
}

// Returns a <canvas> that draws itself as soon as the sheet has loaded
export function portrait(who, size = 80) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const texture = textureOf(who);
  const face = FACES[texture] || FACES.character;
  const zoom = Math.max(1, Math.round(size / face.crop));
  const crop = face.crop;
  canvas.width = crop * zoom;
  canvas.height = crop * zoom;
  const img = image(texture);
  const draw = () => {
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, face.cx - crop / 2, face.cy - crop / 2, crop, crop, 0, 0, canvas.width, canvas.height);
  };
  if (img.complete && img.naturalWidth) draw();
  else img.addEventListener('load', draw, { once: true });
  return canvas;
}

export function preloadPortraits() {
  ['player', 'dog', ...Object.values(NPCS).map((n) => n.texture)].forEach(image);
}
