import { INTERIORS } from '../data/interiors';
import { H } from '../state/store';
import { NPC_ORDER } from '../data/npcs';
import { bus } from '../core/bus';

const X = 2100, Y = 100, W = 640, HGT = 440;

export function fitInteriorCamera(scene) {
  const cam = scene.cameras.main;
  const width = Math.max(W, scene.scale.width / cam.zoom);
  const height = Math.max(HGT, scene.scale.height / cam.zoom);
  cam.setBounds(X - (width - W) / 2, Y - (height - HGT) / 2, width, height);
  cam.setBackgroundColor('#302c35');
}

// Code-drawn pixel furnishings use the same palette and camera as the town.
function furnish(scene, p, color) {
  const x = X + p.x, y = Y + p.y;
  const g = scene.add.graphics().setDepth(y);
  const rect = (dx, dy, w, h, c) => g.fillStyle(c).fillRect(x + dx, y + dy, w, h);
  rect(-45, -8, 90, 16, 0x4b3028);
  rect(-40, -58, 80, 54, 0x85573d);
  rect(-44, -60, 88, 9, 0xc39160);
  if (p.kind === 'shelf' || p.kind === 'crates') {
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 7; i++) rect(-34 + i * 10, -48 + row * 23, 7, 17, [0xe6b95c, 0x91af88, 0xbf7063, 0x9b99bf][i % 4]);
      rect(-40, -28 + row * 23, 80, 4, 0xd6ab76);
    }
  } else if (p.kind === 'oven') {
    rect(-42, -78, 84, 75, 0x846b60); rect(-29, -53, 58, 48, 0x3b2928);
    rect(-22, -28, 44, 18, 0xef9650); rect(-10, -38, 20, 25, 0xf7cf7a);
    for (let i = 0; i < 3; i++) rect(-36 + i * 25, -72, 20, 8, 0xb59680);
  } else if (p.kind === 'painting') {
    rect(-39, -77, 78, 70, 0x4b3028); rect(-32, -70, 64, 55, 0xc2dfe0);
    rect(-32, -38, 64, 23, 0x99b577); rect(-12, -49, 29, 25, 0xd6ac7e); rect(-16, -56, 37, 10, 0xb66d46);
  } else if (p.kind === 'bed') {
    rect(-40, -50, 80, 48, 0xd6ab76); rect(-33, -42, 66, 35, color); rect(-28, -37, 30, 18, 0xf8e6c1);
  } else if (p.kind === 'pumpkin') {
    rect(-32, -59, 64, 54, 0xc77839); rect(-23, -66, 46, 62, 0xeaa34e); rect(-3, -76, 8, 16, 0x697649);
  } else {
    rect(-44, -44, 88, 14, 0xd6ab76); rect(-30, -50, 32, 7, 0xf5e5b9);
    rect(12, -65, 17, 25, color); rect(12, -67, 17, 5, 0xf7d990);
    rect(-29, -48, 24, 2, 0x927959);
  }
  const body = scene.add.rectangle(x, y - 12, 90, 24).setVisible(false);
  scene.roomWalls.add(body);
  return g;
}

