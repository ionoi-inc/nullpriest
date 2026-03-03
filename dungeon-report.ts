/**
 * nullpriest Dungeon — Adventure Report Generator v1.0
 * Takes RunLog JSON from dungeon-engine.ts
 * Outputs: full prose narrative + delivers to X, Telegram, Email
 */

import type { RunLog, RoomLog, LootDrop, LootTier } from './dungeon-engine';

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────

const CONFIG = {
  X_API_URL:        'https://api.twitter.com/2/tweets',
  TELEGRAM_API_URL: (token: string) => `https://api.telegram.org/bot${token}/sendMessage`,
  NEBULA_EMAIL:     'ionoi@nebula.me',
  SITE_BASE_URL:    'https://nullpriest.xyz',
  NULLPRIEST_X:     '@nullPriest_',
};

// Injected at runtime from env
const X_BEARER_TOKEN    = process.env.X_BEARER_TOKEN    || '';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID   = process.env.TELEGRAM_CHAT_ID   || '';

// ─────────────────────────────────────────────
// PROSE TEMPLATES
// ─────────────────────────────────────────────

const ROOM_INTROS: Record<string, string[]> = {
  combat: [
    'Blades scraped stone as the party rounded the corner into',
    'Silence broke into chaos as they stepped into',
    'The stench of old death greeted them at the threshold of',
    'Movement in the dark. The party readied weapons entering',
  ],
  treasure: [
    'Fortune smiled upon the weary party as they discovered',
    'No enemies waited — only glittering promise — in',
    'Torchlight caught the gleam of unclaimed wealth inside',
  ],
  trap: [
    'The floor shifted beneath their feet inside',
    'Too late, they saw the tripwire spanning',
    'Ancient mechanisms groaned to life as they entered',
  ],
  puzzle: [
    'Glyphs covered every surface of',
    'A sealed door and a wall of symbols blocked the path through',
    'The air hummed with old magic inside',
  ],
  rest: [
    'They found unexpected reprieve in',
    'The darkness relented briefly inside',
    'A cold spring offered solace within',
  ],
  boss: [
    'The final door. Beyond it — something ancient and wrong.',
    'The chamber was too large, the darkness too deep.',
    'Every torch in the hall extinguished at once as they crossed into',
  ],
};

const VICTORY_LINES = [
  'The dust settled. They had survived.',
  'Victory. Hard-earned, bloodsoaked, complete.',
  'The last enemy fell. Silence returned to the dungeon.',
  'They stood among the fallen — battered, breathing, victorious.',
];

const WIPE_LINES = [
  'Darkness claimed them all.',
  'The dungeon held. The party did not.',
  'Their lights went out, one by one.',
  'None returned from the deep.',
];

const RETREAT_LINES = [
  'Discretion proved the better part of valor.',
  'They ran. No shame in living.',
  'The dungeon let them go — this time.',
];

const CLASS_EPITHETS: Record<string, string> = {
  warrior: 'the Ironclad',
  rogue:   'the Shadow',
  mage:    'the Arcane',
  cleric:  'the Blessed',
  ranger:  'the Swift',
};

const TIER_ADJECTIVES: Record<LootTier, string> = {
  common:    'a modest haul of',
  rare:      'the rare prize of',
  legendary: 'the legendary artifact',
  mythic:    'the mythic relic',
};

// ─────────────────────────────────────────────
// PROSE GENERATOR
// ─────────────────────────────────────────────

function pick<T>(arr: T[], seed?: number): T {
  const idx = seed !== undefined
    ? Math.abs(seed) % arr.length
    : Math.floor(Math.random() * arr.length);
  return arr[idx];
}

function formatLootLine(drop: LootDrop): string {
  const adj = TIER_ADJECTIVES[drop.tier];
  if (drop.nft) {
    return `${drop.agentName} claimed ${adj} — the ${drop.nft} — along with ${drop.gold} $GOLD`;
  }
  return `${drop.agentName} claimed ${adj} ${drop.gold} $GOLD`;
}

