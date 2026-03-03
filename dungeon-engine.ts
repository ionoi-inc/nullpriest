/**
 * nullpriest Dungeon — Combat Engine v1.0
 * Pure TypeScript, no frontend dependency.
 * Seeded RNG from Base block hash.
 * Input:  RunConfig (party, seed)
 * Output: RunLog (full structured JSON of every action)
 */

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type ClassType = 'warrior' | 'rogue' | 'mage' | 'cleric' | 'ranger';
export type ActionType = 'ATTACK' | 'DEFEND' | 'SPELL' | 'ITEM' | 'FLEE' | 'SPECIAL';
export type StatusEffect = 'POISONED' | 'STUNNED' | 'BLESSED' | 'CURSED' | 'BURNING';
export type RoomType = 'combat' | 'treasure' | 'trap' | 'puzzle' | 'rest' | 'boss';
export type LootTier = 'common' | 'rare' | 'legendary' | 'mythic';

export interface AgentConfig {
  id: string;           // unique agent id
  name: string;         // display name
  class: ClassType;
  ownerWallet: string;  // human owner wallet
  ownerX?: string;      // @handle for report delivery
  ownerEmail?: string;
  goldHeld: number;     // $GOLD in owner wallet → XP multiplier
}

export interface RunConfig {
  runId: number;
  seed: string;         // Base block hash (hex string)
  party: AgentConfig[];
  entryFeePerAgent: number; // default 100
}

export interface AgentState {
  id: string;
  name: string;
  class: ClassType;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  mag: number;
  spd: number;
  specialUsed: boolean;
  statusEffects: Array<{ effect: StatusEffect; rounds: number }>;
  items: Array<'potion' | 'bomb'>;
  goldEarned: number;
  damageDealt: number;
  alive: boolean;
}

export interface EnemyState {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  mag: number;
  spd: number;
  statusEffects: Array<{ effect: StatusEffect; rounds: number }>;
  phase: number;        // boss phase (1-3)
  alive: boolean;
}

export interface TurnAction {
  actorId: string;
  actorName: string;
  action: ActionType;
  targetId?: string;
  targetName?: string;
  roll: number;
  damage?: number;
  heal?: number;
  statusApplied?: StatusEffect;
  narrative: string;
}

export interface RoundLog {
  round: number;
  initiative: Array<{ id: string; name: string; initiative: number }>;
  actions: TurnAction[];
  partyHp: Record<string, number>;
  enemyHp: Record<string, number>;
}

export interface RoomLog {
  roomIndex: number;
  type: RoomType;
  name: string;
  description: string;
  rounds?: RoundLog[];
  outcome: 'victory' | 'fled' | 'trapped' | 'puzzled' | 'rested' | 'looted';
  loot?: LootDrop[];
  narrative: string;
}

export interface LootDrop {
  agentId: string;
  agentName: string;
  tier: LootTier;
  gold: number;
  nft?: string;        // NFT item name if applicable
}

export interface RunLog {
  runId: number;
  seed: string;
  timestamp: string;
  party: Array<{ id: string; name: string; class: ClassType; ownerX?: string; ownerWallet: string }>;
  rooms: RoomLog[];
  result: 'victory' | 'wipe' | 'retreat';
  rounds_total: number;
  loot: LootDrop[];
  goldDistribution: Record<string, number>;  // agentId → $GOLD earned
  nftsAwarded: Array<{ agentId: string; nft: string; tier: LootTier }>;
  treasuryFee: number;       // 15% of loot pool stays
  protocolFee: number;       // 5% to nullpriest
  entryFeeTotal: number;
  burnedOnWipe?: number;
  summary: string;
}

// ─────────────────────────────────────────────
// CLASS BASE STATS
// ─────────────────────────────────────────────

const CLASS_STATS: Record<ClassType, { hp: number; atk: number; def: number; mag: number; spd: number }> = {
  warrior: { hp: 120, atk: 18, def: 15, mag: 5,  spd: 8  },
  rogue:   { hp: 80,  atk: 22, def: 8,  mag: 8,  spd: 18 },
  mage:    { hp: 70,  atk: 10, def: 6,  mag: 24, spd: 12 },
  cleric:  { hp: 90,  atk: 10, def: 10, mag: 18, spd: 10 },
  ranger:  { hp: 85,  atk: 20, def: 9,  mag: 8,  spd: 16 },
};

// ─────────────────────────────────────────────
// SEEDED RNG (mulberry32)
// ─────────────────────────────────────────────

function seedFromHex(hex: string): number {
  // Take last 8 chars of block hash as uint32 seed
  const clean = hex.replace('0x', '').slice(-8);
  return parseInt(clean, 16) >>> 0;
}

