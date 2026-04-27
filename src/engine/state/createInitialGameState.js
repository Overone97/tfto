import { createBoardState } from '../../domain/board/createBoardState.js';
import { createBattleState } from '../../domain/battle/createBattleState.js';
import { createStartingUnits } from '../../domain/units/createStartingUnits.js';

export function createInitialGameState() {
  return {
    meta: {
      version: '0.0.1',
      phase: 'foundation',
    },
    player: null,
    board: createBoardState(),
    bench: [],
    shop: [],
    round: null,
    battle: createBattleState(),
    economy: null,
    roster: createStartingUnits(),
    synergies: [],
  };
}