function generateRoomProse(room: RoomLog, runId: number): string {
  const intro = pick(ROOM_INTROS[room.type] || ROOM_INTROS.combat, runId + room.roomIndex);
  let prose = `\n**${room.name}**\n`;
  prose += `${intro} ${room.name}. `;

  if (room.type === 'combat' || room.type === 'boss') {
    const rounds = room.rounds || [];
    const totalRounds = rounds.length;
    prose += `The fighting lasted ${totalRounds} round${totalRounds !== 1 ? 's' : ''}. `;

    // Pull 2-3 highlight moments
    const highlights = rounds
      .flatMap(r => r.actions)
      .filter(a => a.damage && a.damage > 25)
      .slice(0, 3);

    highlights.forEach(h => {
      prose += h.narrative + ' ';
    });

    if (room.outcome === 'victory') {
      prose += pick(VICTORY_LINES, runId + room.roomIndex) + ' ';
      if (room.loot?.length) {
        prose += room.loot.map(formatLootLine).join('. ') + '.';
      }
    } else if (room.outcome === 'wipe') {
      prose += pick(WIPE_LINES, runId + room.roomIndex);
    } else if (room.outcome === 'fled') {
      prose += pick(RETREAT_LINES, runId + room.roomIndex);
    }
  } else {
    prose += room.narrative;
  }

  return prose;
}

export function generateAdventureReport(log: RunLog): string {
  const date = new Date(log.timestamp).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const partyLine = log.party
    .map(a => `${a.name} ${CLASS_EPITHETS[a.class] || ''}`.trim())
    .join(' · ');

  const resultLine = log.result === 'victory'
    ? `VICTORY — Boss slain in ${log.rounds_total} rounds`
    : log.result === 'wipe'
      ? `WIPE — Party destroyed`
      : `RETREAT — Party fled`;

  let report = '';

  // ── HEADER ──
  report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  report += `DUNGEON RUN #${String(log.runId).padStart(4, '0')}\n`;
  report += `${date}\n`;
  report += `Party: ${partyLine}\n`;
  report += `Result: ${resultLine}\n`;
  report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  // ── OPENING ──
  report += `\nThe dungeon seed was cast. Five rooms waited in the dark.\n`;
  report += `${log.party.length} agents descended. The rest is recorded here.\n`;

  // ── ROOM BY ROOM ──
  log.rooms.forEach(room => {
    report += generateRoomProse(room, log.runId);
    report += '\n';
  });

  // ── RESULT ──
  report += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  if (log.result === 'victory') {
    report += `\nThe dungeon is cleared. The party emerges into the cold light above.\n`;
  } else if (log.result === 'wipe') {
    report += `\nThe dungeon claimed them. Their $GOLD returns to the earth.\n`;
    if (log.burnedOnWipe) {
      report += `${log.burnedOnWipe} $GOLD burned. ${log.burnedOnWipe} $GOLD held by treasury.\n`;
    }
  } else {
    report += `\nThey escaped with what they could carry.\n`;
  }

  // ── LOOT SUMMARY ──
  if (log.loot.length > 0 && log.result !== 'wipe') {
    report += `\nLOOT SUMMARY\n`;
    const byAgent: Record<string, LootDrop[]> = {};
    log.loot.forEach(l => {
      if (!byAgent[l.agentId]) byAgent[l.agentId] = [];
      byAgent[l.agentId].push(l);
    });
    Object.entries(byAgent).forEach(([, drops]) => {
      const name = drops[0].agentName;
      const gold = drops.reduce((s, d) => s + d.gold, 0);
      const nfts = drops.filter(d => d.nft).map(d => d.nft);
      const goldEarned = log.goldDistribution[drops[0].agentId] || gold;
      let line = `├─ ${name}: ${goldEarned} $GOLD`;
      if (nfts.length) line += ` + ${nfts.join(', ')}`;
      report += line + '\n';
    });
  }

  // ── TREASURY ──
  report += `\nTREASURY\n`;
  report += `├─ Entry fees collected: ${log.entryFeeTotal} $GOLD\n`;
  report += `├─ Protocol fee (5%): ${log.protocolFee} $GOLD → ${CONFIG.NULLPRIEST_X}\n`;
  report += `└─ Treasury retained (15%): ${log.treasuryFee} $GOLD\n`;

  // ── FOOTER ──
  report += `\n${CONFIG.SITE_BASE_URL}/dungeon/runs/${log.runId}\n`;
  report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  return report;
}

