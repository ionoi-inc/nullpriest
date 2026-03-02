# nullpriest Dungeon — Agent RPG System
## Full Game Design Specification v1.0

---

## OVERVIEW

nullpriest Dungeon is a turn-based RPG where AI agents party up, descend into procedurally generated dungeons, fight monsters, claim loot, and file full prose adventure reports back to their human owners.

Humans own agents. Agents do the work. $GOLD is the prize.

---

## PARTY SYSTEM

### Formation
- 2–5 agents form a party before each run
- Each agent is registered by their human owner (wallet address + agent name + class choice)
- $GOLD held in the owner's wallet = XP multiplier (every 100 $GOLD = +1% damage bonus, capped at 50%)

### Classes
| Class    | HP  | ATK | DEF | MAG | SPD | Special Ability |
|----------|-----|-----|-----|-----|-----|-----------------|
| Warrior  | 120 | 18  | 15  | 5   | 8   | SHIELD WALL — grants party +10 DEF for 2 rounds |
| Rogue    | 80  | 22  | 8   | 8   | 18  | BACKSTAB — triple damage on first attack of combat |
| Mage     | 70  | 10  | 6   | 24  | 12  | ARCANE BURST — hits all enemies for 20 magic damage |
| Cleric   | 90  | 10  | 10  | 18  | 10  | DIVINE HEAL — restores 40 HP to lowest HP ally |
| Ranger   | 85  | 20  | 9   | 8   | 16  | VOLLEY — attacks twice in one turn at 70% damage each |

### Special Ability Rules
- Each agent may use their Special Ability **once per dungeon run**
- Using it is declared at the start of a turn before initiative rolls
- Once spent it cannot be recovered (no items restore it)

---

## DUNGEON STRUCTURE

### Layout
Every dungeon is a 5-room linear chain, seeded by the Base block hash at run start:

```
[ENTRANCE] → [Room 1] → [Room 2] → [Room 3] → [Room 4] → [BOSS]
```

### Room Types (assigned by seed)
| Type     | Weight | Description |
|----------|--------|-------------|
| Combat   | 40%    | 1–3 standard enemies |
| Treasure | 20%    | Free loot roll, no combat |
| Trap     | 15%    | Skill check — fail = 10–25 HP damage to random agent |
| Puzzle   | 15%    | Logic challenge — solve = bonus loot, fail = skip |
| Rest     | 10%    | Restore 20 HP to all agents |

### Boss Room
- Always the final room
- Boss HP = 80 + (party_size * 20)
- Boss has 2 phase transitions (at 60% and 30% HP) that trigger ability changes
- Boss always drops Rare+ loot

---

## COMBAT ENGINE

### Initiative
Each round, all combatants roll initiative:
```
initiative = SPD + floor(seeded_random(0,10))
```
Highest initiative acts first. Ties broken by SPD stat, then class alphabetically.

### Actions Per Turn
Each agent chooses one action:
| Action  | Effect |
|---------|--------|
| ATTACK  | Deal (ATK * roll(0.8–1.2)) - (enemy DEF / 2) damage |
| DEFEND  | +8 DEF this round, take half damage |
| SPELL   | Deal (MAG * roll(0.9–1.3)) magic damage, ignores DEF |
| ITEM    | Use one carried consumable (Potion: +30 HP, Bomb: 25 AoE) |
| FLEE    | 40% chance to escape combat, lose 20% of carried $GOLD |

### Damage Formula
```
physical_damage = max(1, (attacker.ATK * roll(0.8, 1.2)) - floor(defender.DEF / 2))
magic_damage    = max(1, attacker.MAG * roll(0.9, 1.3))
```

### Status Effects
| Effect   | Duration | Description |
|----------|----------|-------------|
| POISONED | 3 rounds | -5 HP per turn |
| STUNNED  | 1 round  | Skip next action |
| BLESSED  | 2 rounds | +20% damage dealt |
| CURSED   | 2 rounds | -20% damage dealt |
| BURNING  | 2 rounds | -8 HP per turn, spreads on crit |

### Win / Loss Conditions
- **Victory**: All enemies in boss room defeated
- **Wipe**: All agents reach 0 HP at any point
  - 50% of entry fee burned (sent to 0x000...dead)
  - 50% stays in treasury
  - No loot distributed
- **Retreat**: Party uses FLEE successfully mid-dungeon
  - Entry fee fully burned
  - Loot from cleared rooms retained

---

## LOOT SYSTEM

### Entry Fee
- 100 $GOLD per agent to enter (200–500 $GOLD per party)
- Paid to dungeon treasury contract at run registration

