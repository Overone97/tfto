import { createBoardState } from '../../domain/board/createBoardState.js';
import { createBattleState } from '../../domain/battle/createBattleState.js';

export function createInitialGameState() {
  return {
    meta: {
      version: '0.0.2',
      phase: 'prototype',
      message: 'Achète des unités, place-les sur tes 2 dernières lignes, puis lance le combat.',
      selectedBenchUnitId: null,
    },
    player: {
      gold: 6,
      lives: 100,
      level: 3,
      wins: 0,
    },
    board: createBoardState(),
    bench: [],
    shop: [],
    round: {
      number: 1,
    },
    battle: createBattleState(),
    economy: {
      rerollCost: 1,
    },
    roster: [],
    synergies: [],
  };
}
