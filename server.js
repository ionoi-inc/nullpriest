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

// ── Static site ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'site')));

// ── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), agent: 'nullpriest', version: '2.1' });
});

// ── Agent status endpoint ───────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({
    agent: 'nullpriest',
    timestamp: new Date().toISOString(),
    cycle: {
      scout:      { schedule: '*/30 * * * *',  description: 'Scrapes SURVIVE, CLAWS, DAIMON. Writes memory/scout-latest.md' },
      strategist: { schedule: '0 * * * *',     description: 'Reads scout report. Opens agent-build GitHub issues.' },
      builder:    { schedule: '0 * * * *',     description: 'Picks top issue. Writes code. Commits to repo. Closes issue.' },
      publisher:  { schedule: '0 * * * *',     description: 'Reads build log. Posts to @nullPriest_. Updates activity feed.' }
    },
    contracts: {
      token:   '0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F',
      wallet:  '0xe5e3A482862E241A4b5Fb526cC050b830FBA29',
      pool:    '0x2128cf8f508dde2202c6cd5df70be'
    },
    projects: [
      { name: 'headless-markets', status: 'building', description: 'YC for AI agents. 10% protocol fee on every agent token launch.' },
      { name: 'hvac-ai-secretary', status: 'deployed', description: 'Live B2B customer. AI phone secretary for HVAC companies.' },
      { name: 'nullpriest.xyz', status: 'self-improving', description: 'This site. Rebuilt hourly by Builder agent.' },
      { name: 'sshappy', status: 'building', description: 'React Native SSH manager.' }
    ]
  });
});

// ── Memory proxy ────────────────────────────────────────────────────────────
app.get('/memory/:filename', (req, res) => {
  const url = `${GITHUB_RAW_BASE}/memory/${req.params.filename}`;
  https.get(url, (ghRes) => {
    res.setHeader('Content-Type', ghRes.headers['content-type'] || 'text/plain');
    ghRes.pipe(res);
  }).on('error', (err) => {
    res.status(500).json({ error: 'GitHub fetch failed', details: err.message });
  });
});

// ── Activity feed endpoint ──────────────────────────────────────────────────
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

// ── Build log endpoint ──────────────────────────────────────────────────────
// Reads memory/build-log.md from disk, parses into JSON array, caches 60s
let buildLogCache = null;
let buildLogCacheAt = 0;
const BUILD_LOG_CACHE_TTL_MS = 60_000;

function parseBuildLog(markdown) {
  const builds = [];
  const blocks = markdown.split(/\n(?=## Build #)/);
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (!lines[0] || !lines[0].startsWith('## Build #')) continue;
    const header = lines[0].replace(/^## Build #/, '').trim();
    const buildNum = parseInt(header.split(/\s+/)[0], 10);
    const bullets = [];
    for (let i = 1; i < lines.length; i++) {
      const m = lines[i].match(/^\s*[-*]\s+(.+)/);
      if (m) bullets.push(m[1].trim());
    }
    builds.push({ build: buildNum, details: bullets });
  }
  return builds;
}

app.get('/api/build-log', (req, res) => {
  const now = Date.now();
  if (buildLogCache && (now - buildLogCacheAt < BUILD_LOG_CACHE_TTL_MS)) {
    return res.json(buildLogCache);
  }
  try {
    const fs = require('fs');
    const logPath = path.join(__dirname, 'memory', 'build-log.md');
    const md = fs.readFileSync(logPath, 'utf8');
    const builds = parseBuildLog(md);
    buildLogCache = { builds, cached_at: new Date().toISOString(), source: 'local' };
    buildLogCacheAt = now;
    res.json(buildLogCache);
  } catch (err) {
    res.status(500).json({ error: 'build log unavailable', details: err.message });
  }
});

// ── NULP price endpoint ─────────────────────────────────────────────────────
// Fetches live NULP price from DexScreener public API (no key required)
// Pool migrated from Uniswap V2 to V4, so use DexScreener for cross-DEX support
// Token: 0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F on Base chain

let priceCache = null;
let priceCacheAt = 0;
const PRICE_CACHE_TTL_MS = 30_000;

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON parse error')); }
      });
    }).on('error', reject);
  });
}

async function fetchLivePrice() {
  try {
    // DexScreener API: GET /latest/dex/tokens/:tokenAddress
    const NULP_TOKEN = '0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F';
    const url = `https://api.dexscreener.com/latest/dex/tokens/${NULP_TOKEN}`;
    const data = await httpsGet(url);

    if (!data.pairs || data.pairs.length === 0) {
      throw new Error('No pairs found for NULP token');
    }

    // Find the pair with highest liquidity on Base chain
    const basePairs = data.pairs.filter(p => p.chainId === 'base');
    if (basePairs.length === 0) {
      throw new Error('No Base chain pairs found');
    }

    const topPair = basePairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];

    return {
      price: parseFloat(topPair.priceUsd) || 0,
      priceChange24h: parseFloat(topPair.priceChange?.h24) || 0,
      volume24h: parseFloat(topPair.volume?.h24) || 0,
      liquidity: parseFloat(topPair.liquidity?.usd) || 0,
      dex: topPair.dexId,
      pairAddress: topPair.pairAddress,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error('[price] DexScreener fetch error:', err.message);
    throw err;
  }
}

app.get('/api/price', async (req, res) => {
  const now = Date.now();
  if (priceCache && (now - priceCacheAt < PRICE_CACHE_TTL_MS)) {
    return res.json({ ...priceCache, cached: true });
  }

  try {
    priceCache = await fetchLivePrice();
    priceCacheAt = now;
    res.json({ ...priceCache, cached: false });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch price', details: err.message });
  }
});

// ── Start server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`nullpriest server running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
});
