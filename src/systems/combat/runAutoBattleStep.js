function getDistance(a, b) {
  return Math.abs(a.column - b.column) + Math.abs(a.row - b.row);
}

function stepToward(source, target) {
  const next = { ...source };

  if (source.column < target.column) next.column += 1;
  else if (source.column > target.column) next.column -= 1;
  else if (source.row < target.row) next.row += 1;
  else if (source.row > target.row) next.row -= 1;

  return next;
}

export function runAutoBattleStep(units) {
  const livingUnits = units.filter(unit => unit.combat.isAlive);
  const teams = new Set(livingUnits.map(unit => unit.team));

  if (teams.size <= 1) {
    return {
      units,
      winner: livingUnits[0]?.team || 'draw',
      finished: true,
    };
  }

  livingUnits.forEach(unit => {
    const enemies = livingUnits.filter(candidate => candidate.team !== unit.team && candidate.combat.isAlive);
    if (!enemies.length) return;

    const target = enemies
      .map(enemy => ({ enemy, distance: getDistance(unit.position, enemy.position) }))
      .sort((a, b) => a.distance - b.distance)[0];

    if (!target) return;

    if (target.distance <= unit.stats.attackRange) {
      target.enemy.combat.currentHealth -= unit.stats.attackDamage;
      if (target.enemy.combat.currentHealth <= 0) {
        target.enemy.combat.currentHealth = 0;
        target.enemy.combat.isAlive = false;
      }
    } else {
      unit.position = stepToward(unit.position, target.enemy.position);
    }
  });

  return {
    units,
    winner: null,
    finished: false,
  };
}