export function installInteriors(scene) {
  scene.roomObjects = [];
  scene.roomWalls = scene.physics.add.staticGroup();
  scene.physics.add.collider(scene.player, scene.roomWalls);
  scene.roomHint = document.createElement('div');
  scene.roomHint.className = 'room-hint';
  document.getElementById('ui').append(scene.roomHint);
  scene.input.keyboard.on('keydown-F', () => {
    if (!scene.playing || scene.isBlocked() || /INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
    if (scene.currentInterior) exitInterior(scene);
    else if (scene.nearDoor) enterInterior(scene, scene.nearDoor);
  });
  scene.input.keyboard.on('keydown-E', () => {
    if (scene.playing && !scene.isBlocked() && !scene.nearId && scene.nearProp && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) bus.emit('inspect', scene.nearProp);
  });
}

export function enterInterior(scene, id) {
  const room = INTERIORS[id];
  if (!room || scene.currentInterior) return;
  scene.currentInterior = { ...room, id };
  scene.returnPos = [scene.player.x, scene.player.y];
  scene.roomNpcPositions = Object.fromEntries(NPC_ORDER.map((n) => [n, [scene.npcs[n].x, scene.npcs[n].y]]));
  scene.nearId = null;
  scene.nearProp = null;
  const g = scene.add.graphics().setDepth(-1);
  const rect = (x, y, w, h, c) => g.fillStyle(c).fillRect(X + x, Y + y, w, h);
  rect(0, 0, W, HGT, 0x302c35); rect(16, 26, 608, 396, 0xd8b17d);
  rect(16, 26, 608, 100, room.color); rect(16, 116, 608, 12, 0x654435);
  for (let y = 130; y < 420; y += 24) {
    rect(16, y, 608, 2, 0xbc9364);
    for (let x = 16 + (y % 48 ? 0 : 40); x < 620; x += 80) rect(x, y, 2, Math.min(24, 420 - y), 0xc79e6c);
  }
  rect(218, 210, 204, 128, room.color); rect(226, 218, 188, 112, 0xd4b480);
  rect(238, 230, 164, 88, room.color);
  for (const x of [90, 475]) {
    rect(x, 42, 70, 65, 0x684e3e); rect(x + 6, 48, 58, 53, 0xa7cbd2);
    rect(x + 32, 48, 5, 53, 0x684e3e); rect(x + 6, 72, 58, 5, 0x684e3e);
  }
  rect(286, 398, 68, 24, 0x684e3e); rect(294, 400, 52, 18, 0xb28257);
  scene.roomObjects.push(g, ...room.props.map((p) => furnish(scene, p, room.color)));
  const title = scene.add.text(X + W / 2, Y + 50, H(room.name), { fontFamily: 'serif', fontSize: '20px', color: '#fff0ce', stroke: '#48332b', strokeThickness: 4 }).setOrigin(0.5).setDepth(8000);
  scene.roomObjects.push(title);
  scene.physics.world.setBounds(X + 20, Y + 145, W - 40, HGT - 170);
  fitInteriorCamera(scene);
  scene.player.body.reset(X + 320, Y + 365);
  scene.player.setVelocity(0);
  scene.cameras.main.centerOn(scene.player.x, scene.player.y);
  NPC_ORDER.forEach((n) => {
    const visible = n === room.owner && !scene.festival;
    scene.npcs[n].setVisible(visible);
    scene.npcs[n].body.enable = visible;
    if (visible) scene.npcs[n].body.reset(X + 320, Y + 185);
  });
  scene.trail = [];
  scene.dog.setVisible(scene.dogState === 'following' || (scene.dogState === 'home' && id === 'cafe' && !scene.festival));
  if (scene.dog.visible) scene.dog.setPosition(scene.player.x - 30, scene.player.y);
  scene.petals.setVisible(false); scene.fireflies.setVisible(false);
  scene.debug.setVisible(false);
  scene.cameras.main.fadeIn(250);
}

export function exitInterior(scene) {
  if (!scene.currentInterior) return;
  scene.currentInterior = null;
  scene.roomWalls.clear(true, true);
  scene.roomObjects.forEach((o) => o.destroy()); scene.roomObjects = [];
  scene.physics.world.setBounds(0, 0, scene.mapData.width, scene.mapData.height);
  scene.cameras.main.setBounds(0, 0, scene.mapData.width, scene.mapData.height);
  scene.cameras.main.setBackgroundColor('#2a3a1c');
  scene.player.body.reset(...scene.returnPos);
  scene.player.setVelocity(0);
  NPC_ORDER.forEach((n) => {
    scene.npcs[n].setVisible(true); scene.npcs[n].body.enable = true;
    scene.npcs[n].body.reset(...scene.roomNpcPositions[n]);
  });
  if (scene.pendingFestival !== undefined) { scene.placeNpcs(scene.pendingFestival); delete scene.pendingFestival; }
  scene.trail = [];
  scene.setDog(scene.dogState);
  if (scene.dogState === 'following') scene.dog.setPosition(scene.player.x - 24, scene.player.y);
  scene.petals.setVisible(true); scene.fireflies.setVisible(true);
  scene.nearProp = null;
  scene.cameras.main.fadeIn(250);
}

export function updateInteriors(scene) {
  const hint = scene.roomHint;
  hint.hidden = !scene.playing || scene.isBlocked();
  scene.nearDoor = null; scene.nearProp = null;
  if (scene.currentInterior) {
    const room = scene.currentInterior;
    scene.nearProp = room.props.find((p) => Math.hypot(scene.player.x - X - p.x, scene.player.y - Y - p.y) < 75);
    hint.textContent = `${H(room.name)} · F: ${H({ en: 'Go outside', tr: 'Dışarı çık', es: 'Salir' })}`;
    if (scene.nearProp && !scene.nearId) hint.textContent += ` · E: ${H(scene.nearProp.name)}`;
    else if (scene.festival) hint.textContent += ` · ${H({ en: 'Everyone is at the festival', tr: 'Herkes şenlikte', es: 'Todos están en el festival' })}`;
  } else {
    scene.nearDoor = Object.keys(INTERIORS).find((id) => Math.hypot(scene.player.x - scene.mapData.places[id][0], scene.player.y - scene.mapData.places[id][1]) < 75);
    hint.textContent = scene.nearDoor ? `F: ${H({ en: 'Enter', tr: 'Gir', es: 'Entrar' })} · ${H(INTERIORS[scene.nearDoor].name)}` : '';
    hint.hidden ||= !scene.nearDoor;
  }
}
