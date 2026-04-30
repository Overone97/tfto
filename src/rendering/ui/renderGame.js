import { GAME_VERSION } from '../../config/gameConfig.js';

function renderTraits(traits) {
  return traits.map(trait => `<span class="tag">${trait}</span>`).join('');
}

function renderStars(starLevel) {
  return '★'.repeat(starLevel || 1);
}

function renderRarity(rarity) {
  return '●'.repeat(rarity || 1);
}

function getUnitActionMap(actions = []) {
  return actions.reduce((map, action) => {
    if (action.sourceId) map.set(action.sourceId, action);
    return map;
  }, new Map());
}

function getIsoPosition(position) {
  const originX = 50;
  const originY = 12;
  const stepX = 12;
  const stepY = 11;

  return {
    x: originX + (position.column - position.row) * stepX,
    y: originY + (position.column + position.row) * stepY,
  };
}

function getUnitVisualProfile(unit) {
  if (unit.stats.attackRange >= 4) return 'shape-artillery';
  if (unit.stats.attackRange >= 3) return 'shape-ranger';
  if (unit.stats.maxHealth >= 120) return 'shape-tank';
  return 'shape-duelist';
}

function getProjectileStyle(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt((dx ** 2) + (dy ** 2));
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return {
    left: `${from.x}%`,
    top: `${from.y}%`,
    width: `${distance}%`,
    angle,
  };
}

function renderArena(state) {
  const aliveUnits = state.roster
    .filter(unit => unit.position && unit.combat.isAlive)
    .sort((a, b) => (a.position.column + a.position.row) - (b.position.column + b.position.row));

  const actionMap = getUnitActionMap(state.meta.lastBattleActions);
  const floatingTexts = (state.meta.lastBattleActions || [])
    .filter(action => action.targetId && action.label)
    .map((action, index) => {
      const target = aliveUnits.find(unit => unit.id === action.targetId);
      if (!target?.position) return '';
      const coords = getIsoPosition(target.position);
      return `
        <div class="floating-text" style="left:${coords.x}%; top:${coords.y - 6 - index * 3}% ; --float-color:${action.color || '#fff'}">
          ${action.label}
        </div>
      `;
    })
    .join('');

  const units = aliveUnits.map(unit => {
    const coords = getIsoPosition(unit.position);
    const action = actionMap.get(unit.id);
    const hpRatio = Math.max(0, Math.min(1, unit.combat.currentHealth / unit.stats.maxHealth));
    const actionClass = action ? `action-${action.type}` : '';
    const isCasting = action && action.type.startsWith('spell');
    const ringClass = unit.team === 'player' ? 'ring-player' : 'ring-enemy';
    const shapeClass = getUnitVisualProfile(unit);

    return `
      <div
        class="arena-unit team-${unit.team} ${shapeClass} ${actionClass} ${isCasting ? 'is-casting' : ''}"
        style="left:${coords.x}%; top:${coords.y}%; --hp:${hpRatio}; --effect:${action?.color || '#ffffff'}"
      >
        <div class="unit-ring ${ringClass}"></div>
        <div class="unit-body rarity-${unit.rarity}">
          <div class="unit-core"></div>
        </div>
        <div class="unit-hp"><span style="transform:scaleX(${hpRatio})"></span></div>
        <div class="unit-label">${unit.name}</div>
      </div>
    `;
  }).join('');

  const projectiles = (state.meta.lastBattleActions || []).map((action, index) => {
    if (!['attack-ranged', 'spell-burst', 'spell-heal'].includes(action.type)) return '';
    const source = aliveUnits.find(unit => unit.id === action.sourceId);
    const target = aliveUnits.find(unit => unit.id === action.targetId);
    if (!source?.position || !target?.position) return '';
    const from = getIsoPosition(source.position);
    const to = getIsoPosition(target.position);
    const style = getProjectileStyle(from, to);

    return `
      <div
        class="projectile projectile-${action.type}"
        style="left:${style.left}; top:${style.top}; width:${style.width}; transform:translateY(-50%) rotate(${style.angle}deg); --projectile-color:${action.color || '#fff'}; animation-delay:${index * 30}ms"
      >
        <span></span>
      </div>
    `;
  }).join('');

  const attackBursts = (state.meta.lastBattleActions || []).map((action, index) => {
    const target = aliveUnits.find(unit => unit.id === action.targetId);
    if (!target?.position) return '';
    if (!['attack-ranged', 'attack-melee', 'spell-burst', 'spell-slash', 'spell-wave', 'spell-heal'].includes(action.type)) return '';
    const coords = getIsoPosition(target.position);
    const size = action.type === 'spell-wave' ? 11 : action.type === 'spell-burst' ? 8 : 6;
    return `
      <div class="impact impact-${action.type}" style="left:${coords.x}%; top:${coords.y}%; width:${size}rem; height:${size}rem; --impact-color:${action.color || '#fff'}; animation-delay:${index * 40}ms"></div>
    `;
  }).join('');

  const phaseLabel = state.battle.phase === 'running' ? 'Combat en cours' : 'Préparation';

  return `
    <div class="arena-shell">
      <div class="arena-head">
        <div>
          <h2>Plateau combat</h2>
          <small>${phaseLabel} · Tick ${state.battle.tick}</small>
        </div>
        <div class="arena-legend">
          <span><i class="dot ally"></i> alliés</span>
          <span><i class="dot enemy"></i> ennemis</span>
        </div>
      </div>
      <div class="arena-stage">
        <div class="arena-grid"></div>
        <div class="arena-glow ally-glow"></div>
        <div class="arena-glow enemy-glow"></div>
        ${projectiles}
        ${attackBursts}
        ${floatingTexts}
        ${units}
      </div>
    </div>
  `;
}

