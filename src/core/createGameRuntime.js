import { BOARD_CONFIG } from '../config/gameConfig.js';
import { UNIT_CATALOG } from '../data/units/unitCatalog.js';
import { createUnitInstance } from '../domain/units/createUnitInstance.js';
import { renderGame } from '../rendering/ui/renderGame.js';
import { runAutoBattleStep } from '../systems/combat/runAutoBattleStep.js';

const ENEMY_LAYOUTS = {
  1: [
    { unitId: 'garde-racine', position: { column: 5, row: 1 }, starLevel: 1 },
    { unitId: 'eclaireur-sylvestre', position: { column: 4, row: 1 }, starLevel: 1 },
  ],
  2: [
    { unitId: 'sentinelle-sacree', position: { column: 5, row: 1 }, starLevel: 1 },
    { unitId: 'oracle-des-marees', position: { column: 4, row: 0 }, starLevel: 1 },
    { unitId: 'eclaireur-sylvestre', position: { column: 3, row: 1 }, starLevel: 1 },
  ],
  3: [
    { unitId: 'sentinelle-sacree', position: { column: 5, row: 1 }, starLevel: 2 },
    { unitId: 'artilleuse-celeste', position: { column: 6, row: 0 }, starLevel: 1 },
    { unitId: 'duelliste-cendre', position: { column: 4, row: 1 }, starLevel: 1 },
  ],
  4: [
    { unitId: 'sentinelle-sacree', position: { column: 5, row: 1 }, starLevel: 2 },
    { unitId: 'artilleuse-celeste', position: { column: 6, row: 0 }, starLevel: 2 },
    { unitId: 'oracle-des-marees', position: { column: 4, row: 0 }, starLevel: 1 },
  ],
};

const SHOP_ODDS_BY_LEVEL = {
  1: { 1: 100, 2: 0, 3: 0 },
  2: { 1: 75, 2: 25, 3: 0 },
  3: { 1: 55, 2: 35, 3: 10 },
  4: { 1: 35, 2: 45, 3: 20 },
  5: { 1: 20, 2: 50, 3: 30 },
  6: { 1: 10, 2: 45, 3: 45 },
};

const XP_TO_LEVEL = {
  3: 8,
  4: 12,
  5: 16,
  6: Infinity,
};

const SYNERGY_RULES = {
  'forêt': {
    min: 2,
    name: 'Forêt',
    description: '+6 attaque pour les unités Forêt',
    apply(unit) {
      unit.stats.attackDamage += 6;
    },
  },
  gardien: {
    min: 2,
    name: 'Gardien',
    description: '+30 PV pour les unités Gardien',
    apply(unit) {
      unit.stats.maxHealth += 30;
    },
  },
  tireur: {
    min: 2,
    name: 'Tireur',
    description: '+1 portée pour les Tireurs',
    apply(unit) {
      unit.stats.attackRange += 1;
    },
  },
  duelliste: {
    min: 2,
    name: 'Duelliste',
    description: '+8 attaque pour les Duellistes',
    apply(unit) {
      unit.stats.attackDamage += 8;
    },
  },
};

function getCatalogUnit(unitId) {
  return UNIT_CATALOG.find(unit => unit.id === unitId);
}

function clonePosition(position) {
  return position ? { ...position } : null;
}

function getStarMultiplier(starLevel) {
  return [1, 1.8, 3.1][starLevel - 1] || 3.1;
}

function buildStatsFromStar(unit) {
  const factor = getStarMultiplier(unit.starLevel || 1);
  return {
    maxHealth: Math.round(unit.baseStats.maxHealth * factor),
    attackDamage: Math.round(unit.baseStats.attackDamage * factor),
    attackRange: unit.baseStats.attackRange,
    attackSpeed: unit.baseStats.attackSpeed,
    moveSpeed: unit.baseStats.moveSpeed,
  };
}

function restoreUnitForBattle(unit) {
  unit.combat.currentHealth = unit.stats.maxHealth;
  unit.combat.attackCooldown = 0;
  unit.combat.targetId = null;
  unit.combat.mana = 0;
  unit.combat.isAlive = true;
}

function getInterestGold(gold, economy) {
  return Math.min(economy.maxInterest, Math.floor(gold / economy.interestStep));
}

function getMaxUnitsForLevel(level) {
  return Math.min(6, Math.max(2, level + 1));
}

function getXpRequired(level) {
  return XP_TO_LEVEL[level] ?? Infinity;
}

