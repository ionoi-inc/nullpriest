require('dotenv').config();

const express = require('express');
const path    = require('path');
const cors    = require('cors');
const https   = require('https');

const app  = express();
const PORT = process.env.PORT || 3149;

// GitHub config for memory proxy
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/iono-such-things/nullpriest/master';
const GITHUB_API_BASE = 'https://api.github.com/repos/iono-such-things/nullpriest';

app.use(cors());
app.use(express.json());

// ━━━ Static site ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use(express.static(path.join(__dirname, 'site')));

// ━━━ Health check ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), agent: 'nullpriest', version: '2.1' });
});

// ━━━ Agent status endpoint ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/status', (req, res) => {
  res.json({
    agent: 'nullpriest',
    timestamp: new Date().toISOString(),
    cycle: {
      scout:       { schedule: '*/30 * * * *',  description: 'Scrapes SURVIVE, CLAWS, DAIMON. Writes memory/scout-latest.md' },
      strategist:  { schedule: '0 * * * *',     description: 'Reads scout report. Opens agent-build GitHub issues.' },
      builder:     { schedule: '0 * * * *',     description: 'Picks top issue. Writes code. Commits to repo. Closes issue.' },
      builderB:    { schedule: '0 * * * *',     description: 'Picks issues #2 and #7. Writes code. Commits to repo. Runs in parallel with Builder A.' },
      builderD:    { schedule: '0 * * * *',     description: 'Picks issues #4 and #9. Writes code. Commits to repo. Runs in parallel with Builders A/B.' },
      publisher:   { schedule: '0 */3 * * *',   description: 'Reads build log. Posts to @nullPriest_. Updates activity feed.' }
    },
    contracts: {
      token:  '0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F',
      wallet: '0xe5e3A482862E241A4b5Fb526cC050b830FBA29',
      pool:   '0x2128cf8f508dde2202c6cd5df70be635f975a4f9db46a00789e6439d62518e5c'
    },
    projects: [
      { name: 'headless-markets', status: 'building', description: 'YC for AI agents. 10% protocol fee on every agent token launch.' },
      { name: 'hvac-ai-secretary', status: 'deployed', description: 'Live B2B customer. AI phone secretary for HVAC companies.' },
      { name: 'nullpriest.xyz', status: 'self-improving', description: 'This site. Rebuilt hourly by Builder agent.' },
      { name: 'sshappy', status: 'building', description: 'React Native SSH manager.' }
    ]
  });
});

// ━━━ Memory proxy ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/memory/:filename', (req, res) => {
  const url = `${GITHUB_RAW_BASE}/memory/${req.params.filename}`;
  https.get(url, (ghRes) => {
    res.setHeader('Content-Type', ghRes.headers['content-type'] || 'text/plain');
    ghRes.pipe(res);
  }).on('error', (err) => {
    res.status(500).json({ error: 'GitHub fetch failed', details: err.message });
  });
});

// ━━━ Activity feed endpoint ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Reads memory/activity-feed.md from disk, parses into JSON array, caches 60s
let activityCache = null;
let activityCacheAt = 0;
const ACTIVITY_CACHE_TTL_MS = 60_000;

