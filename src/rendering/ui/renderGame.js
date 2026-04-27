import { GAME_VERSION } from '../../config/gameConfig.js';

function renderTraits(traits) {
  return traits.map(trait => `<span class="tag">${trait}</span>`).join('');
}

export function renderGame(state) {
  const root = document.getElementById('app');
  if (!root) return;

  const boardCells = state.board.cells.map(cell => {
    const unit = state.roster.find(candidate => candidate.position?.column === cell.column && candidate.position?.row === cell.row && candidate.combat.isAlive);
    const isPlayerZone = cell.row >= 2;

    return `
      <button class="cell ${unit ? `team-${unit.team}` : ''} ${isPlayerZone ? 'zone-player' : 'zone-enemy'}" data-board-cell="${cell.column}:${cell.row}" ${state.battle.phase === 'running' ? 'disabled' : ''}>
        <span class="cell-coords">${cell.column},${cell.row}</span>
        ${unit ? `
          <div>
            <strong>${unit.name}</strong>
            <small>${unit.combat.currentHealth} / ${unit.stats.maxHealth} PV</small>
          </div>
          <small>${unit.team === 'player' ? 'clic sans sélection = retrait' : 'ennemi'}</small>
        ` : `<small>${isPlayerZone ? 'zone joueur' : 'zone ennemi'}</small>`}
      </button>
    `;
  }).join('');

  const benchUnits = state.roster
    .filter(unit => unit.team === 'player' && !unit.position)
    .map(unit => `
      <button class="bench-card ${state.meta.selectedBenchUnitId === unit.id ? 'is-selected' : ''}" data-bench-unit="${unit.id}" ${state.battle.phase === 'running' ? 'disabled' : ''}>
        <strong>${unit.name}</strong>
        <small>${unit.cost} or · ${unit.stats.attackDamage} atk · ${unit.stats.maxHealth} PV</small>
        <div class="tags">${renderTraits(unit.traits)}</div>
      </button>
    `).join('');

  const shopCards = state.shop.map((offer, index) => `
    <div class="shop-card">
      <div>
        <strong>${offer.name}</strong>
        <small>${offer.cost} or</small>
      </div>
      <div class="tags">${renderTraits(offer.traits)}</div>
      <button data-buy-slot="${index}" ${state.battle.phase === 'running' ? 'disabled' : ''}>Acheter</button>
    </div>
  `).join('');

  root.innerHTML = `
    <div class="screen">
      <div class="version">v${GAME_VERSION}</div>
      <section class="panel hero">
        <div>
          <h1>tfto</h1>
          <p>Mini proto jouable: shop, bench, placement, auto-combat et rounds.</p>
        </div>
        <div class="hero-stats">
          <span>Or <strong>${state.player.gold}</strong></span>
          <span>PV <strong>${state.player.lives}</strong></span>
          <span>Round <strong>${state.round.number}</strong></span>
          <span>Wins <strong>${state.player.wins}</strong></span>
        </div>
      </section>

      <section class="layout">
        <div class="stack">
          <div class="panel">
            <div class="section-head">
              <h2>Board</h2>
              <small>${state.meta.message}</small>
            </div>
            <div class="board">${boardCells}</div>
          </div>

          <div class="panel">
            <div class="section-head">
              <h2>Bench</h2>
              <small>${state.bench.length} / 8 unités</small>
            </div>
            <div class="bench">${benchUnits || '<p class="empty-state">Ton bench est vide. Achète une unité.</p>'}</div>
          </div>
        </div>

        <div class="stack">
          <div class="panel">
            <div class="section-head">
              <h2>Combat</h2>
              <small>Phase: ${state.battle.phase} · Tick ${state.battle.tick}</small>
            </div>
            <p>Vainqueur: <strong>${state.battle.winner || 'aucun'}</strong></p>
            <div class="actions">
              <button id="startBattleBtn">Lancer l'auto-combat</button>
              <button id="resetPrepBtn" class="ghost">Reset</button>
            </div>
          </div>

          <div class="panel">
            <div class="section-head">
              <h2>Boutique</h2>
              <button id="rerollShopBtn" class="ghost">Reroll · ${state.economy.rerollCost} or</button>
            </div>
            <div class="shop">${shopCards}</div>
          </div>
        </div>
      </section>
    </div>
  `;
}
