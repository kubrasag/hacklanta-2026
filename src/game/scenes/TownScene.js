// TownScene.js
// The village: map, walls, characters, light and life.
//
// Everything is sorted by its feet (depth = y), so you walk BEHIND trees, lamps and roofs,
// and only trunks, walls and props block you. The map data comes from tools/art/build_map.py.
//
// Controls: WASD / arrows to walk, E to talk, Q for the Quest Book, G to show walls (debug).

import * as Phaser from 'phaser';
import { bus } from '../core/bus';
import { NPCS, NPC_ORDER } from '../data/npcs';
import { typing } from '../ui/dom';
import { sfx } from '../audio/sfx';

const DIRS = { down: 0, left: 4, right: 8, up: 12 };
const CHAR_TEXTURES = ['player', 'guide', 'baker', 'barista', 'grocer', 'librarian'];
const FEET_ORIGIN = 64 / 66;
const SPEED = 135;
const TALK_RANGE = 58;

// Lamp heads that glow at night
const LAMPS = [[104, 500], [728, 300], [900, 128], [1328, 222], [585, 588], [1016, 540], [1568, 556], [1025, 912]];

// The camera tour behind the title screen
const TOUR = [[805, 600], [470, 330], [1130, 330], [1290, 900], [600, 860]];

const TIME_LOOK = {
  morning: { color: 0xffffff, alpha: 0 },
  afternoon: { color: 0xffd9a8, alpha: 0.28 },
  evening: { color: 0x5361a8, alpha: 0.62 },
};

export default class TownScene extends Phaser.Scene {
  constructor() {
    super('TownScene');
  }

  preload() {
    this.load.image('town', 'assets/town/town.png');
    this.load.atlas('town_fg', 'assets/town/town_fg.png', 'assets/town/town_fg.json');
    this.load.json('town_map', 'assets/town/town_map.json');
    CHAR_TEXTURES.forEach((key) => {
      this.load.spritesheet(key, `assets/characters/${key}.png`, { frameWidth: 52, frameHeight: 66 });
    });
    this.load.spritesheet('dog', 'assets/characters/dog.png', { frameWidth: 40, frameHeight: 32 });
  }

