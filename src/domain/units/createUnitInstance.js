export function createUnitInstance(unitData, overrides = {}) {
  return {
    id: overrides.id || `${unitData.id}-${Math.random().toString(36).slice(2, 8)}`,
    unitId: unitData.id,
    name: unitData.name,
    team: overrides.team || unitData.team,
    traits: unitData.traits,
    cost: unitData.cost,
    starLevel: overrides.starLevel || 1,
    position: overrides.position || null,
    baseStats: { ...unitData.stats },
    stats: { ...unitData.stats },
    combat: {
      currentHealth: unitData.stats.maxHealth,
      attackCooldown: 0,
      targetId: null,
      isAlive: true,
    },
  };
}
