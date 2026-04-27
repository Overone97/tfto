export const UNIT_CATALOG = [
  {
    id: 'eclaireur-sylvestre',
    name: 'Éclaireur sylvestre',
    cost: 1,
    rarity: 1,
    traits: ['forêt', 'tireur'],
    stats: {
      maxHealth: 70,
      attackDamage: 14,
      attackRange: 3,
      attackSpeed: 1.0,
      moveSpeed: 1,
    },
  },
  {
    id: 'garde-racine',
    name: 'Garde-racine',
    cost: 1,
    rarity: 1,
    traits: ['forêt', 'gardien'],
    stats: {
      maxHealth: 110,
      attackDamage: 9,
      attackRange: 1,
      attackSpeed: 0.8,
      moveSpeed: 1,
    },
    skill: {
      name: 'Écorce tenace',
      manaToCast: 2,
      description: 'Gagne un bouclier de 22 PV.'
    },
  },
  {
    id: 'duelliste-cendre',
    name: 'Duelliste des cendres',
    cost: 2,
    rarity: 2,
    traits: ['flamme', 'duelliste'],
    stats: {
      maxHealth: 85,
      attackDamage: 18,
      attackRange: 1,
      attackSpeed: 1.2,
      moveSpeed: 1,
    },
    skill: {
      name: 'Entaille brûlante',
      manaToCast: 2,
      description: 'Inflige 16 dégâts bonus à sa cible.'
    },
  },
  {
    id: 'oracle-des-marees',
    name: 'Oracle des marées',
    cost: 2,
    rarity: 2,
    traits: ['marée', 'mage'],
    stats: {
      maxHealth: 72,
      attackDamage: 17,
      attackRange: 3,
      attackSpeed: 0.95,
      moveSpeed: 1,
    },
    skill: {
      name: 'Vague de soin',
      manaToCast: 2,
      description: 'Soigne l’allié le plus faible de 24 PV.'
    },
  },
  {
    id: 'sentinelle-sacree',
    name: 'Sentinelle sacrée',
    cost: 3,
    rarity: 3,
    traits: ['lumière', 'gardien'],
    stats: {
      maxHealth: 130,
      attackDamage: 11,
      attackRange: 1,
      attackSpeed: 0.7,
      moveSpeed: 1,
    },
    skill: {
      name: 'Halo protecteur',
      manaToCast: 3,
      description: 'Soigne toute son équipe de 10 PV.'
    },
  },
  {
    id: 'artilleuse-celeste',
    name: 'Artilleuse céleste',
    cost: 3,
    rarity: 3,
    traits: ['ciel', 'tireur'],
    stats: {
      maxHealth: 78,
      attackDamage: 22,
      attackRange: 4,
      attackSpeed: 0.85,
      moveSpeed: 1,
    },
    skill: {
      name: 'Salve astrale',
      manaToCast: 3,
      description: 'Inflige 14 dégâts à toute l’équipe ennemie.'
    },
  }
];