export function renderGame(state, ui = {}) {
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
            <small>${renderStars(unit.starLevel)} · ${unit.combat.currentHealth} / ${unit.stats.maxHealth} PV</small>
            <small>${unit.stats.attackDamage} atk · portée ${unit.stats.attackRange} · mana ${unit.combat.mana}/${unit.combat.manaToCast === 999 ? '∞' : unit.combat.manaToCast}</small>
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
        <small>${renderStars(unit.starLevel)} · ${renderRarity(unit.rarity)} · ${unit.cost} or · ${unit.stats.attackDamage} atk · ${unit.stats.maxHealth} PV</small>
        <div class="tags">${renderTraits(unit.traits)}</div>
        ${unit.skill ? `<small>Spell: ${unit.skill.name}</small>` : ''}
      </button>
    `).join('');

  const shopCards = state.shop.map((offer, index) => `
    <div class="shop-card rarity-${offer.rarity}">
      <div>
        <strong>${offer.name}</strong>
        <small>${renderRarity(offer.rarity)} · ${offer.cost} or</small>
      </div>
      <div class="tags">${renderTraits(offer.traits)}</div>
      ${offer.skill ? `<small>${offer.skill.name}</small>` : '<small>Pas de spell</small>'}
      <button data-buy-slot="${index}" ${state.battle.phase === 'running' ? 'disabled' : ''}>Acheter</button>
    </div>
  `).join('');

  const synergyCards = state.synergies.length
    ? state.synergies.map(synergy => `
        <div class="synergy-card">
          <strong>${synergy.name} (${synergy.count})</strong>
          <small>${synergy.description}</small>
        </div>
      `).join('')
    : '<p class="empty-state">Aucune synergie active. Là, c’est juste du placement à mains nues.</p>';

  const lastIncome = state.meta.lastIncome
    ? `<div class="income-box"><strong>Dernier revenu</strong><small>${state.meta.lastIncome.total} or = ${state.meta.lastIncome.base} base + ${state.meta.lastIncome.interest} intérêt + ${state.meta.lastIncome.winBonus} bonus</small></div>`
    : '<p class="empty-state">Lance un round pour voir les revenus.</p>';

  const xpTarget = ui.nextLevelXp === Infinity ? 'MAX' : `${state.player.xp} / ${ui.nextLevelXp}`;

  root.innerHTML = `
    <div class="screen">
      <div class="version">v${GAME_VERSION}</div>
      <section class="panel hero">
        <div>
          <h1>tfto</h1>
          <p>Boutique à raretés, niveau joueur et premiers spells qui claquent — maintenant avec un faux plateau 3D qui vit un peu.</p>
        </div>
        <div class="hero-stats">
          <span>Or <strong>${state.player.gold}</strong></span>
          <span>PV <strong>${state.player.lives}</strong></span>
          <span>Round <strong>${state.round.number}</strong></span>
          <span>Niv <strong>${state.player.level}</strong></span>
          <span>Cap <strong>${ui.maxUnitsOnBoard}</strong></span>
        </div>
      </section>

      <section class="layout">
        <div class="stack">
          <div class="panel arena-panel">
            ${renderArena(state)}
          </div>

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
            ${state.meta.lastFusion ? `<div class="income-box fusion-box"><strong>Fusion</strong><small>${state.meta.lastFusion}</small></div>` : ''}
            ${state.meta.lastSpell ? `<div class="income-box spell-box"><strong>Dernier spell</strong><small>${state.meta.lastSpell}</small></div>` : ''}
            <div class="actions">
              <button id="startBattleBtn">Lancer l'auto-combat</button>
              <button id="resetPrepBtn" class="ghost">Reset</button>
            </div>
          </div>

          <div class="panel">
            <div class="section-head">
              <h2>Joueur</h2>
              <small>XP ${xpTarget}</small>
            </div>
            <div class="actions vertical">
              <button id="buyXpBtn">Acheter 4 XP · ${state.economy.xpBuyCost} or</button>
            </div>
          </div>

          <div class="panel">
            <div class="section-head">
              <h2>Synergies</h2>
              <small>Actives sur les unités posées</small>
            </div>
            <div class="synergies">${synergyCards}</div>
          </div>

          <div class="panel">
            <div class="section-head">
              <h2>Économie</h2>
              <small>Intérêt: +1 or tous les 5 or, max +3</small>
            </div>
            ${lastIncome}
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
