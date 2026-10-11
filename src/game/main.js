// main.js
// The Phaser game. "smoothPixelArt" keeps pixels crisp at any camera zoom,
// without the shimmering you get from nearest-neighbour scaling.

import { WEBGL, Game, Scale } from 'phaser';
import TownScene from './scenes/TownScene';

export function startGame(parent) {
  return new Game({
    type: WEBGL,
    parent,
    backgroundColor: '#1a1410',
    render: { smoothPixelArt: true },
    physics: { default: 'arcade', arcade: { debug: false } },
    scale: { mode: Scale.RESIZE, width: '100%', height: '100%' },
    scene: [TownScene],
  });
}
