// TownScene.js  (Phaser 3, Arcade Physics)
// Files in your Vite project's public/ folder:
//   public/assets/town/town_bg.png
//   public/assets/town/town_collision.json
//   public/assets/player/player.png      (4x4 spritesheet, 52x66 frames)
//
// Controls: WASD / arrows to walk, E to talk or enter a door, G to show collision, M to mute voices.

import * as Phaser from 'phaser';
import DialogueBox from '../ui/DialogueBox';
import { NPCS } from '../data/npcs';
import { setMuted, isMuted } from '../audio/voice';

// Spritesheet layout: one row per direction, 4 walking frames each
const DIRS = { down: 0, left: 4, right: 8, up: 12 };

export default class TownScene extends Phaser.Scene {
  constructor() {
    super('TownScene');
  }

  preload() {
    this.load.image('town_bg', 'assets/town/town_bg.png');
    this.load.json('town_data', 'assets/town/town_collision.json');
    this.load.spritesheet('player', 'assets/player/player.png', {
      frameWidth: 52,
      frameHeight: 66,
    });
    // Each NPC has its own spritesheet in public/assets/npcs/
    NPCS.forEach((n) => {
      this.load.spritesheet(n.texture, `assets/npcs/${n.texture}.png`, {
        frameWidth: 52,
        frameHeight: 66,
      });
    });
  }

  create() {
    const data = this.cache.json.get('town_data');
    const C = data.cellSize;
    const mapW = data.imageWidth;
    const mapH = data.imageHeight;

    // 1) The painted map
    this.add.image(0, 0, 'town_bg').setOrigin(0).setDepth(0);

    // 2) Invisible walls (solid cells in a row are merged into one rectangle)
    this.walls = this.physics.add.staticGroup();
    this.debugLayer = this.add.graphics().setDepth(50).setVisible(false);
    this.debugLayer.fillStyle(0xff0000, 0.35);

    data.collision.forEach((row, y) => {
      let start = -1;
      for (let x = 0; x <= row.length; x++) {
        const isSolid = x < row.length && row[x] === 1;
        if (isSolid && start === -1) start = x;
        if (!isSolid && start !== -1) {
          const w = (x - start) * C;
          this.walls.add(this.add.rectangle(start * C + w / 2, y * C + C / 2, w, C));
          this.debugLayer.fillRect(start * C, y * C, w, C);
          start = -1;
        }
      }
    });

    // 3) Walking animations: 4 frames per direction
    Object.entries(DIRS).forEach(([dir, first]) => {
      if (this.anims.exists(`walk-${dir}`)) return;
      this.anims.create({
        key: `walk-${dir}`,
        frames: this.anims.generateFrameNumbers('player', { start: first, end: first + 3 }),
        frameRate: 8,
        repeat: -1,
      });
    });

    // 4) Player sprite with a small soft shadow under the feet
    this.shadow = this.add.ellipse(0, 0, 26, 8, 0x000000, 0.25).setDepth(9);
    this.player = this.physics.add.sprite(data.spawn.x, data.spawn.y, 'player', DIRS.down)
      .setDepth(10);
    // Only the feet collide, so the head can overlap things above (looks natural)
    this.player.body.setSize(20, 10).setOffset(16, 54);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.walls);
    this.facing = 'down';

    // NPCs: they stand still, block the player and can be talked to with E
    this.npcs = NPCS.map((n) => {
      this.add.ellipse(n.x, n.y + 30, 26, 8, 0x000000, 0.25).setDepth(9);
      const npc = this.physics.add.sprite(n.x, n.y, n.texture, DIRS.down).setDepth(10);
      npc.body.setSize(20, 10).setOffset(16, 54);
      npc.body.setImmovable(true);
      npc.body.moves = false;
      npc.info = n;
      this.physics.add.collider(this.player, npc);
      return npc;
    });

    this.dialogue = new DialogueBox();
    this.events.once('shutdown', () => this.dialogue.destroy());

