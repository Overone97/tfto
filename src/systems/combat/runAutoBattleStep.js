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

function getUnitVisual(unit) {
  const visuals = {
    'eclaireur-sylvestre': { shape: 'ranger', effectColor: '#22c55e' },
    'garde-racine': { shape: 'tank', effectColor: '#84cc16' },
    'duelliste-cendre': { shape: 'duelist', effectColor: '#f97316' },
    'oracle-des-marees': { shape: 'mage', effectColor: '#38bdf8' },
    'sentinelle-sacree': { shape: 'tank', effectColor: '#facc15' },
    'artilleuse-celeste': { shape: 'ranger', effectColor: '#a78bfa' },
  };

  return visuals[unit.unitId] || { shape: 'duelist', effectColor: '#e2e8f0' };
}

function pushAction(actions, action) {
  actions.push({
    ...action,
    timestamp: Date.now() + actions.length,
  });
}

function castSkill(unit, livingUnits, battleEvents, actions) {
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
      pushAction(actions, {
        type: 'spell-heal',
        sourceId: unit.id,
        targetId: unit.id,
        value: 22,
        label: '+22',
        color: '#84cc16',
      });
      break;
    }
    case 'duelliste-cendre': {
      const target = enemies[0];
      if (target) {
        applyDamage(target, 16);
        castText = `${unit.name} déclenche ${unit.skill.name}.`;
        pushAction(actions, {
          type: 'spell-slash',
          sourceId: unit.id,
          targetId: target.id,
          value: 16,
          label: '-16',
          color: '#f97316',
        });
      }
      break;
    }
    case 'oracle-des-marees': {
      const target = [...allies].sort((a, b) => (a.combat.currentHealth / a.stats.maxHealth) - (b.combat.currentHealth / b.stats.maxHealth))[0];
      if (target) {
        applyHeal(target, 24);
        castText = `${unit.name} lance ${unit.skill.name}.`;
        pushAction(actions, {
          type: 'spell-heal',
          sourceId: unit.id,
          targetId: target.id,
          value: 24,
          label: '+24',
          color: '#38bdf8',
        });
      }
      break;
    }
    case 'sentinelle-sacree': {
      allies.forEach(ally => {
        applyHeal(ally, 10);
        pushAction(actions, {
          type: 'spell-wave',
          sourceId: unit.id,
          targetId: ally.id,
          value: 10,
          label: '+10',
          color: '#facc15',
        });
      });
      castText = `${unit.name} active ${unit.skill.name}.`;
      break;
    }
    case 'artilleuse-celeste': {
      enemies.forEach(enemy => {
        applyDamage(enemy, 14);
        pushAction(actions, {
          type: 'spell-burst',
          sourceId: unit.id,
          targetId: enemy.id,
          value: 14,
          label: '-14',
          color: '#a78bfa',
        });
      });
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
  const actions = [];
  const livingUnits = units.filter(unit => unit.combat.isAlive);
  const teams = new Set(livingUnits.map(unit => unit.team));

  if (teams.size <= 1) {
    return {
      units,
      winner: livingUnits[0]?.team || 'draw',
      finished: true,
      battleEvents,
      actions,
    };
  }

  livingUnits.forEach(unit => {
    if (!unit.combat.isAlive) return;

    castSkill(unit, livingUnits, battleEvents, actions);

    const enemies = livingUnits.filter(candidate => candidate.team !== unit.team && candidate.combat.isAlive);
    if (!enemies.length) return;

    const target = enemies
      .map(enemy => ({ enemy, distance: getDistance(unit.position, enemy.position) }))
      .sort((a, b) => a.distance - b.distance)[0];

    if (!target) return;

    if (target.distance <= unit.stats.attackRange) {
      unit.combat.mana = Math.min(unit.combat.manaToCast, (unit.combat.mana || 0) + 1);
      const didKill = applyDamage(target.enemy, unit.stats.attackDamage);
      pushAction(actions, {
        type: unit.stats.attackRange > 1 ? 'attack-ranged' : 'attack-melee',
        sourceId: unit.id,
        targetId: target.enemy.id,
        value: unit.stats.attackDamage,
        label: `-${unit.stats.attackDamage}`,
        color: getUnitVisual(unit).effectColor,
        kill: didKill,
      });
    } else {
      const from = { ...unit.position };
      unit.position = stepToward(unit.position, target.enemy.position);
      pushAction(actions, {
        type: 'move',
        sourceId: unit.id,
        from,
        to: { ...unit.position },
      });
    }
  });

  const survivors = units.filter(unit => unit.combat.isAlive);
  const survivorTeams = new Set(survivors.map(unit => unit.team));

  return {
    units,
    winner: survivorTeams.size <= 1 ? survivors[0]?.team || 'draw' : null,
    finished: survivorTeams.size <= 1,
    battleEvents,
    actions,
  };
}