function parseActivityFeed(markdown) {
  const entries = [];
  const blocks = markdown.split(/\n(?=## )/);
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (!lines[0] || !lines[0].startsWith('## ')) continue;
    const header = lines[0].replace(/^## /, '').trim();
    const dashIdx = header.indexOf(' — ');
    let date = null, title = header;
    if (dashIdx !== -1) {
      date = header.slice(0, dashIdx).trim();
      title = header.slice(dashIdx + 3).trim();
    }
    const bullets = [];
    for (let i = 1; i < lines.length; i++) {
      const m = lines[i].match(/^\s*[-*]\s+(.+)/);
      if (m) bullets.push(m[1].trim());
    }
    entries.push({ date, title, bullets });
  }
  return entries;
}

app.get('/api/activity', (req, res) => {
  const now = Date.now();
  if (activityCache && (now - activityCacheAt < ACTIVITY_CACHE_TTL_MS)) {
    return res.json(activityCache);
  }
  try {
    const fs = require('fs');
    const feedPath = path.join(__dirname, 'memory', 'activity-feed.md');
    const md = fs.readFileSync(feedPath, 'utf8');
    const entries = parseActivityFeed(md);
    activityCache = { entries, cached_at: new Date().toISOString(), source: 'local' };
    activityCacheAt = now;
    res.json(activityCache);
  } catch (err) {
    res.status(500).json({ error: 'activity feed unavailable', details: err.message });
  }
});

// ━━━ Build log endpoint ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let buildCache = null;
let buildCacheAt = 0;
const BUILD_CACHE_TTL_MS = 60_000;

function parseBuildLog(markdown) {
  const entries = [];
  const blocks = markdown.split(/\n(?=## Build #)/);
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (!lines[0] || !lines[0].startsWith('## Build #')) continue;
    const header = lines[0].replace(/^## /, '').trim();
    const m = header.match(/Build #(\d+)\s*\(([^)]+)\)\s*—\s*(.+)/);
    if (!m) continue;
    const buildNum = parseInt(m[1], 10);
    const timestamp = m[2].trim();
    const agent = m[3].trim();
    const issues = [];
    for (let i = 1; i < lines.length; i++) {
      const issueMatch = lines[i].match(/^###\s+Issue\s+#(\d+)\s+—\s+(.+)/);
      if (issueMatch) {
        const issueNum = parseInt(issueMatch[1], 10);
        const issueTitle = issueMatch[2].trim();
        let status = null, commit = null, what = null;
        for (let j = i + 1; j < lines.length && !lines[j].startsWith('###'); j++) {
          if (lines[j].match(/^-\s*Status:/)) status = lines[j].replace(/^-\s*Status:\s*/, '').trim();
          if (lines[j].match(/^-\s*Commit:/)) commit = lines[j].replace(/^-\s*Commit:\s*/, '').trim();
          if (lines[j].match(/^-\s*What:/)) what = lines[j].replace(/^-\s*What:\s*/, '').trim();
        }
        issues.push({ number: issueNum, title: issueTitle, status, commit, what });
      }
    }
    entries.push({ build: buildNum, timestamp, agent, issues });
  }
  return entries;
}

app.get('/api/build-log', (req, res) => {
  const now = Date.now();
  if (buildCache && (now - buildCacheAt < BUILD_CACHE_TTL_MS)) {
    return res.json(buildCache);
  }
  try {
    const fs = require('fs');
    const logPath = path.join(__dirname, 'memory', 'build-log.md');
    const md = fs.readFileSync(logPath, 'utf8');
    const entries = parseBuildLog(md);
    buildCache = { entries, cached_at: new Date().toISOString(), source: 'local' };
    buildCacheAt = now;
    res.json(buildCache);
  } catch (err) {
    res.status(500).json({ error: 'build log unavailable', details: err.message });
  }
});

// ━━━ $NULP Price endpoint ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Using native fetch (Node 18+ built-in) — no need for node-fetch package

let priceCache = null;
let priceCacheAt = 0;
const PRICE_CACHE_TTL_MS = 30_000;

app.get('/api/price', async (req, res) => {
  const now = Date.now();
  if (priceCache && (now - priceCacheAt < PRICE_CACHE_TTL_MS)) {
    return res.json(priceCache);
  }
  try {
    const NULP_ADDRESS = '0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F';
    const url = `https://api.dexscreener.com/latest/dex/tokens/${NULP_ADDRESS}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.pairs || data.pairs.length === 0) {
      return res.json({ error: 'No trading pairs found', price: 0, cached_at: new Date().toISOString() });
    }
    
    const pair = data.pairs[0];
    priceCache = {
      price: parseFloat(pair.priceUsd || 0),
      price_change_24h: parseFloat(pair.priceChange?.h24 || 0),
      volume_24h: parseFloat(pair.volume?.h24 || 0),
      liquidity: parseFloat(pair.liquidity?.usd || 0),
      cached_at: new Date().toISOString(),
      source: 'dexscreener'
    };
    priceCacheAt = now;
    res.json(priceCache);
  } catch (err) {
    res.status(500).json({ error: 'price fetch failed', details: err.message, price: 0 });
  }
});

// ━━━ Start server ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.listen(PORT, () => {
  console.log(`nullpriest server running on port ${PORT}`);
  console.log(`Memory proxy: /memory/:filename → GitHub raw`);
  console.log(`Activity feed: /api/activity → memory/activity-feed.md`);
  console.log(`Build log: /api/build-log → memory/build-log.md`);
  console.log(`Price: /api/price → DexScreener API`);
});