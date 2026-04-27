export function createInitialGameState() {
  return {
    meta: {
      version: '0.1.0',
      phase: 'foundation',
    },
    player: null,
    board: null,
    bench: [],
    shop: [],
    round: null,
    battle: null,
    economy: null,
    roster: [],
    synergies: [],
  };
}
