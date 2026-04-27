import { BOARD_CONFIG } from '../../config/gameConfig.js';

export function createBoardState() {
  const cells = [];

  for (let row = 0; row < BOARD_CONFIG.rows; row += 1) {
    for (let column = 0; column < BOARD_CONFIG.columns; column += 1) {
      cells.push({
        id: `cell-${column}-${row}`,
        column,
        row,
        occupantId: null,
      });
    }
  }

  return {
    columns: BOARD_CONFIG.columns,
    rows: BOARD_CONFIG.rows,
    cells,
    activeUnitIds: [],
  };
}
