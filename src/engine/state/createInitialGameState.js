import { createBoardState } from '../../domain/board/createBoardState.js';
import { createBattleState } from '../../domain/battle/createBattleState.js';

export function createInitialGameState() {
  return {
    meta: {
      version: '0.0.3',
      phase: 'prototype-plus',
      message: 'Achète des unités, fusionne-les par 3, active des synergies et gère ton éco.',
      selectedBenchUnitId: null,
      lastIncome: null,
      lastFusion: null,
    },
    player: {
      gold: 8,
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
      baseIncome: 4,
      interestStep: 5,
      maxInterest: 3,
    },
    roster: [],
    synergies: [],
  };
}
