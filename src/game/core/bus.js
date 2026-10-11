// bus.js
// A tiny event system so the game world (Phaser) and the menus (HTML) can talk
// without knowing about each other.
//   bus.on('quest:updated', fn)    bus.emit('quest:updated', data)

const listeners = new Map();

export const bus = {
  on(name, fn) {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(fn);
    return () => listeners.get(name).delete(fn);
  },
  emit(name, data) {
    (listeners.get(name) || []).forEach((fn) => fn(data));
  },
};