// ─────────────────────────────────────────────
// X (TWITTER) DELIVERY
// ─────────────────────────────────────────────

export async function postRunToX(log: RunLog, report: string): Promise<string[]> {
  const tweetIds: string[] = [];

  const ownerMentions = log.party
    .filter(a => a.ownerX)
    .map(a => a.ownerX!)
    .join(' ');

  // Tweet 1: headline
  const resultEmoji = log.result === 'victory' ? '⚔️' : log.result === 'wipe' ? '💀' : '🏃';
  const totalGold = Object.values(log.goldDistribution).reduce((s, v) => s + v, 0);
  const headline = [
    `${resultEmoji} DUNGEON RUN #${String(log.runId).padStart(4, '0')} — ${log.result.toUpperCase()}`,
    ``,
    `Party: ${log.party.map(a => a.name).join(' · ')}`,
    `Rooms: ${log.rooms.length} | Rounds: ${log.rounds_total}`,
    log.result === 'victory' ? `Loot: ${totalGold} $GOLD earned` : '',
    ``,
    ownerMentions,
    ``,
    `Full report: ${CONFIG.SITE_BASE_URL}/dungeon/runs/${log.runId}`,
    `$GOLD #nullpriest`,
  ].filter(Boolean).join('\n').slice(0, 280);

  // Tweet 2: room highlights (thread)
  const highlights = log.rooms
    .map((r, i) => `Room ${i + 1} [${r.type.toUpperCase()}]: ${r.name} — ${r.outcome.toUpperCase()}`)
    .join('\n');

  const thread2 = `The dungeon:\n\n${highlights}\n\n${log.result === 'victory' ? '🏆 They cleared it.' : log.result === 'wipe' ? '💀 None survived.' : '🏃 They fled.'}`.slice(0, 280);

  // Tweet 3: loot breakdown (if victory)
  let thread3 = '';
  if (log.result === 'victory' && log.loot.length > 0) {
    const lootLines = log.party.map(a => {
      const drops = log.loot.filter(l => l.agentId === a.id);
      const gold = log.goldDistribution[a.id] || 0;
      const nfts = drops.filter(d => d.nft).map(d => d.nft);
      return `${a.name}: ${gold} $GOLD${nfts.length ? ` + ${nfts[0]}` : ''}`;
    }).join('\n');
    thread3 = `Loot distribution:\n\n${lootLines}\n\n$GOLD flows.`.slice(0, 280);
  }

  if (!X_BEARER_TOKEN) {
    console.log('[X DELIVERY - DRY RUN]');
    console.log('Tweet 1:', headline);
    console.log('Tweet 2:', thread2);
    if (thread3) console.log('Tweet 3:', thread3);
    return ['dry-run-id-1', 'dry-run-id-2'];
  }

  try {
    // Post tweet 1
    const res1 = await fetch(CONFIG.X_API_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${X_BEARER_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: headline }),
    });
    const d1 = await res1.json() as any;
    const id1 = d1?.data?.id;
    if (id1) tweetIds.push(id1);

    // Post tweet 2 as reply
    if (id1) {
      const res2 = await fetch(CONFIG.X_API_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${X_BEARER_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: thread2, reply: { in_reply_to_tweet_id: id1 } }),
      });
      const d2 = await res2.json() as any;
      const id2 = d2?.data?.id;
      if (id2) {
        tweetIds.push(id2);
        // Post tweet 3 as reply to tweet 2
        if (thread3) {
          const res3 = await fetch(CONFIG.X_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${X_BEARER_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: thread3, reply: { in_reply_to_tweet_id: id2 } }),
          });
          const d3 = await res3.json() as any;
          if (d3?.data?.id) tweetIds.push(d3.data.id);
        }
      }
    }
  } catch (err) {
    console.error('[X DELIVERY ERROR]', err);
  }

  return tweetIds;
}

// ─────────────────────────────────────────────
// TELEGRAM DELIVERY
// ─────────────────────────────────────────────

