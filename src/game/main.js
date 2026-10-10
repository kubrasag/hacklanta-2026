import { Game as MainGame } from './scenes/Game';
import TownScene from './scenes/TownScene';
import { AUTO, Game, Scale } from 'phaser';

const config = {
    type: AUTO,
    width: 1024,
    height: 768,
    parent: 'game-container',
    backgroundColor: '#000000',
    pixelArt: true,
    physics: { default: 'arcade', arcade: { debug: false } },
    scale: {
        mode: Scale.RESIZE,
        autoCenter: Scale.CENTER_BOTH,
    },
    scene: [TownScene, MainGame],
};

const StartGame = (parent) => {
    return new Game({ ...config, parent });
};

export default StartGame;