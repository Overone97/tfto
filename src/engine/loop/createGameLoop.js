export function createGameLoop({ state, events }) {
  let started = false;

  return {
    start() {
      if (started) return;
      started = true;
      events.emit('game:booted', { state });
      console.log('[tfto] game loop started');
    },
  };
}
