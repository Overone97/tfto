export function createEventBus() {
  const listeners = new Map();

  return {
    on(eventName, handler) {
      const handlers = listeners.get(eventName) || [];
      handlers.push(handler);
      listeners.set(eventName, handlers);
    },
    emit(eventName, payload) {
      const handlers = listeners.get(eventName) || [];
      handlers.forEach(handler => handler(payload));
    },
  };
}
