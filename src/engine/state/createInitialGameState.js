import { createBoardState } from '../../domain/board/createBoardState.js';
import { createBattleState } from '../../domain/battle/createBattleState.js';

export function createInitialGameState() {
  return {
    meta: {
      version: '0.0.4',
      phase: 'prototype-plus-plus',
      message: 'Monte ton niveau, lis les raretés du shop, puis abuse des premiers spells.',
      selectedBenchUnitId: null,
      lastIncome: null,
      lastFusion: null,
      lastSpell: null,
    },
    player: {
      gold: 10,
      lives: 100,
      level: 3,
      xp: 0,
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
      xpBuyCost: 4,
      xpPerBuy: 4,
      baseIncome: 4,
      interestStep: 5,
      maxInterest: 3,
    },
    roster: [],
    synergies: [],
  };
}
