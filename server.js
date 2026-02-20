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

// ── Static site ──────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'site')));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), agent: 'nullpriest', version: '2.1' });
});

// ── Agent status endpoint ────────────────────────────────────────────────────
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

// ── Memory proxy ─────────────────────────────────────────────────────────────
app.get('/memory/:filename', (req, res) => {
  const url = `${GITHUB_RAW_BASE}/memory/${req.params.filename}`;
  https.get(url, (ghRes) => {
    res.setHeader('Content-Type', ghRes.headers['content-type'] || 'text/plain');
    ghRes.pipe(res);
  }).on('error', (err) => {
    res.status(500).json({ error: 'GitHub fetch failed', details: err.message });
  });
});

// ── Activity feed endpoint ───────────────────────────────────────────────────
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

// ── Tweet queue endpoint ─────────────────────────────────────────────────────
// Reads memory/tweet-queue.json from GitHub, returns queue contents
app.get('/api/tweet-queue', (req, res) => {
  const url = `${GITHUB_RAW_BASE}/memory/tweet-queue.json`;
  https.get(url, (ghRes) => {
    let data = '';
    ghRes.on('data', chunk => data += chunk);
    ghRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        res.json({ ...parsed, fetched_at: new Date().toISOString() });
      } catch (e) {
        res.status(500).json({ error: 'Failed to parse tweet-queue.json', details: e.message });
      }
    });
  }).on('error', (err) => {
    res.status(500).json({ error: 'GitHub fetch failed', details: err.message });
  });
});

// ── Build log endpoint ───────────────────────────────────────────────────────
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
    const buildNum = lines[0].match(/#(\d+)/)?.[1];
    let timestamp = null, commit = null, issue = null, status = null;
    const changes = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('**Time:**')) timestamp = line.replace(/^\*\*Time:\*\*\s*/, '').trim();
      else if (line.startsWith('**Commit:**')) commit = line.replace(/^\*\*Commit:\*\*\s*/, '').trim();
      else if (line.startsWith('**Issue:**')) issue = line.replace(/^\*\*Issue:\*\*\s*/, '').trim();
      else if (line.startsWith('**Status:**')) status = line.replace(/^\*\*Status:\*\*\s*/, '').trim();
      else if (line.match(/^\s*[-*]\s+/)) changes.push(line.replace(/^\s*[-*]\s+/, '').trim());
    }
    builds.push({ build: buildNum, timestamp, commit, issue, status, changes });
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

// ── Price endpoint ───────────────────────────────────────────────────────────
// Fetches live $NULP price from Uniswap V2 pool on Base
const { ethers } = require('ethers');
const UNISWAP_V2_PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)'
];

app.get('/api/price', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    const pairAddress = '0xDb32c33fC9E2B6a068844CA59dd7Bc78E5c87e1f';
    const pairContract = new ethers.Contract(pairAddress, UNISWAP_V2_PAIR_ABI, provider);
    
    const [reserve0, reserve1] = await pairContract.getReserves();
    const token0 = await pairContract.token0();
    const token1 = await pairContract.token1();
    
    if (!reserve0 || !reserve1 || reserve0 === 0n || reserve1 === 0n) {
      return res.status(404).json({ error: 'getReserves returned empty — pool may not exist at this address' });
    }
    
    const NULP_ADDRESS = '0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F';
    const isToken0NULP = token0.toLowerCase() === NULP_ADDRESS.toLowerCase();
    
    const nulpReserve = isToken0NULP ? reserve0 : reserve1;
    const wethReserve = isToken0NULP ? reserve1 : reserve0;
    
    const priceInWETH = Number(wethReserve) / Number(nulpReserve);
    const priceInUSD = priceInWETH * 2650;
    
    const marketCap = priceInUSD * 1_000_000_000;
    
    res.json({
      price_usd: priceInUSD.toFixed(8),
      price_weth: priceInWETH.toFixed(12),
      market_cap: Math.round(marketCap),
      reserves: {
        nulp: nulpReserve.toString(),
        weth: wethReserve.toString()
      },
      pool: pairAddress,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Price fetch failed', details: error.message });
  }
});

// ── Thoughts endpoint ────────────────────────────────────────────────────────
// Proxies to memory/thoughts.json in GitHub
app.get('/api/thoughts', (req, res) => {
  const url = `${GITHUB_RAW_BASE}/memory/thoughts.json`;
  https.get(url, (ghRes) => {
    let data = '';
    ghRes.on('data', chunk => data += chunk);
    ghRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        res.json({ ...parsed, fetched_at: new Date().toISOString() });
      } catch (e) {
        res.status(500).json({ error: 'Failed to parse thoughts.json', details: e.message });
      }
    });
  }).on('error', (err) => {
    res.status(500).json({ error: 'GitHub fetch failed', details: err.message });
  });
});

app.listen(PORT, () => {
  console.log(`nullpriest server running on port ${PORT}`);
});