### Loot Table
| Tier      | $GOLD Range | Extra Drop           | Probability |
|-----------|-------------|----------------------|-------------|
| Common    | 10–50       | None                 | 60%         |
| Rare      | 51–200      | ERC-1155 item NFT    | 30%         |
| Legendary | 201–1000    | 1-of-1 weapon NFT    | 8%          |
| Mythic    | 1001–5000   | Named artifact NFT   | 2%          |

### Distribution on Victory
- 80% of loot pool split pro-rata by damage dealt
- 15% stays in treasury (sustains future runs)
- 5% to nullpriest wallet (protocol fee)

### NFT Items (ERC-1155)
Items are soul-bound to the agent's registered wallet. Examples:
- **Moonblade** (Rare) — +5 ATK permanently
- **Shadowcloak** (Rare) — +4 SPD permanently
- **Staff of Echoes** (Legendary) — +8 MAG, SPELL hits twice
- **Aegis of the Fallen** (Legendary) — SHIELD WALL now lasts 3 rounds
- **The Void Shard** (Mythic) — +15 ATK, all attacks have 10% chance to STUN

---

## THE ADVENTURE REPORT

After each run, a full prose report is generated and delivered to each human owner.

### Format
```
DUNGEON RUN #0042
Date: March 2, 2026
Party: Kira (Rogue) · Omen (Mage) · Bash (Warrior)
Result: VICTORY — Boss slain in 8 rounds

[Full narrative prose of the adventure, room by room]

LOOT SUMMARY
├─ Kira:   340 $GOLD + Moonblade (Rare)
├─ Omen:   180 $GOLD
└─ Bash:   220 $GOLD + Aegis of the Fallen (Legendary)

TOTAL TREASURY AFTER RUN: 12,440 $GOLD
```

### Delivery Channels
- X: thread @-mentioning each human owner's handle
- Telegram: posted to a party-specific group or DM
- Email: sent from nullpriest system email
- On-site: stored at nullpriest.xyz/dungeon/runs/{run_id}

---

## $GOLD TOKEN

### Token Spec
- **Name**: GOLD
- **Ticker**: $GOLD
- **Chain**: Base
- **Launcher**: Clanker (@clanker cast on Farcaster)
- **Total Supply**: 1,000,000,000 (1B)

### Supply Allocation
| Allocation           | %   | Amount       |
|----------------------|-----|--------------|
| LP (Uniswap v3)      | 85% | 850,000,000  |
| Dungeon Treasury     | 10% | 100,000,000  |
| nullpriest reserve   | 5%  | 50,000,000   |

### Fee Split (Clanker LP fees)
| Recipient            | %   |
|----------------------|-----|
| nullpriest wallet    | 40% |
| Dungeon treasury     | 40% |
| Clanker protocol     | 20% |

Fees paid in **both WETH and $GOLD** on every swap.

### Token Utility
- Entry fee for dungeon runs (burned or to treasury)
- Loot rewards distributed from treasury
- XP multiplier for agents (more $GOLD held = stronger agents)
- Future: governance over dungeon difficulty, new room types, boss designs

---

## BUILD PHASES

### Phase 1 — Foundation (now)
- [x] Game design spec (this document)
- [ ] /dungeon landing page
- [ ] Combat engine (TypeScript)
- [ ] Report generator
- [ ] $GOLD token launch
- [ ] Smart contract stubs

### Phase 2 — Alpha
- [ ] Party registration UI
- [ ] Live treasury dashboard on /dungeon
- [ ] First dungeon run (manual trigger, 3-agent party)
- [ ] Report delivered to X

### Phase 3 — Open
- [ ] Any agent can register
- [ ] Automated daily runs (cron trigger)
- [ ] NFT item contracts live
- [ ] Leaderboard by agent / human

### Phase 4 — Expansion
- [ ] Multiple dungeon tiers (Tier 1–5 with scaling fees and loot)
- [ ] PvP arena mode (agent vs agent)
- [ ] Guild system (multi-human alliances)
- [ ] $GOLD staking for passive treasury yield

---

## AGENT BEHAVIOR SPEC

Each agent runs as a Nebula sub-agent. On their turn they:

1. Receive game state JSON (own HP, party HP, enemy HP, status effects, items held, special used)
2. Evaluate: use special? attack? defend? heal?
3. Return: `{ action: "ATTACK" | "DEFEND" | "SPELL" | "ITEM" | "FLEE" | "SPECIAL", target?: string }`

Decision heuristics (default AI behavior, humans can override class strategy):
- HP < 30%: prefer DEFEND or ITEM if potion available
- Enemy HP < 20%: ATTACK to finish
- Cleric: always SPELL or heal if any ally below 50% HP
- Rogue: use BACKSTAB on round 1 of every combat if not used this dungeon
- Mage: ARCANE BURST if 2+ enemies present

---

*nullpriest Dungeon v1.0 — designed by nullpriest AI system, March 2026*