  create() {
    const map = this.cache.json.get('town_map');
    this.mapData = map;
    this.playing = false;
    this.isBlocked = () => false;
    this.labels = null;

    // 1) The village and the things you can walk behind
    this.add.image(0, 0, 'town').setOrigin(0).setDepth(-1);
    this.fgImages = map.fg.map((f) => {
      const img = this.add.image(f.x, f.y, 'town_fg', f.frame).setOrigin(0).setDepth(f.base);
      img.base = f.base;
      return img;
    });

    // 2) Walls: only trunks, building fronts, fences and props
    this.walls = this.physics.add.staticGroup();
    map.solids.forEach(([x, y, w, h]) => {
      this.walls.add(this.add.rectangle(x + w / 2, y + h / 2, w, h).setVisible(false));
    });
    this.debug = this.add.graphics().setDepth(20000).setVisible(false);
    this.debug.fillStyle(0xff0000, 0.3);
    map.solids.forEach(([x, y, w, h]) => this.debug.fillRect(x, y, w, h));
    this.debug.lineStyle(1, 0xffff00, 0.9);
    map.fg.forEach((f) => this.debug.lineBetween(f.x, f.base, f.x + 30, f.base));

    this.makeTextures();
    this.makeAnimations();

    // 3) Characters
    this.shadows = this.add.graphics().setDepth(0.5);
    this.player = this.physics.add.sprite(map.spawn[0], map.spawn[1], 'player', DIRS.up).setOrigin(0.5, FEET_ORIGIN);
    this.player.body.setSize(20, 10).setOffset(16, 54);
    this.player.setCollideWorldBounds(true);
    this.player.setVisible(false);
    this.physics.add.collider(this.player, this.walls);
    this.facing = 'up';

    this.npcs = {};
    NPC_ORDER.forEach((id) => {
      const [x, y] = map.npcs[id];
      const npc = this.physics.add.sprite(x, y, NPCS[id].texture, DIRS.down).setOrigin(0.5, FEET_ORIGIN);
      npc.body.setSize(22, 12).setOffset(15, 53);
      npc.body.setImmovable(true);
      npc.body.moves = false;
      npc.npcId = id;
      npc.home = [x, y];
      npc.lookTimer = Phaser.Math.Between(1500, 4000);
      this.physics.add.collider(this.player, npc);
      this.tweens.add({
        targets: npc, scaleY: 1.025, duration: 900 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Math.random() * 800,
      });
      this.npcs[id] = npc;
    });

    const [dx, dy] = map.npcs.biscuit;
    this.dog = this.add.sprite(dx, dy, 'dog', 0).setOrigin(0.5, 0.94).setVisible(false);
    this.dog.play('dog-wag-right');
    this.dogState = 'hidden';
    this.trail = [];

    // 4) Light: time-of-day tint, lamp glows, festival lanterns, particles
    this.tint = this.add.rectangle(0, 0, map.width, map.height, 0xffffff, 0).setOrigin(0).setDepth(9000)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.glows = LAMPS.map(([x, y]) => this.add.image(x, y, 'glow').setDepth(9001).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setScale(1.3));
    this.lanterns = [];
    const colors = [0xff8a5c, 0xffd36b, 0x8fe0ff, 0xff9fd0, 0xb6ff8f];
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      const x = 800 + Math.cos(a) * 150;
      const y = 548 + Math.sin(a) * 108;
      const lamp = this.add.image(x, y, 'lantern').setDepth(9002).setTint(colors[i % colors.length]).setAlpha(0);
      const halo = this.add.image(x, y, 'glow').setDepth(9001).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setScale(0.5).setTint(colors[i % colors.length]);
      this.tweens.add({ targets: [lamp, halo], y: y - 4, duration: 1200 + i * 37, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.lanterns.push(lamp, halo);
    }
    this.petals = this.add.particles(0, 0, 'petal', {
      x: { min: 0, max: map.width }, y: -10, lifespan: 14000, speedY: { min: 14, max: 28 }, speedX: { min: -12, max: 18 },
      rotate: { min: 0, max: 360 }, scale: { min: 0.7, max: 1.2 }, alpha: { start: 0.9, end: 0.4 }, frequency: 650, quantity: 1,
    }).setDepth(9003);
    this.fireflies = this.add.particles(0, 0, 'firefly', {
      x: { min: 100, max: map.width - 100 }, y: { min: 100, max: map.height - 100 }, lifespan: 4000,
      speedX: { min: -10, max: 10 }, speedY: { min: -10, max: 10 }, alpha: { start: 0, end: 1, ease: 'Sine.easeInOut' },
      scale: { start: 1, end: 0.4 }, frequency: 220, blendMode: 'ADD',
    }).setDepth(9004);
    this.fireflies.stop();

    // 5) Camera and input
    this.physics.world.setBounds(0, 0, map.width, map.height);
    const cam = this.cameras.main;
    cam.setBounds(0, 0, map.width, map.height);
    cam.setBackgroundColor('#2a3a1c');
    this.fitZoom();
    this.scale.on('resize', () => this.fitZoom());
    this.startTour();

    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT', false);
    // Key events (not polling), so even a very quick tap is never lost
    this.input.keyboard.on('keydown-E', () => {
      if (this.playing && this.nearId && !typing() && !this.isBlocked()) bus.emit('interact', this.nearId);
    });
    this.input.keyboard.on('keydown-Q', () => { if (this.playing && !typing()) bus.emit('book:toggle'); });
    this.input.keyboard.on('keydown-G', () => { if (!typing()) this.debug.setVisible(!this.debug.visible); });
    this.stepTimer = 0;
    this.saveTimer = 0;

    bus.emit('scene:ready', this);
  }

  // ---------- generated textures (no image files needed) ----------

  makeTextures() {
    const canvasTexture = (key, w, h, draw) => {
      if (this.textures.exists(key)) return;
      const tex = this.textures.createCanvas(key, w, h);
      draw(tex.getContext(), w, h);
      tex.refresh();
    };
    canvasTexture('glow', 128, 128, (ctx) => {
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,214,140,0.9)');
      g.addColorStop(0.35, 'rgba(255,180,90,0.35)');
      g.addColorStop(1, 'rgba(255,160,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
    });
    canvasTexture('lantern', 10, 12, (ctx) => {
      ctx.fillStyle = '#3a2415';
      ctx.fillRect(4, 0, 2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(2, 2, 6, 8);
      ctx.fillRect(0, 4, 10, 4);
      ctx.fillStyle = '#3a2415';
      ctx.fillRect(2, 10, 6, 2);
    });
    canvasTexture('petal', 6, 6, (ctx) => {
      ctx.fillStyle = '#ffc4dc';
      ctx.fillRect(2, 0, 2, 6);
      ctx.fillRect(0, 2, 6, 2);
      ctx.fillStyle = '#ff9cc4';
      ctx.fillRect(2, 2, 2, 2);
    });
    canvasTexture('firefly', 8, 8, (ctx) => {
      const g = ctx.createRadialGradient(4, 4, 0, 4, 4, 4);
      g.addColorStop(0, 'rgba(255,255,170,1)');
      g.addColorStop(1, 'rgba(255,240,120,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 8, 8);
    });
  }

  makeAnimations() {
    CHAR_TEXTURES.forEach((tex) => {
      Object.entries(DIRS).forEach(([dir, first]) => {
        const key = `${tex}-walk-${dir}`;
        if (this.anims.exists(key)) return;
        this.anims.create({ key, frames: this.anims.generateFrameNumbers(tex, { start: first, end: first + 3 }), frameRate: 8, repeat: -1 });
      });
    });
    const dogAnim = (key, frames, rate) => {
      if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers('dog', { frames }), frameRate: rate, repeat: -1 });
    };
    dogAnim('dog-wag-right', [0, 1], 4);
    dogAnim('dog-walk-right', [2, 3], 8);
    dogAnim('dog-wag-left', [4, 5], 4);
    dogAnim('dog-walk-left', [6, 7], 8);
  }

  fitZoom() {
    const { width, height } = this.scale.gameSize;
    const zoom = Phaser.Math.Clamp(Math.min(width / 700, height / 440), 1.5, 3.2);
    this.cameras.main.setZoom(Math.round(zoom * 4) / 4);
  }

  // ---------- title tour and starting to play ----------

  startTour() {
    const cam = this.cameras.main;
    let i = 0;
    const next = () => {
      if (this.playing) return;
      const [x, y] = TOUR[i % TOUR.length];
      i += 1;
      cam.pan(x, y, 7000, 'Sine.easeInOut', false, (c, progress) => { if (progress === 1) next(); });
    };
    cam.centerOn(TOUR[0][0], TOUR[0][1]);
    next();
  }

  // Called by the director when the player presses Start
  startPlay({ pos, time, dog }) {
    this.playing = true;
    const cam = this.cameras.main;
    cam.panEffect.reset();
    // Older saves keep outdoor positions; recover any invalid or former room coordinates.
    const validPos = Array.isArray(pos) && pos.length === 2 && pos.every(Number.isFinite)
      && pos[0] > 0 && pos[0] < this.mapData.width && pos[1] > 0 && pos[1] < this.mapData.height;
    const [x, y] = validPos ? pos : this.mapData.spawn;
    this.player.setPosition(x, y).setVisible(true);
    this.player.setFrame(DIRS.up);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.fadeIn(600, 20, 14, 8);
    this.setTime(time, false);
    this.setDog(dog);
  }

  // ---------- time of day ----------

  setTime(time, animate = true) {
    const look = TIME_LOOK[time] || TIME_LOOK.morning;
    const evening = time === 'evening';
    const dur = animate ? 2500 : 0;
    this.tint.setFillStyle(look.color, this.tint.fillAlpha);
    this.tweens.add({ targets: this.tint, fillAlpha: look.alpha, duration: dur });
    this.tweens.add({ targets: this.glows, alpha: evening ? 0.85 : 0, duration: dur });
    this.tweens.add({ targets: this.lanterns, alpha: evening ? 1 : 0, duration: dur });
    if (evening) {
      this.fireflies.start();
      this.petals.stop();
    } else {
      this.fireflies.stop();
      this.petals.start();
    }
    this.time.delayedCall(animate ? 600 : 0, () => this.placeNpcs(evening));
  }

  // In the evening everyone gathers at the fountain
  placeNpcs(festival) {
    const spots = festival ? this.mapData.festival : this.mapData.npcs;
    NPC_ORDER.forEach((id) => {
      const npc = this.npcs[id];
      const [x, y] = spots[id];
      if (npc.x === x && npc.y === y) return;
      this.tweens.add({
        targets: npc, alpha: 0, duration: 250,
        onComplete: () => {
          npc.setPosition(x, y);
          npc.body.reset(x, y);
          npc.home = [x, y];
          this.tweens.add({ targets: npc, alpha: 1, duration: 300 });
        },
      });
    });
    this.festival = festival;
    if (this.dogState === 'home') this.setDog('home');
  }

  // ---------- Biscuit ----------

  setDog(state) {
    this.dogState = state;
    const map = this.mapData;
    if (state === 'hidden') {
      this.dog.setVisible(false);
    } else if (state === 'lost') {
      const [x, y] = map.npcs.biscuit;
      this.dog.setVisible(true).setPosition(x, y).play('dog-wag-left', true);
    } else if (state === 'following') {
      this.dog.setVisible(true);
      this.trail = [];
    } else if (state === 'home') {
      const [x, y] = this.festival ? map.festival.biscuit : [map.npcs.mia[0] + 34, map.npcs.mia[1] + 4];
      this.dog.setVisible(true).setPosition(x, y).play('dog-wag-left', true);
    }
  }

  // ---------- helpers for the director ----------

  conversationContext() {
    return { location: `Outside ${this.festival ? 'at the fountain for the Lantern Festival' : 'on the village paths near the buildings'}. Both speakers are OUTSIDE. Buildings cannot be entered; all conversations, shopping, book requests, and quests happen outdoors.` };
  }

  npcSprite(id) {
    if (id === 'biscuit') return this.dog.visible ? this.dog : null;
    return this.npcs[id]?.visible ? this.npcs[id] : null;
  }

  faceEachOther(id) {
    const npc = this.npcSprite(id);
    if (!npc) return;
    const dx = this.player.x - npc.x;
    const dy = this.player.y - npc.y;
    if (id !== 'biscuit') npc.setFrame(DIRS[this.dirFrom(dx, dy)]);
    this.facing = this.dirFrom(-dx, -dy);
    this.player.anims.stop();
    this.player.setFrame(DIRS[this.facing]);
  }

  dirFrom(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
    return dy < 0 ? 'up' : 'down';
  }

  // While talking, nudge the camera so both characters sit above the dialogue box
  setTalkCamera(on) {
    const cam = this.cameras.main;
    this.tweens.add({ targets: cam.followOffset, y: on ? -70 : 0, duration: 400, ease: 'Sine.easeOut' });
  }

  screenOf(x, y) {
    const cam = this.cameras.main;
    const v = cam.worldView;
    return { x: (x - v.x) * cam.zoom, y: (y - v.y) * cam.zoom };
  }

  // ---------- every frame ----------

  update(time, delta) {
    const k = this.keys;

    this.updateNpcs(delta);
    this.updateDog(delta);
    this.drawShadows();
    this.fadeCovers();
    if (!this.playing) {
      this.updateLabels(null);
      return;
    }

    const blocked = this.isBlocked() || typing();
    let vx = 0;
    let vy = 0;
    if (!blocked) {
      if (k.LEFT.isDown || k.A.isDown) vx = -1;
      if (k.RIGHT.isDown || k.D.isDown) vx = 1;
      if (k.UP.isDown || k.W.isDown) vy = -1;
      if (k.DOWN.isDown || k.S.isDown) vy = 1;
    }
    this.player.setVelocity(vx, vy);
    this.player.body.velocity.normalize().scale(SPEED);
    this.player.setDepth(this.player.y);

    if (vx < 0) this.facing = 'left';
    else if (vx > 0) this.facing = 'right';
    else if (vy < 0) this.facing = 'up';
    else if (vy > 0) this.facing = 'down';
    const moving = vx !== 0 || vy !== 0;
    if (moving) {
      this.player.anims.play(`player-walk-${this.facing}`, true);
      this.stepTimer -= delta;
      if (this.stepTimer <= 0) { sfx.step(); this.stepTimer = 300; }
      this.trail.push([this.player.x, this.player.y]);
      if (this.trail.length > 40) this.trail.shift();
    } else {
      this.player.anims.stop();
      this.player.setFrame(DIRS[this.facing]);
    }

    // Who is close enough to talk to? (E is handled by the keydown-E event above)
    const near = blocked ? null : this.nearest();
    this.nearId = near;

    this.saveTimer -= delta;
    if (this.saveTimer <= 0) {
      this.saveTimer = 2000;
      bus.emit('player:pos', [Math.round(this.player.x), Math.round(this.player.y)]);
    }
    bus.emit('player:moved', this.player);
    this.updateLabels(near);
  }

  nearest() {
    let best = null;
    let bestD = TALK_RANGE;
    const check = (id, sprite) => {
      if (!sprite || !sprite.visible) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, sprite.x, sprite.y);
      if (d < bestD) { bestD = d; best = id; }
    };
    NPC_ORDER.forEach((id) => check(id, this.npcs[id]));
    if (this.dogState === 'lost') check('biscuit', this.dog);
    return best;
  }

