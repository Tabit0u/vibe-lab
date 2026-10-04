/* =========================================================
 * signals.js — Event-bus pub/sub (le "système de signaux")
 * API : bus.on(event, fn) / bus.emit(event, payload)
 * ======================================================= */
function createSignalBus() {
  const listeners = new Map();
  return {
    on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(fn);
      return () => listeners.get(event)?.delete(fn);
    },
    emit(event, payload) {
      listeners.get(event)?.forEach((fn) => fn(payload));
    },
  };
}
const bus = createSignalBus();
