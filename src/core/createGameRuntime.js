import { renderGame } from '../rendering/ui/renderGame.js';
import { runAutoBattleStep } from '../systems/combat/runAutoBattleStep.js';

export function createGameRuntime({ state, events }) {
  function syncBoardOccupants() {
    state.board.cells.forEach(cell => {
      const unit = state.roster.find(candidate => candidate.position?.column === cell.column && candidate.position?.row === cell.row && candidate.combat.isAlive);
      cell.occupantId = unit?.id || null;
    });
    state.board.activeUnitIds = state.roster.filter(unit => unit.combat.isAlive).map(unit => unit.id);
  }

  function render() {
    syncBoardOccupants();
    renderGame(state);
    const stepButton = document.getElementById('stepBattleBtn');
    if (stepButton) {
      stepButton.onclick = () => {
        state.battle.phase = 'running';
        const result = runAutoBattleStep(state.roster);
        state.battle.tick += 1;
        if (result.finished) {
          state.battle.phase = 'finished';
          state.battle.winner = result.winner;
        }
        render();
      };
    }
  }

  events.on('game:booted', () => {
    render();
  });

  return {
    render,
  };
}