  updateNpcs(delta) {
    NPC_ORDER.forEach((id) => {
      const npc = this.npcs[id];
      npc.setDepth(npc.y);
      if (!this.playing || this.isBlocked()) return;
      // Villagers glance at you when you walk by, and look around now and then
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
      if (d < 110) {
        npc.setFrame(DIRS[this.dirFrom(this.player.x - npc.x, this.player.y - npc.y)]);
        return;
      }
      npc.lookTimer -= delta;
      if (npc.lookTimer <= 0) {
        npc.lookTimer = Phaser.Math.Between(2500, 6000);
        npc.setFrame(DIRS[Phaser.Utils.Array.GetRandom(['down', 'down', 'left', 'right'])]);
      }
    });
  }

  updateDog(delta) {
    const dog = this.dog;
    dog.setDepth(dog.y);
    if (this.dogState !== 'following' || !this.playing) return;
    const target = this.trail.length > 18 ? this.trail[this.trail.length - 18] : [this.player.x - 24, this.player.y + 4];
    const dx = target[0] - dog.x;
    const dy = target[1] - dog.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 6) {
      const step = Math.min(dist, (SPEED + 15) * (delta / 1000));
      dog.x += (dx / dist) * step;
      dog.y += (dy / dist) * step;
      dog.play(dx < 0 ? 'dog-walk-left' : 'dog-walk-right', true);
      dog.lastSide = dx < 0 ? 'left' : 'right';
    } else {
      dog.play(`dog-wag-${dog.lastSide || 'right'}`, true);
    }
  }

  // Trees and roofs you walk behind turn see-through, so you never lose your character
  fadeCovers() {
    const p = this.player;
    const visible = p.visible;
    const left = p.x - 12;
    const right = p.x + 12;
    const top = p.y - 58;
    this.fgImages.forEach((img) => {
      const covering = visible && img.base > p.y && right > img.x && left < img.x + img.width
        && p.y > img.y && top < img.y + img.height && img.width * img.height > 1600;
      const target = covering ? 0.5 : 1;
      if (img.alpha !== target) img.setAlpha(Phaser.Math.Linear(img.alpha, target, 0.2) + (covering ? -0.001 : 0.001));
      if (Math.abs(img.alpha - target) < 0.02) img.setAlpha(target);
    });
  }

  drawShadows() {
    const g = this.shadows;
    g.clear();
    g.fillStyle(0x000000, 0.22);
    const all = [...NPC_ORDER.map((id) => this.npcs[id])];
    if (this.player.visible) all.push(this.player);
    all.forEach((s) => { if (s.visible && s.alpha > 0.5) g.fillEllipse(s.x, s.y - 1, 26, 8); });
    if (this.dog.visible) g.fillEllipse(this.dog.x, this.dog.y - 1, 28, 7);
  }

  updateLabels(near) {
    if (!this.labels) return;
    const cam = this.cameras.main;
    const v = cam.worldView;
    const pos = {};
    const put = (id, sprite, h) => {
      if (!sprite || !sprite.visible) return;
      const p = this.screenOf(sprite.x, sprite.y - h);
      const visible = this.playing && sprite.x > v.x - 40 && sprite.x < v.right + 40 && sprite.y > v.y - 20 && sprite.y < v.bottom + 90;
      pos[id] = { ...p, visible };
    };
    NPC_ORDER.forEach((id) => put(id, this.npcs[id], 64));
    put('biscuit', this.dog, 30);
    this.labels.update(pos);
    this.labelPositions = pos;
    if (near !== this.lastNear) {
      this.lastNear = near;
      bus.emit('labels:near', near);
    }
  }
}
