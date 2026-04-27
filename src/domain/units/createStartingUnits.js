import { UNIT_CATALOG } from '../../data/units/unitCatalog.js';
import { createUnitInstance } from './createUnitInstance.js';

export function createStartingUnits() {
  return [
    createUnitInstance(UNIT_CATALOG[0], {
      id: 'player-1',
      team: 'player',
      position: { column: 1, row: 2 },
    }),
    createUnitInstance(UNIT_CATALOG[1], {
      id: 'player-2',
      team: 'player',
      position: { column: 2, row: 1 },
    }),
    createUnitInstance(UNIT_CATALOG[2], {
      id: 'enemy-1',
      team: 'enemy',
      position: { column: 5, row: 1 },
    }),
    createUnitInstance(UNIT_CATALOG[3], {
      id: 'enemy-2',
      team: 'enemy',
      position: { column: 4, row: 2 },
    }),
  ];
}