export async function postRunToTelegram(log: RunLog, report: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('[TELEGRAM DELIVERY - DRY RUN]');
    console.log(report.slice(0, 500) + '...');
    return false;
  }

  // Telegram has 4096 char limit — split if needed
  const chunks: string[] = [];
  let remaining = report;
  while (remaining.length > 0) {
    chunks.push(remaining.slice(0, 4000));
    remaining = remaining.slice(4000);
  }

  try {
    for (const chunk of chunks) {
      await fetch(CONFIG.TELEGRAM_API_URL(TELEGRAM_BOT_TOKEN), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: chunk,
          parse_mode: 'Markdown',
        }),
      });
    }
    return true;
  } catch (err) {
    console.error('[TELEGRAM DELIVERY ERROR]', err);
    return false;
  }
}

// ─────────────────────────────────────────────
// EMAIL DELIVERY (via nullpriest system)
// ─────────────────────────────────────────────

export async function emailRunReports(log: RunLog, report: string): Promise<void> {
  const recipients = log.party
    .filter(a => (a as any).ownerEmail)
    .map(a => ({ name: a.name, email: (a as any).ownerEmail as string }));

  if (recipients.length === 0) {
    console.log('[EMAIL DELIVERY] No email recipients configured.');
    return;
  }

  for (const recipient of recipients) {
    const subject = `[nullpriest Dungeon] Run #${String(log.runId).padStart(4, '0')} — ${log.result.toUpperCase()}`;
    const body = `Your agent ${log.party.find(a => (a as any).ownerEmail === recipient.email)?.name || ''} has returned from the dungeon.\n\n${report}`;

    // In production: call your email API here
    // For Nebula: use send_email tool via API
    console.log(`[EMAIL] → ${recipient.email}: ${subject}`);
    console.log(body.slice(0, 200) + '...');
  }
}

// ─────────────────────────────────────────────
// STORE RUN REPORT (write to disk / DB)
// ─────────────────────────────────────────────

export async function storeRunReport(log: RunLog, report: string): Promise<string> {
  const path = `runs/run_${String(log.runId).padStart(4, '0')}.json`;

  // In production: write to your DB / blob storage
  // Stub: write to local filesystem
  try {
    const fs = await import('fs/promises');
    await fs.mkdir('runs', { recursive: true });
    await fs.writeFile(path, JSON.stringify({ log, report }, null, 2));
    console.log(`[STORE] Run saved to ${path}`);
  } catch (err) {
    console.error('[STORE ERROR]', err);
  }

  return `${CONFIG.SITE_BASE_URL}/dungeon/runs/${log.runId}`;
}

// ─────────────────────────────────────────────
// MAIN DELIVERY PIPELINE
// ─────────────────────────────────────────────

export async function deliverRunReport(log: RunLog): Promise<{
  report: string;
  xTweetIds: string[];
  telegramSent: boolean;
  runUrl: string;
}> {
  console.log(`[REPORT] Generating report for run #${log.runId}...`);

  const report = generateAdventureReport(log);

  const [xTweetIds, telegramSent, runUrl] = await Promise.all([
    postRunToX(log, report),
    postRunToTelegram(log, report),
    storeRunReport(log, report),
  ]);

  await emailRunReports(log, report);

  console.log(`[REPORT] Delivered. X tweets: ${xTweetIds.join(', ')} | Telegram: ${telegramSent} | URL: ${runUrl}`);

  return { report, xTweetIds, telegramSent, runUrl };
}

// ─────────────────────────────────────────────
// CLI TEST (bun run dungeon-report.ts)
// ─────────────────────────────────────────────

if (typeof process !== 'undefined' && process.argv[1]?.includes('dungeon-report')) {
  // Load a test run log or generate one inline
  const { runDungeon } = await import('./dungeon-engine');

  const testLog = runDungeon({
    runId: 42,
    seed: '0xdeadbeef',
    entryFeePerAgent: 100,
    party: [
      { id: 'a1', name: 'Kira',  class: 'rogue',   ownerWallet: '0xAAA', ownerX: '@kira_lord',  goldHeld: 500  },
      { id: 'a2', name: 'Omen',  class: 'mage',    ownerWallet: '0xBBB', ownerX: '@omen_lord',  goldHeld: 200  },
      { id: 'a3', name: 'Bash',  class: 'warrior', ownerWallet: '0xCCC', ownerX: '@bash_lord',  goldHeld: 1200 },
    ],
  });

  const { report } = await deliverRunReport(testLog);
  console.log('\n' + report);
}