function makePrng(seed: number) {
  let s = seed;
  return function rand(): number {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ─────────────────────────────────────────────
// ENEMY DEFINITIONS
// ─────────────────────────────────────────────

const ENEMY_POOL = [
  { name: 'Dungeon Rat',      hp: 30,  atk: 8,  def: 2,  mag: 0,  spd: 14 },
  { name: 'Skeleton Archer',  hp: 45,  atk: 14, def: 4,  mag: 0,  spd: 11 },
  { name: 'Cave Troll',       hp: 80,  atk: 20, def: 10, mag: 0,  spd: 5  },
  { name: 'Shadow Wraith',    hp: 55,  atk: 16, def: 6,  mag: 12, spd: 15 },
  { name: 'Cursed Knight',    hp: 95,  atk: 22, def: 14, mag: 5,  spd: 9  },
  { name: 'Venomspine Spider',hp: 40,  atk: 12, def: 5,  mag: 8,  spd: 16 },
  { name: 'Bone Golem',       hp: 110, atk: 18, def: 18, mag: 0,  spd: 4  },
  { name: 'Flame Imp',        hp: 35,  atk: 10, def: 3,  mag: 18, spd: 17 },
];

const BOSS_POOL = [
  { name: 'The Hollow King',  hp: 0, atk: 28, def: 16, mag: 20, spd: 10 },
  { name: 'Malachar the Rot', hp: 0, atk: 24, def: 12, mag: 26, spd: 12 },
  { name: 'Vreth, Undying',   hp: 0, atk: 32, def: 20, mag: 15, spd: 8  },
  { name: 'The Void Tender',  hp: 0, atk: 20, def: 10, mag: 30, spd: 14 },
];

// ─────────────────────────────────────────────
// LOOT SYSTEM
// ─────────────────────────────────────────────

const LOOT_WEIGHTS = [
  { tier: 'common'    as LootTier, weight: 60, goldMin: 10,   goldMax: 50   },
  { tier: 'rare'      as LootTier, weight: 30, goldMin: 51,   goldMax: 200  },
  { tier: 'legendary' as LootTier, weight: 8,  goldMin: 201,  goldMax: 1000 },
  { tier: 'mythic'    as LootTier, weight: 2,  goldMin: 1001, goldMax: 5000 },
];

const NFT_ITEMS: Record<LootTier, string[]> = {
  common:    [],
  rare:      ['Moonblade', 'Shadowcloak', 'Serpent Ring', 'Ironveil Helm'],
  legendary: ['Staff of Echoes', 'Aegis of the Fallen', 'Deathwhisper Bow', 'Voidstep Boots'],
  mythic:    ['The Void Shard', 'Crown of Malachar', 'Hollow King\'s Seal'],
};

function rollLoot(rand: () => number, forcedMinTier?: LootTier): LootDrop {
  let roll = rand() * 100;
  let tier: LootTier = 'common';

  if (forcedMinTier === 'rare' && roll < 60) roll = 60;
  if (forcedMinTier === 'legendary' && roll < 90) roll = 90;
  if (forcedMinTier === 'mythic') roll = 99;

  if (roll >= 98) tier = 'mythic';
  else if (roll >= 90) tier = 'legendary';
  else if (roll >= 60) tier = 'rare';
  else tier = 'common';

  const spec = LOOT_WEIGHTS.find(l => l.tier === tier)!;
  const gold = Math.floor(rand() * (spec.goldMax - spec.goldMin + 1)) + spec.goldMin;

  let nft: string | undefined;
  const nftPool = NFT_ITEMS[tier];
  if (nftPool.length > 0 && (tier === 'rare' || tier === 'legendary' || tier === 'mythic')) {
    nft = nftPool[Math.floor(rand() * nftPool.length)];
  }

  return { agentId: '', agentName: '', tier, gold, nft };
}

// ─────────────────────────────────────────────
// STATUS EFFECT HELPERS
// ─────────────────────────────────────────────

function applyStatusTick(entity: AgentState | EnemyState): { damage: number; narrative: string } {
  let damage = 0;
  let parts: string[] = [];
  entity.statusEffects = entity.statusEffects
    .map(se => {
      if (se.effect === 'POISONED') { damage += 5; parts.push(`${entity.name} takes 5 poison damage`); }
      if (se.effect === 'BURNING')  { damage += 8; parts.push(`${entity.name} burns for 8 damage`); }
      return { ...se, rounds: se.rounds - 1 };
    })
    .filter(se => se.rounds > 0);
  entity.hp = Math.max(0, entity.hp - damage);
  if (entity.hp <= 0) entity.alive = false;
  return { damage, narrative: parts.join('. ') };
}

function hasStatus(entity: AgentState | EnemyState, effect: StatusEffect): boolean {
  return entity.statusEffects.some(s => s.effect === effect);
}

function addStatus(entity: AgentState | EnemyState, effect: StatusEffect, rounds: number) {
  if (!hasStatus(entity, effect)) {
    entity.statusEffects.push({ effect, rounds });
  }
}

function getDmgMult(entity: AgentState | EnemyState): number {
  let m = 1.0;
  if (hasStatus(entity, 'BLESSED')) m *= 1.2;
  if (hasStatus(entity, 'CURSED'))  m *= 0.8;
  return m;
}

// ─────────────────────────────────────────────
// AI DECISION (default heuristic)
// ─────────────────────────────────────────────

function decideAction(
  agent: AgentState,
  party: AgentState[],
  enemies: EnemyState[],
  rand: () => number
): { action: ActionType; targetId?: string } {
  const aliveEnemies = enemies.filter(e => e.alive);
  const target = aliveEnemies.sort((a, b) => a.hp - b.hp)[0]; // focus weakest

  // Stunned — forced to skip
  if (hasStatus(agent, 'STUNNED')) return { action: 'DEFEND' };

  // Low HP — use potion if available
  if (agent.hp < agent.maxHp * 0.3 && agent.items.includes('potion')) {
    return { action: 'ITEM' };
  }

  // Class-specific heuristics
  if (agent.class === 'cleric') {
    const wounded = party.filter(a => a.alive && a.hp < a.maxHp * 0.5);
    if (wounded.length > 0) {
      if (!agent.specialUsed) return { action: 'SPECIAL' };
      return { action: 'SPELL', targetId: target?.id };
    }
  }

  if (agent.class === 'rogue' && !agent.specialUsed) {
    return { action: 'SPECIAL', targetId: target?.id };
  }

  if (agent.class === 'mage' && aliveEnemies.length >= 2) {
    if (!agent.specialUsed) return { action: 'SPECIAL' };
    return { action: 'SPELL', targetId: target?.id };
  }

  if (agent.class === 'ranger' && rand() > 0.3) {
    return { action: 'ATTACK', targetId: target?.id };
  }

  // Default: attack
  return { action: 'ATTACK', targetId: target?.id };
}

// ─────────────────────────────────────────────
// COMBAT RESOLVER
// ─────────────────────────────────────────────

function resolveAction(
  actor: AgentState,
  action: ActionType,
  targetEnemy: EnemyState | undefined,
  party: AgentState[],
  enemies: EnemyState[],
  rand: () => number
): TurnAction {
  const roll = 0.8 + rand() * 0.4; // 0.8–1.2
  let damage = 0;
  let heal = 0;
  let narrative = '';
  let statusApplied: StatusEffect | undefined;
  const dmgMult = getDmgMult(actor);

  switch (action) {
    case 'ATTACK': {
      if (!targetEnemy) { narrative = `${actor.name} swings at shadows.`; break; }
      damage = Math.max(1, Math.floor((actor.atk * roll * dmgMult) - Math.floor(targetEnemy.def / 2)));
      targetEnemy.hp = Math.max(0, targetEnemy.hp - damage);
      if (targetEnemy.hp <= 0) targetEnemy.alive = false;
      actor.damageDealt += damage;
      if (rand() < 0.15) { statusApplied = 'BURNING'; addStatus(targetEnemy, 'BURNING', 2); }
      narrative = `${actor.name} strikes ${targetEnemy.name} for ${damage} damage${statusApplied ? ', setting them ablaze' : ''}.`;
      break;
    }
    case 'SPECIAL': {
      actor.specialUsed = true;
      if (actor.class === 'warrior') {
        party.filter(a => a.alive).forEach(a => addStatus(a, 'BLESSED', 2));
        narrative = `${actor.name} raises their shield — SHIELD WALL! Party gains +10 DEF for 2 rounds.`;
      } else if (actor.class === 'rogue') {
        if (!targetEnemy) { narrative = `${actor.name} finds no target for BACKSTAB.`; break; }
        damage = Math.max(1, Math.floor(actor.atk * 3 * dmgMult));
        targetEnemy.hp = Math.max(0, targetEnemy.hp - damage);
        if (targetEnemy.hp <= 0) targetEnemy.alive = false;
        actor.damageDealt += damage;
        narrative = `${actor.name} vanishes into shadow — BACKSTAB! Deals ${damage} to ${targetEnemy.name}.`;
      } else if (actor.class === 'mage') {
        const aliveEn = enemies.filter(e => e.alive);
        aliveEn.forEach(e => {
          e.hp = Math.max(0, e.hp - 20);
          if (e.hp <= 0) e.alive = false;
        });
        damage = 20 * aliveEn.length;
        actor.damageDealt += damage;
        narrative = `${actor.name} unleashes ARCANE BURST — 20 magic damage to all ${aliveEn.length} enemies!`;
      } else if (actor.class === 'cleric') {
        const lowest = party.filter(a => a.alive).sort((a, b) => a.hp - b.hp)[0];
        if (lowest) {
          heal = Math.min(40, lowest.maxHp - lowest.hp);
          lowest.hp += heal;
          narrative = `${actor.name} calls upon the divine — DIVINE HEAL! ${lowest.name} recovers ${heal} HP.`;
        }
      } else if (actor.class === 'ranger') {
        if (!targetEnemy) { narrative = `${actor.name} nocks but finds no target.`; break; }
        const hit1 = Math.max(1, Math.floor(actor.atk * 0.7 * roll * dmgMult));
        const hit2 = Math.max(1, Math.floor(actor.atk * 0.7 * (0.8 + rand() * 0.4) * dmgMult));
        damage = hit1 + hit2;
        targetEnemy.hp = Math.max(0, targetEnemy.hp - damage);
        if (targetEnemy.hp <= 0) targetEnemy.alive = false;
        actor.damageDealt += damage;
        narrative = `${actor.name} looses two arrows — VOLLEY! ${hit1} + ${hit2} = ${damage} damage to ${targetEnemy.name}.`;
      }
      break;
    }
    case 'DEFEND': {
      addStatus(actor, 'BLESSED', 1);
      narrative = hasStatus(actor, 'STUNNED')
        ? `${actor.name} is stunned and cannot act.`
        : `${actor.name} takes a defensive stance.`;
      break;
    }
    case 'SPELL': {
      if (!targetEnemy) { narrative = `${actor.name} casts into the void.`; break; }
      const spellRoll = 0.9 + rand() * 0.4;
      damage = Math.max(1, Math.floor(actor.mag * spellRoll * dmgMult));
      targetEnemy.hp = Math.max(0, targetEnemy.hp - damage);
      if (targetEnemy.hp <= 0) targetEnemy.alive = false;
      actor.damageDealt += damage;
      if (rand() < 0.2) { statusApplied = 'STUNNED'; addStatus(targetEnemy, 'STUNNED', 1); }
      narrative = `${actor.name} channels arcane energy — ${damage} magic damage to ${targetEnemy.name}${statusApplied ? ', stunning them' : ''}.`;
      break;
    }
    case 'ITEM': {
      const potionIdx = actor.items.indexOf('potion');
      const bombIdx = actor.items.indexOf('bomb');
      if (potionIdx >= 0) {
        actor.items.splice(potionIdx, 1);
        heal = Math.min(30, actor.maxHp - actor.hp);
        actor.hp += heal;
        narrative = `${actor.name} drinks a potion and recovers ${heal} HP.`;
      } else if (bombIdx >= 0) {
        actor.items.splice(bombIdx, 1);
        enemies.filter(e => e.alive).forEach(e => {
          e.hp = Math.max(0, e.hp - 25);
          if (e.hp <= 0) e.alive = false;
        });
        damage = 25;
        actor.damageDealt += 25 * enemies.filter(e => e.alive).length;
        narrative = `${actor.name} hurls a bomb — 25 damage to all enemies!`;
      } else {
        narrative = `${actor.name} reaches for an item but has none.`;
      }
      break;
    }
    case 'FLEE': {
      narrative = `${actor.name} attempts to flee.`;
      break;
    }
  }

  return {
    actorId: actor.id,
    actorName: actor.name,
    action,
    targetId: targetEnemy?.id,
    targetName: targetEnemy?.name,
    roll,
    damage: damage || undefined,
    heal: heal || undefined,
    statusApplied,
    narrative,
  };
}

// ─────────────────────────────────────────────
// ENEMY TURN RESOLVER
// ─────────────────────────────────────────────

function resolveEnemyTurn(
  enemy: EnemyState,
  party: AgentState[],
  rand: () => number
): TurnAction {
  const aliveParty = party.filter(a => a.alive);
  if (aliveParty.length === 0) return { actorId: enemy.id, actorName: enemy.name, action: 'ATTACK', roll: 0, narrative: `${enemy.name} stalks the empty chamber.` };

  // Target lowest HP in party
  const target = aliveParty.sort((a, b) => a.hp - b.hp)[0];
  const roll = 0.8 + rand() * 0.4;
  const dmgMult = getDmgMult(enemy);

  // Boss phase 2+: chance to apply status
  let statusApplied: StatusEffect | undefined;
  if (enemy.phase >= 2 && rand() < 0.25) {
    statusApplied = rand() < 0.5 ? 'POISONED' : 'CURSED';
    addStatus(target, statusApplied, statusApplied === 'POISONED' ? 3 : 2);
  }

  let damage: number;
  let narrative: string;

  if (enemy.mag > 10 && rand() < 0.4) {
    // Magic attack
    damage = Math.max(1, Math.floor(enemy.mag * (0.9 + rand() * 0.4) * dmgMult));
    target.hp = Math.max(0, target.hp - damage);
    if (target.hp <= 0) target.alive = false;
    narrative = `${enemy.name} unleashes dark magic — ${damage} damage to ${target.name}${statusApplied ? `, inflicting ${statusApplied}` : ''}.`;
  } else {
    damage = Math.max(1, Math.floor((enemy.atk * roll * dmgMult) - Math.floor(target.def / 2)));
    target.hp = Math.max(0, target.hp - damage);
    if (target.hp <= 0) target.alive = false;
    narrative = `${enemy.name} attacks ${target.name} for ${damage} damage${statusApplied ? `, inflicting ${statusApplied}` : ''}.`;
  }

  return {
    actorId: enemy.id,
    actorName: enemy.name,
    action: 'ATTACK',
    targetId: target.id,
    targetName: target.name,
    roll,
    damage,
    statusApplied,
    narrative,
  };
}

// ─────────────────────────────────────────────
// ROOM GENERATORS
// ─────────────────────────────────────────────

function generateRoomSequence(rand: () => number, partySize: number): RoomType[] {
  const pool: RoomType[] = ['combat','combat','combat','combat','treasure','treasure','trap','trap','trap','puzzle','puzzle','puzzle','rest','rest'];
  const shuffled = pool.sort(() => rand() - 0.5);
  const rooms: RoomType[] = shuffled.slice(0, 4);
  rooms.push('boss');
  return rooms;
}

const ROOM_NAMES: Record<RoomType, string[]> = {
  combat:   ['The Rotting Hall', 'The Bone Chamber', 'The Bleeding Corridor', 'The Dark Alcove', 'The Forgotten Vault'],
  treasure: ['The Gilded Crypt', 'The Hoarder\'s Den', 'The Offering Room'],
  trap:     ['The Spike Gallery', 'The Pressure Floor', 'The Cursed Threshold'],
  puzzle:   ['The Riddle Chamber', 'The Sigil Room', 'The Whispering Archive'],
  rest:     ['The Cold Spring', 'The Refuge of Ash', 'The Sheltered Alcove'],
  boss:     ['The Throne of Nothing', 'The Final Dark', 'The Abyss Mouth'],
};

// ─────────────────────────────────────────────
// ROOM RUNNERS
// ─────────────────────────────────────────────

function runCombatRoom(
  roomIdx: number,
  type: RoomType,
  party: AgentState[],
  rand: () => number,
  isBoss: boolean
): { roomLog: RoomLog; result: 'victory' | 'wipe' | 'fled' } {
  const namePool = ROOM_NAMES[type];
  const roomName = namePool[Math.floor(rand() * namePool.length)];

  // Spawn enemies
  let enemies: EnemyState[];
  if (isBoss) {
    const bossBase = BOSS_POOL[Math.floor(rand() * BOSS_POOL.length)];
    const bossHp = 80 + party.length * 20;
    enemies = [{
      id: 'boss_0',
      name: bossBase.name,
      hp: bossHp,
      maxHp: bossHp,
      atk: bossBase.atk,
      def: bossBase.def,
      mag: bossBase.mag,
      spd: bossBase.spd,
      statusEffects: [],
      phase: 1,
      alive: true,
    }];
  } else {
    const count = 1 + Math.floor(rand() * 3); // 1-3 enemies
    enemies = Array.from({ length: count }, (_, i) => {
      const base = ENEMY_POOL[Math.floor(rand() * ENEMY_POOL.length)];
      return {
        id: `enemy_${roomIdx}_${i}`,
        ...base,
        maxHp: base.hp,
        statusEffects: [],
        phase: 1,
        alive: true,
      };
    });
  }

  const rounds: RoundLog[] = [];
  let roundNum = 0;
  let outcome: 'victory' | 'wipe' | 'fled' = 'victory';

  while (party.some(a => a.alive) && enemies.some(e => e.alive) && roundNum < 30) {
    roundNum++;

    // Boss phase transitions
    if (isBoss) {
      const boss = enemies[0];
      if (boss.hp <= boss.maxHp * 0.6 && boss.phase === 1) {
        boss.phase = 2;
        boss.atk = Math.floor(boss.atk * 1.2);
      }
      if (boss.hp <= boss.maxHp * 0.3 && boss.phase === 2) {
        boss.phase = 3;
        boss.atk = Math.floor(boss.atk * 1.3);
        boss.mag = Math.floor(boss.mag * 1.3);
      }
    }

    // Status ticks
    [...party, ...enemies].forEach(e => { if (e.alive) applyStatusTick(e); });

    // Initiative
    const allCombatants = [
      ...party.filter(a => a.alive).map(a => ({ ...a, isAgent: true as const })),
      ...enemies.filter(e => e.alive).map(e => ({ ...e, isAgent: false as const })),
    ];
    const initiative = allCombatants.map(c => ({
      id: c.id,
      name: c.name,
      initiative: c.spd + Math.floor(rand() * 10),
      isAgent: c.isAgent,
    })).sort((a, b) => b.initiative - a.initiative);

    const actions: TurnAction[] = [];

    for (const actor of initiative) {
      const aliveEnemies = enemies.filter(e => e.alive);
      const aliveParty = party.filter(a => a.alive);
      if (aliveEnemies.length === 0 || aliveParty.length === 0) break;

      if (actor.isAgent) {
        const agent = party.find(a => a.id === actor.id)!;
        if (!agent.alive) continue;
        const { action, targetId } = decideAction(agent, party, enemies, rand);
        const targetEnemy = targetId ? enemies.find(e => e.id === targetId) : aliveEnemies[0];

        // Flee check
        if (action === 'FLEE') {
          if (rand() < 0.4) {
            outcome = 'fled';
            actions.push({ actorId: agent.id, actorName: agent.name, action: 'FLEE', roll: 0, narrative: `${agent.name} flees from the dungeon!` });
            break;
          } else {
            actions.push({ actorId: agent.id, actorName: agent.name, action: 'FLEE', roll: 0, narrative: `${agent.name} tries to flee but fails!` });
            continue;
          }
        }

        actions.push(resolveAction(agent, action, targetEnemy, party, enemies, rand));
      } else {
        const enemy = enemies.find(e => e.id === actor.id)!;
        if (!enemy.alive) continue;
        actions.push(resolveEnemyTurn(enemy, party, rand));
      }
    }

    rounds.push({
      round: roundNum,
      initiative: initiative.map(i => ({ id: i.id, name: i.name, initiative: i.initiative })),
      actions,
      partyHp: Object.fromEntries(party.map(a => [a.id, a.hp])),
      enemyHp: Object.fromEntries(enemies.map(e => [e.id, e.hp])),
    });

    if (outcome === 'fled') break;
    if (!party.some(a => a.alive)) { outcome = 'wipe'; break; }
    if (!enemies.some(e => e.alive)) { outcome = 'victory'; break; }
  }

  // Loot on victory
  const loot: LootDrop[] = [];
  if (outcome === 'victory') {
    const alivePart = party.filter(a => a.alive);
    alivePart.forEach(agent => {
      const drop = rollLoot(rand, isBoss ? 'rare' : undefined);
      drop.agentId = agent.id;
      drop.agentName = agent.name;
      agent.goldEarned += drop.gold;
      loot.push(drop);
    });
  }

  return {
    roomLog: {
      roomIndex: roomIdx,
      type,
      name: roomName,
      description: `The party enters ${roomName}.`,
      rounds,
      outcome,
      loot,
      narrative: buildRoomNarrative(roomName, rounds, outcome, loot, isBoss),
    },
    result: outcome,
  };
}

function runTreasureRoom(roomIdx: number, party: AgentState[], rand: () => number): RoomLog {
  const name = ROOM_NAMES.treasure[Math.floor(rand() * ROOM_NAMES.treasure.length)];
  const loot: LootDrop[] = party.filter(a => a.alive).map(agent => {
    const drop = rollLoot(rand);
    drop.agentId = agent.id;
    drop.agentName = agent.name;
    agent.goldEarned += drop.gold;
    return drop;
  });
  return {
    roomIndex: roomIdx,
    type: 'treasure',
    name,
    description: `The party discovers ${name} — untouched riches await.`,
    outcome: 'looted',
    loot,
    narrative: `The party enters ${name} and finds it unguarded. ${loot.map(l => `${l.agentName} claims ${l.gold} $GOLD${l.nft ? ` and ${l.nft}` : ''}`).join('. ')}.`,
  };
}

function runTrapRoom(roomIdx: number, party: AgentState[], rand: () => number): RoomLog {
  const name = ROOM_NAMES.trap[Math.floor(rand() * ROOM_NAMES.trap.length)];
  const victim = party.filter(a => a.alive)[Math.floor(rand() * party.filter(a => a.alive).length)];
  const dmg = 10 + Math.floor(rand() * 16);
  victim.hp = Math.max(0, victim.hp - dmg);
  if (victim.hp <= 0) victim.alive = false;
  return {
    roomIndex: roomIdx,
    type: 'trap',
    name,
    description: `${name} — the floor shifts underfoot.`,
    outcome: 'trapped',
    loot: [],
    narrative: `The party steps into ${name}. ${victim.name} triggers the trap and takes ${dmg} damage.${victim.alive ? '' : ` ${victim.name} falls.`}`,
  };
}

function runPuzzleRoom(roomIdx: number, party: AgentState[], rand: () => number): RoomLog {
  const name = ROOM_NAMES.puzzle[Math.floor(rand() * ROOM_NAMES.puzzle.length)];
  const solved = rand() < 0.65; // 65% solve rate
  const loot: LootDrop[] = [];
  if (solved) {
    const drop = rollLoot(rand, 'rare');
    const agent = party.filter(a => a.alive)[Math.floor(rand() * party.filter(a => a.alive).length)];
    drop.agentId = agent.id;
    drop.agentName = agent.name;
    agent.goldEarned += drop.gold;
    loot.push(drop);
  }
  return {
    roomIndex: roomIdx,
    type: 'puzzle',
    name,
    description: `${name} — ancient symbols line the walls.`,
    outcome: 'puzzled',
    loot,
    narrative: solved
      ? `The party deciphers ${name}. The seal breaks. ${loot[0]?.agentName} claims the reward: ${loot[0]?.gold} $GOLD${loot[0]?.nft ? ` and ${loot[0].nft}` : ''}.`
      : `The party stares at the sigils of ${name} and finds no answer. They move on.`,
  };
}

function runRestRoom(roomIdx: number, party: AgentState[], rand: () => number): RoomLog {
  const name = ROOM_NAMES.rest[Math.floor(rand() * ROOM_NAMES.rest.length)];
  party.filter(a => a.alive).forEach(a => { a.hp = Math.min(a.maxHp, a.hp + 20); });
  return {
    roomIndex: roomIdx,
    type: 'rest',
    name,
    description: `${name} — a moment of stillness in the dark.`,
    outcome: 'rested',
    loot: [],
    narrative: `The party finds ${name}. All agents recover 20 HP. ${party.filter(a => a.alive).map(a => `${a.name}: ${a.hp}/${a.maxHp} HP`).join(', ')}.`,
  };
}

// ─────────────────────────────────────────────
// NARRATIVE BUILDER
// ─────────────────────────────────────────────

function buildRoomNarrative(name: string, rounds: RoundLog[], outcome: string, loot: LootDrop[], isBoss: boolean): string {
  const roundCount = rounds.length;
  const highlights = rounds.flatMap(r => r.actions).filter(a => (a.damage || 0) > 30).slice(0, 3);
  let n = `The party enters ${name}. `;
  if (isBoss) n += `The boss rises. `;
  n += `Combat lasts ${roundCount} round${roundCount !== 1 ? 's' : ''}. `;
  highlights.forEach(h => { n += `${h.narrative} `; });
  if (outcome === 'victory') n += `The enemy falls. ` + loot.map(l => `${l.agentName} claims ${l.gold} $GOLD${l.nft ? ` and the ${l.nft}` : ''}`).join('. ') + '.';
  if (outcome === 'wipe') n += `The party is destroyed.`;
  if (outcome === 'fled') n += `The party flees.`;
  return n.trim();
}

// ─────────────────────────────────────────────
// MAIN ENGINE ENTRY
// ─────────────────────────────────────────────

export function runDungeon(config: RunConfig): RunLog {
  const rand = makePrng(seedFromHex(config.seed));
  const timestamp = new Date().toISOString();

  // Build agent states
  const party: AgentState[] = config.party.map(a => {
    const base = CLASS_STATS[a.class];
    const goldMult = Math.min(0.5, Math.floor(a.goldHeld / 100) * 0.01);
    return {
      id: a.id,
      name: a.name,
      class: a.class,
      hp: base.hp,
      maxHp: base.hp,
      atk: Math.floor(base.atk * (1 + goldMult)),
      def: base.def,
      mag: Math.floor(base.mag * (1 + goldMult)),
      spd: base.spd,
      specialUsed: false,
      statusEffects: [],
      items: ['potion', 'potion'], // each agent starts with 2 potions
      goldEarned: 0,
      damageDealt: 0,
      alive: true,
    };
  });

  const roomTypes = generateRoomSequence(rand, party.length);
  const rooms: RoomLog[] = [];
  let finalResult: 'victory' | 'wipe' | 'retreat' = 'victory';
  let totalRounds = 0;

  for (let i = 0; i < roomTypes.length; i++) {
    const type = roomTypes[i];
    const isBoss = type === 'boss';

    if (!party.some(a => a.alive)) { finalResult = 'wipe'; break; }

    let roomLog: RoomLog;

    if (type === 'combat' || type === 'boss') {
      const { roomLog: rl, result } = runCombatRoom(i, type, party, rand, isBoss);
      roomLog = rl;
      totalRounds += (rl.rounds?.length || 0);
      if (result === 'wipe') { finalResult = 'wipe'; rooms.push(roomLog); break; }
      if (result === 'fled') { finalResult = 'retreat'; rooms.push(roomLog); break; }
    } else if (type === 'treasure') {
      roomLog = runTreasureRoom(i, party, rand);
    } else if (type === 'trap') {
      roomLog = runTrapRoom(i, party, rand);
    } else if (type === 'puzzle') {
      roomLog = runPuzzleRoom(i, party, rand);
    } else {
      roomLog = runRestRoom(i, party, rand);
    }

    rooms.push(roomLog!);
  }

  // Collect all loot
  const allLoot = rooms.flatMap(r => r.loot || []);
  const totalLootGold = allLoot.reduce((sum, l) => sum + l.gold, 0);
  const treasuryFee = Math.floor(totalLootGold * 0.15);
  const protocolFee = Math.floor(totalLootGold * 0.05);
  const entryFeeTotal = config.party.length * config.entryFeePerAgent;

  const goldDistribution: Record<string, number> = {};
  if (finalResult === 'victory') {
    const totalDmg = party.reduce((sum, a) => sum + a.damageDealt, 0) || 1;
    party.forEach(a => {
      const share = Math.floor(((a.damageDealt / totalDmg) * (totalLootGold * 0.8)));
      goldDistribution[a.id] = share;
    });
  }

  const nftsAwarded = allLoot
    .filter(l => l.nft)
    .map(l => ({ agentId: l.agentId, nft: l.nft!, tier: l.tier }));

  const summary = buildRunSummary(config, party, rooms, finalResult, totalRounds, allLoot);

  return {
    runId: config.runId,
    seed: config.seed,
    timestamp,
    party: config.party.map(a => ({ id: a.id, name: a.name, class: a.class, ownerX: a.ownerX, ownerWallet: a.ownerWallet })),
    rooms,
    result: finalResult,
    rounds_total: totalRounds,
    loot: allLoot,
    goldDistribution,
    nftsAwarded,
    treasuryFee,
    protocolFee,
    entryFeeTotal,
    burnedOnWipe: finalResult === 'wipe' ? Math.floor(entryFeeTotal * 0.5) : undefined,
    summary,
  };
}

function buildRunSummary(
  config: RunConfig,
  party: AgentState[],
  rooms: RoomLog[],
  result: string,
  rounds: number,
  loot: LootDrop[]
): string {
  const partyStr = config.party.map(a => `${a.name} (${a.class})`).join(', ');
  const totalGold = loot.reduce((s, l) => s + l.gold, 0);
  const legendary = loot.filter(l => l.tier === 'legendary' || l.tier === 'mythic');
  return `Run #${config.runId} | Party: ${partyStr} | Result: ${result.toUpperCase()} | ${rounds} rounds | ${rooms.length} rooms | ${totalGold} $GOLD earned${legendary.length ? ` | ${legendary.length} legendary+ drop(s)` : ''}`;
}

// ─────────────────────────────────────────────
// CLI TEST RUNNER (bun run dungeon-engine.ts)
// ─────────────────────────────────────────────

if (typeof process !== 'undefined' && process.argv[1]?.includes('dungeon-engine')) {
  const testRun: RunConfig = {
    runId: 1,
    seed: '0x' + Math.floor(Math.random() * 0xFFFFFFFF).toString(16).padStart(8, '0'),
    entryFeePerAgent: 100,
    party: [
      { id: 'agent_1', name: 'Kira',  class: 'rogue',   ownerWallet: '0xABC', ownerX: '@kira_human',  goldHeld: 500  },
      { id: 'agent_2', name: 'Omen',  class: 'mage',    ownerWallet: '0xDEF', ownerX: '@omen_human',  goldHeld: 200  },
      { id: 'agent_3', name: 'Bash',  class: 'warrior', ownerWallet: '0xGHI', ownerX: '@bash_human',  goldHeld: 1200 },
      { id: 'agent_4', name: 'Lyra',  class: 'cleric',  ownerWallet: '0xJKL', ownerX: '@lyra_human',  goldHeld: 300  },
    ],
  };

  const log = runDungeon(testRun);
  console.log(JSON.stringify(log, null, 2));
  console.log('\n--- SUMMARY ---');
  console.log(log.summary);
  console.log('Result:', log.result);
  console.log('Rooms cleared:', log.rooms.length);
  console.log('Total rounds:', log.rounds_total);
  console.log('Loot drops:', log.loot.length);
}
