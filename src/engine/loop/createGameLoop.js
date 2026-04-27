export function createGameLoop({ state, events, runtime }) {
  let started = false;

  return {
    start() {
      if (started) return;
      started = true;
      events.emit('game:booted', { state });
      runtime.render();
      console.log('[tfto] game loop started');
    },
  };
}
