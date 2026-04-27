import { GAME_VERSION } from '../../config/gameConfig.js';

export function renderGame(state) {
  const root = document.getElementById('app');
  if (!root) return;

  const boardCells = state.board.cells.map(cell => {
    const unit = state.roster.find(candidate => candidate.position?.column === cell.column && candidate.position?.row === cell.row && candidate.combat.isAlive);
    return `
      <div class="cell ${unit ? `team-${unit.team}` : ''}">
        <span class="cell-coords">${cell.column},${cell.row}</span>
        ${unit ? `<strong>${unit.name}</strong><small>${unit.combat.currentHealth} PV</small>` : ''}
      </div>
    `;
  }).join('');

  root.innerHTML = `
    <div class="screen">
      <div class="version">${GAME_VERSION}</div>
      <section class="panel">
        <h1>tfto</h1>
        <p>Fondation du board et du combat auto.</p>
      </section>
      <section class="layout">
        <div class="panel">
          <h2>Board</h2>
          <div class="board">${boardCells}</div>
        </div>
        <div class="panel">
          <h2>État</h2>
          <p>Phase: <strong>${state.battle.phase}</strong></p>
          <p>Tick: <strong>${state.battle.tick}</strong></p>
          <p>Vainqueur: <strong>${state.battle.winner || 'aucun'}</strong></p>
          <button id="stepBattleBtn">Lancer un step auto-combat</button>
        </div>
      </section>
    </div>
  `;
}
