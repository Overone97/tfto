import { BOARD_CONFIG } from '../config/gameConfig.js';
import { UNIT_CATALOG } from '../data/units/unitCatalog.js';
import { createUnitInstance } from '../domain/units/createUnitInstance.js';
import { renderGame } from '../rendering/ui/renderGame.js';
import { runAutoBattleStep } from '../systems/combat/runAutoBattleStep.js';

const ENEMY_LAYOUTS = {
  1: [
    { unitId: 'garde-racine', position: { column: 5, row: 1 } },
    { unitId: 'eclaireur-sylvestre', position: { column: 4, row: 1 } },
  ],
  2: [
    { unitId: 'sentinelle-sacree', position: { column: 5, row: 1 } },
    { unitId: 'oracle-des-marees', position: { column: 4, row: 0 } },
    { unitId: 'eclaireur-sylvestre', position: { column: 3, row: 1 } },
  ],
  3: [
    { unitId: 'sentinelle-sacree', position: { column: 5, row: 1 } },
    { unitId: 'artilleuse-celeste', position: { column: 6, row: 0 } },
    { unitId: 'duelliste-cendre', position: { column: 4, row: 1 } },
  ],
};

function pickRandomUnit() {
  return UNIT_CATALOG[Math.floor(Math.random() * UNIT_CATALOG.length)];
}

function createShopOffer(slot) {
  const unit = pickRandomUnit();
  return {
    slot,
    unitId: unit.id,
    name: unit.name,
    cost: unit.cost,
    traits: [...unit.traits],
    stats: { ...unit.stats },
  };
}

function getCatalogUnit(unitId) {
  return UNIT_CATALOG.find(unit => unit.id === unitId);
}

function restoreUnitForBattle(unit) {
  unit.combat.currentHealth = unit.stats.maxHealth;
  unit.combat.attackCooldown = 0;
  unit.combat.targetId = null;
  unit.combat.isAlive = true;
}

function clonePosition(position) {
  return position ? { ...position } : null;
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

  function syncBoardOccupants() {
    state.board.cells.forEach(cell => {
      const unit = state.roster.find(candidate => candidate.position?.column === cell.column && candidate.position?.row === cell.row && candidate.combat.isAlive);
      cell.occupantId = unit?.id || null;
    });
    state.board.activeUnitIds = state.roster.filter(unit => unit.combat.isAlive && unit.position).map(unit => unit.id);
    state.bench = getBenchUnits().map(unit => unit.id);
  }

  function rerollShop(free = false) {
    if (!free) {
      if (state.player.gold < state.economy.rerollCost) {
        setMessage('Pas assez d’or pour reroll.');
        return;
      }
      state.player.gold -= state.economy.rerollCost;
    }

    state.shop = Array.from({ length: BOARD_CONFIG.shopSize }, (_, index) => createShopOffer(index));
    setMessage(free ? 'La boutique est prête.' : 'Boutique rerollée.');
  }

  function seedEnemyTeam() {
    state.roster = state.roster.filter(unit => unit.team !== 'enemy');

    const layout = ENEMY_LAYOUTS[state.round.number] || ENEMY_LAYOUTS[3];
    const enemies = layout
      .map((entry, index) => {
        const data = getCatalogUnit(entry.unitId);
        if (!data) return null;
        const unit = createUnitInstance(data, {
          id: `enemy-r${state.round.number}-${index + 1}`,
          team: 'enemy',
          position: clonePosition(entry.position),
        });
        unit.originPosition = clonePosition(entry.position);
        return unit;
      })
      .filter(Boolean);

    state.roster.push(...enemies);
  }

  function restoreArmyForBattle() {
    state.roster.forEach(unit => {
      restoreUnitForBattle(unit);
      if (unit.originPosition) {
        unit.position = clonePosition(unit.originPosition);
      }
    });
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
    state.shop[slot] = createShopOffer(slot);
    state.meta.selectedBenchUnitId = unit.id;
    setMessage(`${unit.name} rejoint ton bench.`);
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

    if (!selectedUnit.position && getBoardUnitCount() >= BOARD_CONFIG.maxUnitsOnBoard) {
      setMessage(`Limite atteinte: ${BOARD_CONFIG.maxUnitsOnBoard} unités sur le board.`);
      return;
    }

    selectedUnit.position = { column, row };
    selectedUnit.originPosition = { column, row };
    state.meta.selectedBenchUnitId = null;
    setMessage(`${selectedUnit.name} est en place.`);
    render();
  }

  function pullBackUnit(unitId) {
    const unit = state.roster.find(candidate => candidate.id === unitId && candidate.team === 'player');
    if (!unit) return;
    unit.position = null;
    unit.originPosition = null;
    state.meta.selectedBenchUnitId = unit.id;
    setMessage(`${unit.name} retourne sur le bench.`);
    render();
  }

  function resolveBattleEnd() {
    clearBattleTimer();

    const winner = state.battle.winner;
    if (winner === 'player') {
      state.player.gold += 2;
      state.player.wins += 1;
      state.round.number += 1;
      setMessage('Victoire. +2 or, round suivant débloqué.');
    } else if (winner === 'enemy') {
      state.player.lives = Math.max(0, state.player.lives - 10);
      setMessage('Défaite. -10 PV. Repositionne ton board et retente.');
    } else {
      setMessage('Égalité étrange. Ça sent le chaos calculé.');
    }

    state.battle.phase = 'finished';
    seedEnemyTeam();
    restoreArmyForBattle();
    rerollShop(true);
    render();
  }

  function runBattleLoop() {
    const result = runAutoBattleStep(state.roster);
    state.battle.tick += 1;

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

    const playerUnits = state.roster.filter(unit => unit.team === 'player' && unit.position);
    if (!playerUnits.length) {
      setMessage('Pose au moins une unité avant de lancer le combat.');
      render();
      return;
    }

    state.battle.phase = 'running';
    state.battle.winner = null;
    state.battle.tick = 0;

    seedEnemyTeam();
    restoreArmyForBattle();
    setMessage('Combat lancé. Regarde si ton placement tient debout.');
    render();
    battleTimer = setTimeout(runBattleLoop, 450);
  }

  function resetPreparation() {
    clearBattleTimer();
    state.battle.phase = 'idle';
    state.battle.winner = null;
    state.battle.tick = 0;
    state.meta.selectedBenchUnitId = null;
    seedEnemyTeam();
    restoreArmyForBattle();
    rerollShop(true);
    setMessage('Préparation remise à plat.');
    render();
  }

  function render() {
    syncBoardOccupants();
    renderGame(state);

    document.getElementById('startBattleBtn')?.addEventListener('click', startBattle);
    document.getElementById('resetPrepBtn')?.addEventListener('click', resetPreparation);
    document.getElementById('rerollShopBtn')?.addEventListener('click', () => {
      rerollShop(false);
      render();
    });

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
    rerollShop(true);
    restoreArmyForBattle();
    render();
  });

  return {
    render,
  };
}