function pickRandomUnitForLevel(level) {
  const odds = SHOP_ODDS_BY_LEVEL[level] || SHOP_ODDS_BY_LEVEL[6];
  const roll = Math.random() * 100;
  let cursor = 0;
  let selectedRarity = 1;

  for (const rarity of [1, 2, 3]) {
    cursor += odds[rarity] || 0;
    if (roll <= cursor) {
      selectedRarity = rarity;
      break;
    }
  }

  const pool = UNIT_CATALOG.filter(unit => unit.rarity === selectedRarity);
  return pool[Math.floor(Math.random() * pool.length)] || UNIT_CATALOG[0];
}

function createShopOffer(slot, level) {
  const unit = pickRandomUnitForLevel(level);
  return {
    slot,
    unitId: unit.id,
    name: unit.name,
    cost: unit.cost,
    rarity: unit.rarity,
    traits: [...unit.traits],
    skill: unit.skill || null,
    stats: { ...unit.stats },
  };
}

export function createGameRuntime({ state, events }) {
  let battleTimer = null;

  function clearBattleTimer() {
    if (!battleTimer) return;
    clearTimeout(battleTimer);
    battleTimer = null;
  }

  function setMessage(message) {
    state.meta.message = message;
  }

  function getBoardUnitCount() {
    return state.roster.filter(unit => unit.team === 'player' && unit.position).length;
  }

  function getBenchUnits() {
    return state.roster.filter(unit => unit.team === 'player' && !unit.position);
  }

  function isPlayerRow(row) {
    return BOARD_CONFIG.playerRows.includes(row);
  }

  function getPlayerBoardUnits() {
    return state.roster.filter(unit => unit.team === 'player' && unit.position);
  }

  function syncBoardOccupants() {
    state.board.cells.forEach(cell => {
      const unit = state.roster.find(candidate => candidate.position?.column === cell.column && candidate.position?.row === cell.row && candidate.combat.isAlive);
      cell.occupantId = unit?.id || null;
    });
    state.board.activeUnitIds = state.roster.filter(unit => unit.combat.isAlive && unit.position).map(unit => unit.id);
    state.bench = getBenchUnits().map(unit => unit.id);
  }

  function computeSynergies() {
    const counts = new Map();

    getPlayerBoardUnits().forEach(unit => {
      unit.traits.forEach(trait => {
        counts.set(trait, (counts.get(trait) || 0) + 1);
      });
    });

    state.synergies = Object.entries(SYNERGY_RULES)
      .filter(([trait, rule]) => (counts.get(trait) || 0) >= rule.min)
      .map(([trait, rule]) => ({
        trait,
        name: rule.name,
        description: rule.description,
        count: counts.get(trait) || 0,
      }));
  }

  function refreshRosterStats() {
    computeSynergies();
    const activeTraits = new Map(state.synergies.map(synergy => [synergy.trait, synergy]));

    state.roster.forEach(unit => {
      unit.stats = buildStatsFromStar(unit);

      if (unit.team === 'player' && unit.position) {
        unit.traits.forEach(trait => {
          const rule = SYNERGY_RULES[trait];
          if (rule && activeTraits.has(trait)) {
            rule.apply(unit);
          }
        });
      }

      if (unit.combat.currentHealth > unit.stats.maxHealth) {
        unit.combat.currentHealth = unit.stats.maxHealth;
      }
    });
  }

  function rerollShop({ free = false, silent = false } = {}) {
    if (!free) {
      if (state.player.gold < state.economy.rerollCost) {
        setMessage('Pas assez d’or pour reroll.');
        return;
      }
      state.player.gold -= state.economy.rerollCost;
    }

    state.shop = Array.from({ length: BOARD_CONFIG.shopSize }, (_, index) => createShopOffer(index, state.player.level));
    if (!silent) {
      setMessage(free ? 'La boutique est prête.' : 'Boutique rerollée.');
    }
  }

  function tryLevelUp() {
    let leveled = false;
    while (state.player.level < 6 && state.player.xp >= getXpRequired(state.player.level)) {
      state.player.xp -= getXpRequired(state.player.level);
      state.player.level += 1;
      leveled = true;
    }
    return leveled;
  }

  function buyXp() {
    if (state.player.level >= 6) {
      setMessage('Niveau max atteint. Respire un peu.');
      return;
    }

    if (state.player.gold < state.economy.xpBuyCost) {
      setMessage('Pas assez d’or pour acheter de l’XP.');
      return;
    }

    state.player.gold -= state.economy.xpBuyCost;
    state.player.xp += state.economy.xpPerBuy;
    const leveled = tryLevelUp();
    setMessage(leveled ? `Niveau ${state.player.level} atteint. Shop amélioré, cap augmenté.` : `+${state.economy.xpPerBuy} XP.`);
    rerollShop({ free: true, silent: true });
    render();
  }

  function seedEnemyTeam() {
    state.roster = state.roster.filter(unit => unit.team !== 'enemy');

    const layout = ENEMY_LAYOUTS[state.round.number] || ENEMY_LAYOUTS[4];
    const enemies = layout
      .map((entry, index) => {
        const data = getCatalogUnit(entry.unitId);
        if (!data) return null;
        const unit = createUnitInstance(data, {
          id: `enemy-r${state.round.number}-${index + 1}`,
          team: 'enemy',
          position: clonePosition(entry.position),
          starLevel: entry.starLevel || 1,
        });
        unit.originPosition = clonePosition(entry.position);
        unit.stats = buildStatsFromStar(unit);
        unit.combat.currentHealth = unit.stats.maxHealth;
        return unit;
      })
      .filter(Boolean);

    state.roster.push(...enemies);
  }

  function restoreArmyForBattle() {
    refreshRosterStats();
    state.roster.forEach(unit => {
      restoreUnitForBattle(unit);
      if (unit.originPosition) {
        unit.position = clonePosition(unit.originPosition);
      }
    });
  }

  function autoMergePlayerUnits() {
    let mergedSomething = false;
    const playerUnits = state.roster.filter(unit => unit.team === 'player');
    const groups = new Map();

    playerUnits.forEach(unit => {
      const key = `${unit.unitId}:${unit.starLevel}`;
      const list = groups.get(key) || [];
      list.push(unit);
      groups.set(key, list);
    });

    groups.forEach(group => {
      if (group.length < 3) return;

      const sorted = [...group].sort((a, b) => Number(Boolean(b.position)) - Number(Boolean(a.position)));
      const kept = sorted[0];
      const consumed = sorted.slice(1, 3);

      kept.starLevel += 1;
      kept.originPosition = kept.position ? clonePosition(kept.position) : null;
      kept.stats = buildStatsFromStar(kept);
      kept.combat.currentHealth = kept.stats.maxHealth;

      consumed.forEach(unit => {
        if (state.meta.selectedBenchUnitId === unit.id) {
          state.meta.selectedBenchUnitId = kept.id;
        }
        state.roster = state.roster.filter(candidate => candidate.id !== unit.id);
      });

      state.meta.lastFusion = `${kept.name} passe ${kept.starLevel}★.`;
      mergedSomething = true;
    });

    if (mergedSomething) {
      refreshRosterStats();
      autoMergePlayerUnits();
    }

    return mergedSomething;
  }

  function buyShopOffer(slot) {
    const offer = state.shop[slot];
    if (!offer) return;

    if (state.player.gold < offer.cost) {
      setMessage('Pas assez d’or pour acheter cette unité.');
      return;
    }

    if (getBenchUnits().length >= BOARD_CONFIG.benchSlots) {
      setMessage('Bench plein.');
      return;
    }

    state.player.gold -= offer.cost;

    const unit = createUnitInstance(getCatalogUnit(offer.unitId), {
      id: `player-${Date.now()}-${slot}`,
      team: 'player',
    });

    state.roster.push(unit);
    state.shop[slot] = createShopOffer(slot, state.player.level);
    state.meta.selectedBenchUnitId = unit.id;

    const merged = autoMergePlayerUnits();
    refreshRosterStats();

    setMessage(merged ? `${state.meta.lastFusion} Propre.` : `${unit.name} rejoint ton bench.`);
    render();
  }

  function placeSelectedUnit(column, row) {
    const selectedUnit = state.roster.find(unit => unit.id === state.meta.selectedBenchUnitId && unit.team === 'player');
    if (!selectedUnit) {
      setMessage('Sélectionne une unité du bench.');
      return;
    }

    if (!isPlayerRow(row)) {
      setMessage('Tu peux poser tes unités seulement sur tes 2 lignes du bas.');
      return;
    }

    const occupyingUnit = state.roster.find(unit => unit.position?.column === column && unit.position?.row === row && unit.combat.isAlive);
    if (occupyingUnit) {
      setMessage('Case déjà occupée.');
      return;
    }

    if (!selectedUnit.position && getBoardUnitCount() >= getMaxUnitsForLevel(state.player.level)) {
      setMessage(`Cap atteint: niveau ${state.player.level} = ${getMaxUnitsForLevel(state.player.level)} unités.`);
      return;
    }

    selectedUnit.position = { column, row };
    selectedUnit.originPosition = { column, row };
    state.meta.selectedBenchUnitId = null;
    refreshRosterStats();
    setMessage(`${selectedUnit.name} est en place.`);
    render();
  }

  function pullBackUnit(unitId) {
    const unit = state.roster.find(candidate => candidate.id === unitId && candidate.team === 'player');
    if (!unit) return;
    unit.position = null;
    unit.originPosition = null;
    state.meta.selectedBenchUnitId = unit.id;
    refreshRosterStats();
    setMessage(`${unit.name} retourne sur le bench.`);
    render();
  }

  function applyRoundIncome(winner) {
    const interest = getInterestGold(state.player.gold, state.economy);
    const base = state.economy.baseIncome;
    const winBonus = winner === 'player' ? 2 : 0;
    const total = base + interest + winBonus;

    state.player.gold += total;
    state.player.xp += 2;
    tryLevelUp();

    state.meta.lastIncome = {
      base,
      interest,
      winBonus,
      total,
    };
  }

  function resolveBattleEnd() {
    clearBattleTimer();

    const winner = state.battle.winner;
    applyRoundIncome(winner);

    if (winner === 'player') {
      state.player.wins += 1;
      state.round.number += 1;
      setMessage(`Victoire. +${state.meta.lastIncome.total} or, +2 XP. Niveau ${state.player.level}.`);
    } else if (winner === 'enemy') {
      state.player.lives = Math.max(0, state.player.lives - 10);
      setMessage(`Défaite. -10 PV, mais +${state.meta.lastIncome.total} or et +2 XP.`);
    } else {
      setMessage(`Égalité. +${state.meta.lastIncome.total} or et +2 XP.`);
    }

    state.battle.phase = 'finished';
    seedEnemyTeam();
    restoreArmyForBattle();
    rerollShop({ free: true, silent: true });
    render();
  }

  function runBattleLoop() {
    const result = runAutoBattleStep(state.roster);
    state.battle.tick += 1;

    if (result.battleEvents?.length) {
      state.meta.lastSpell = result.battleEvents[result.battleEvents.length - 1];
    }

    if (result.finished) {
      state.battle.winner = result.winner;
      resolveBattleEnd();
      return;
    }

    render();
    battleTimer = setTimeout(runBattleLoop, 450);
  }

  function startBattle() {
    if (state.battle.phase === 'running') return;

    const playerUnits = getPlayerBoardUnits();
    if (!playerUnits.length) {
      setMessage('Pose au moins une unité avant de lancer le combat.');
      render();
      return;
    }

    state.battle.phase = 'running';
    state.battle.winner = null;
    state.battle.tick = 0;
    state.meta.lastSpell = null;

    seedEnemyTeam();
    restoreArmyForBattle();
    setMessage('Combat lancé. Cette fois les spells peuvent vraiment sauver ou ruiner un round.');
    render();
    battleTimer = setTimeout(runBattleLoop, 450);
  }

  function resetPreparation() {
    clearBattleTimer();
    state.battle.phase = 'idle';
    state.battle.winner = null;
    state.battle.tick = 0;
    state.meta.selectedBenchUnitId = null;
    state.meta.lastIncome = null;
    state.meta.lastFusion = null;
    state.meta.lastSpell = null;
    seedEnemyTeam();
    restoreArmyForBattle();
    rerollShop({ free: true, silent: true });
    setMessage('Préparation remise à plat.');
    render();
  }

  function render() {
    refreshRosterStats();
    syncBoardOccupants();
    renderGame(state, {
      maxUnitsOnBoard: getMaxUnitsForLevel(state.player.level),
      nextLevelXp: getXpRequired(state.player.level),
    });

    document.getElementById('startBattleBtn')?.addEventListener('click', startBattle);
    document.getElementById('resetPrepBtn')?.addEventListener('click', resetPreparation);
    document.getElementById('rerollShopBtn')?.addEventListener('click', () => {
      rerollShop({ free: false });
      render();
    });
    document.getElementById('buyXpBtn')?.addEventListener('click', buyXp);

    document.querySelectorAll('[data-buy-slot]').forEach(button => {
      button.addEventListener('click', () => buyShopOffer(Number(button.dataset.buySlot)));
    });

    document.querySelectorAll('[data-bench-unit]').forEach(button => {
      button.addEventListener('click', () => {
        state.meta.selectedBenchUnitId = button.dataset.benchUnit;
        setMessage('Unité sélectionnée. Clique une case de ton board.');
        render();
      });
    });

    document.querySelectorAll('[data-board-cell]').forEach(button => {
      button.addEventListener('click', () => {
        const [column, row] = button.dataset.boardCell.split(':').map(Number);
        const occupant = state.roster.find(unit => unit.position?.column === column && unit.position?.row === row && unit.combat.isAlive);

        if (occupant?.team === 'player' && !state.meta.selectedBenchUnitId) {
          pullBackUnit(occupant.id);
          return;
        }

        placeSelectedUnit(column, row);
      });
    });
  }

  events.on('game:booted', () => {
    seedEnemyTeam();
    rerollShop({ free: true, silent: true });
    restoreArmyForBattle();
    render();
  });

  return {
    render,
  };
}
