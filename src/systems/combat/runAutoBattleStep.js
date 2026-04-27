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

function applyDamage(unit, amount) {
  if (!unit?.combat?.isAlive) return false;
  unit.combat.currentHealth -= amount;
  unit.combat.mana = Math.min(unit.combat.manaToCast, (unit.combat.mana || 0) + 1);

  if (unit.combat.currentHealth <= 0) {
    unit.combat.currentHealth = 0;
    unit.combat.isAlive = false;
    return true;
  }

  return false;
}

function applyHeal(unit, amount) {
  if (!unit?.combat?.isAlive) return;
  unit.combat.currentHealth = Math.min(unit.stats.maxHealth, unit.combat.currentHealth + amount);
}

function castSkill(unit, livingUnits, battleEvents) {
  if (!unit.skill || unit.combat.mana < unit.combat.manaToCast || !unit.combat.isAlive) {
    return;
  }

  const allies = livingUnits.filter(candidate => candidate.team === unit.team && candidate.combat.isAlive);
  const enemies = livingUnits.filter(candidate => candidate.team !== unit.team && candidate.combat.isAlive);
  let castText = null;

  switch (unit.unitId) {
    case 'garde-racine': {
      applyHeal(unit, 22);
      castText = `${unit.name} lance ${unit.skill.name}.`;
      break;
    }
    case 'duelliste-cendre': {
      const target = enemies[0];
      if (target) {
        applyDamage(target, 16);
        castText = `${unit.name} déclenche ${unit.skill.name}.`;
      }
      break;
    }
    case 'oracle-des-marees': {
      const target = [...allies].sort((a, b) => (a.combat.currentHealth / a.stats.maxHealth) - (b.combat.currentHealth / b.stats.maxHealth))[0];
      if (target) {
        applyHeal(target, 24);
        castText = `${unit.name} lance ${unit.skill.name}.`;
      }
      break;
    }
    case 'sentinelle-sacree': {
      allies.forEach(ally => applyHeal(ally, 10));
      castText = `${unit.name} active ${unit.skill.name}.`;
      break;
    }
    case 'artilleuse-celeste': {
      enemies.forEach(enemy => applyDamage(enemy, 14));
      castText = `${unit.name} déclenche ${unit.skill.name}.`;
      break;
    }
    default:
      break;
  }

  if (castText) {
    unit.combat.mana = 0;
    battleEvents.push(castText);
  }
}

export function runAutoBattleStep(units) {
  const battleEvents = [];
  const livingUnits = units.filter(unit => unit.combat.isAlive);
  const teams = new Set(livingUnits.map(unit => unit.team));

  if (teams.size <= 1) {
    return {
      units,
      winner: livingUnits[0]?.team || 'draw',
      finished: true,
      battleEvents,
    };
  }

  livingUnits.forEach(unit => {
    if (!unit.combat.isAlive) return;

    castSkill(unit, livingUnits, battleEvents);

    const enemies = livingUnits.filter(candidate => candidate.team !== unit.team && candidate.combat.isAlive);
    if (!enemies.length) return;

    const target = enemies
      .map(enemy => ({ enemy, distance: getDistance(unit.position, enemy.position) }))
      .sort((a, b) => a.distance - b.distance)[0];

    if (!target) return;

    if (target.distance <= unit.stats.attackRange) {
      unit.combat.mana = Math.min(unit.combat.manaToCast, (unit.combat.mana || 0) + 1);
      applyDamage(target.enemy, unit.stats.attackDamage);
    } else {
      unit.position = stepToward(unit.position, target.enemy.position);
    }
  });

  const survivors = units.filter(unit => unit.combat.isAlive);
  const survivorTeams = new Set(survivors.map(unit => unit.team));

  return {
    units,
    winner: survivorTeams.size <= 1 ? survivors[0]?.team || 'draw' : null,
    finished: survivorTeams.size <= 1,
    battleEvents,
  };
}
