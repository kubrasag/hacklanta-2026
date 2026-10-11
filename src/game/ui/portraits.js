// portraits.js
// Pixel portraits for menus, cut from the character sprite sheets (front-facing frame).

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

// Where the face is inside each sheet: [x, y, size]
const CROPS = {
  character: [6, 2, 40],
  dog: [18, 0, 22],
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
  const [sx, sy, s] = texture === 'dog' ? CROPS.dog : CROPS.character;
  const img = image(texture);
  const draw = () => {
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
  };
  if (img.complete && img.naturalWidth) draw();
  else img.addEventListener('load', draw, { once: true });
  return canvas;
}

export function preloadPortraits() {
  ['player', 'dog', ...Object.values(NPCS).map((n) => n.texture)].forEach(image);
}
