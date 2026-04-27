import { createInitialGameState } from '../engine/state/createInitialGameState.js';
import { createEventBus } from '../engine/events/createEventBus.js';
import { createGameLoop } from '../engine/loop/createGameLoop.js';
import { createGameRuntime } from '../core/createGameRuntime.js';

export function bootstrapGame() {
  const state = createInitialGameState();
  const events = createEventBus();
  const runtime = createGameRuntime({ state, events });

  const loop = createGameLoop({ state, events, runtime });
  loop.start();

  if (typeof window !== 'undefined') {
    window.__TFTO__ = { state, events, loop, runtime };
  }
}