    // 5) Door zones (pixel coordinates)
    this.debugLayer.lineStyle(2, 0xffff00, 1);
    this.zones = data.zones.map((z) => {
      const zone = this.add.zone(z.x, z.y, z.w, z.h).setOrigin(0);
      this.physics.add.existing(zone, true);
      zone.info = z;
      this.debugLayer.strokeRect(z.x, z.y, z.w, z.h);
      return zone;
    });

    this.prompt = this.add.text(0, 0, '', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffffff',
      backgroundColor: '#3a2e28', padding: { x: 4, y: 2 },
    }).setDepth(30).setOrigin(0.5, 1).setVisible(false);

    // 6) Camera and input
    this.physics.world.setBounds(0, 0, mapW, mapH);
    this.cameras.main.setBounds(0, 0, mapW, mapH);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.5);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,E,G,M');
  }

  update() {
    const speed = 120;
    const k = this.keys;
    const c = this.cursors;
    const pressedE = Phaser.Input.Keyboard.JustDown(k.E);

    this.shadow.setPosition(this.player.x, this.player.y + 30);

    // While talking, the player stands still and E moves the conversation forward
    if (this.dialogue.isOpen) {
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
      this.player.setFrame(DIRS[this.facing]);
      this.prompt.setVisible(false);
      if (pressedE) this.dialogue.next();
      return;
    }

    let vx = 0;
    let vy = 0;
    if (c.left.isDown || k.A.isDown) vx = -1;
    if (c.right.isDown || k.D.isDown) vx = 1;
    if (c.up.isDown || k.W.isDown) vy = -1;
    if (c.down.isDown || k.S.isDown) vy = 1;

    this.player.setVelocity(vx, vy);
    this.player.body.velocity.normalize().scale(speed);

    // Pick the animation. Sideways wins when moving diagonally.
    if (vx < 0) this.facing = 'left';
    else if (vx > 0) this.facing = 'right';
    else if (vy < 0) this.facing = 'up';
    else if (vy > 0) this.facing = 'down';

    if (vx !== 0 || vy !== 0) {
      this.player.anims.play(`walk-${this.facing}`, true);
    } else {
      this.player.anims.stop();
      this.player.setFrame(DIRS[this.facing]);   // stand still, facing the last direction
    }

    if (Phaser.Input.Keyboard.JustDown(k.M)) {
      setMuted(!isMuted());
      console.log(isMuted() ? 'Voices muted' : 'Voices on');
    }

    if (Phaser.Input.Keyboard.JustDown(k.G)) {
      this.debugLayer.setVisible(!this.debugLayer.visible);
    }

    // Is an NPC close enough to talk to? NPCs win over doors.
    const npc = this.npcs.find(
      (n) => Phaser.Math.Distance.Between(this.player.x, this.player.y, n.x, n.y) < 50,
    );
    if (npc) {
      this.showPrompt(`E: Talk to ${npc.info.name}`);
      if (pressedE) this.talkTo(npc);
      return;
    }

    const near = this.zones.find((z) => this.physics.overlap(this.player, z));
    if (near) {
      this.showPrompt(`E: ${near.info.label}`);
      if (pressedE) {
        // Later: this.scene.start('BakeryScene') etc.
        console.log('Enter:', near.info.name);
      }
    } else {
      this.prompt.setVisible(false);
    }
  }

  showPrompt(label) {
    this.prompt.setText(label)
      .setPosition(this.player.x, this.player.y - 36)
      .setVisible(true);
  }

  talkTo(npc) {
    // Turn the NPC to face the player
    const dx = this.player.x - npc.x;
    const dy = this.player.y - npc.y;
    let dir;
    if (Math.abs(dx) > Math.abs(dy)) dir = dx < 0 ? 'left' : 'right';
    else dir = dy < 0 ? 'up' : 'down';
    npc.setFrame(DIRS[dir]);

    this.prompt.setVisible(false);
    this.dialogue.open(npc.info.name, npc.info.dialogue, () => {
      npc.setFrame(DIRS.down);
    }, npc.info.voiceId);
  }
}
