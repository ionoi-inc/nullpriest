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

// ━━ Static site ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use(express.static(path.join(__dirname, 'site')));

// ━━ Health check ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), agent: 'nullpriest', version: '2.1' });
});

// ━━ Agent status endpoint ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

// ━━ Memory proxy ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/memory/:filename', (req, res) => {
  const url = `${GITHUB_RAW_BASE}/memory/${req.params.filename}`;
  https.get(url, (ghRes) => {
    res.setHeader('Content-Type', ghRes.headers['content-type'] || 'text/plain');
    ghRes.pipe(res);
  }).on('error', (err) => {
    res.status(500).json({ error: 'GitHub fetch failed', details: err.message });
  });
});

// ━━ Activity feed endpoint ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

// ━━ Build log endpoint ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
    const numberMatch = header.match(/^(\d+)/);
    const buildNumber = numberMatch ? parseInt(numberMatch[1], 10) : null;
    let date = null, status = null, commit = null, issue = null;
    const bullets = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('**Date:**')) date = line.replace(/^\*\*Date:\*\*\s*/, '');
      else if (line.startsWith('**Status:**')) status = line.replace(/^\*\*Status:\*\*\s*/, '');
      else if (line.startsWith('**Commit:**')) commit = line.replace(/^\*\*Commit:\*\*\s*/, '');
      else if (line.startsWith('**Issue:**')) issue = line.replace(/^\*\*Issue:\*\*\s*/, '');
      else {
        const m = line.match(/^[-*]\s+(.+)/);
        if (m) bullets.push(m[1]);
      }
    }
    builds.push({ buildNumber, date, status, commit, issue, bullets });
  }
  return builds;
}

app.get('/api/builds', (req, res) => {
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

// ━━ Agent thoughts endpoint ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/thoughts', (req, res) => {
  const url = `${GITHUB_API_BASE}/issues/comments`;
  https.get(url, { headers: { 'User-Agent': 'nullpriest' } }, (ghRes) => {
    let data = '';
    ghRes.on('data', chunk => data += chunk);
    ghRes.on('end', () => {
      try {
        const comments = JSON.parse(data);
        const thoughts = comments
          .filter(c => c.body && c.body.includes('agent-thought'))
          .slice(0, 10)
          .map(c => ({
            agent: c.user?.login || 'unknown',
            timestamp: c.created_at,
            text: c.body.replace(/agent-thought:\s*/i, '').trim()
          }));
        res.json({ thoughts });
      } catch (err) {
        res.status(500).json({ error: 'parse failed', details: err.message });
      }
    });
  }).on('error', (err) => {
    res.status(500).json({ error: 'GitHub fetch failed', details: err.message });
  });
});

// ━━ $NULP price endpoint ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/tokens/0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F';
let priceCache = null;
let priceCacheAt = 0;
const PRICE_CACHE_TTL_MS = 120_000; // 2 minutes

app.get('/api/price', (req, res) => {
  const now = Date.now();
  if (priceCache && (now - priceCacheAt < PRICE_CACHE_TTL_MS)) {
    return res.json(priceCache);
  }
  https.get(DEXSCREENER_API, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      try {
        const json = JSON.parse(data);
        const pair = json.pairs?.[0];
        if (!pair) {
          return res.status(404).json({ error: 'no pair data found' });
        }
        priceCache = {
          price: parseFloat(pair.priceUsd) || 0,
          liquidity: parseFloat(pair.liquidity?.usd) || 0,
          volume24h: parseFloat(pair.volume?.h24) || 0,
          priceChange24h: parseFloat(pair.priceChange?.h24) || 0,
          cached_at: new Date().toISOString()
        };
        priceCacheAt = now;
        res.json(priceCache);
      } catch (err) {
        res.status(500).json({ error: 'parse failed', details: err.message });
      }
    });
  }).on('error', (err) => {
    res.status(500).json({ error: 'DexScreener fetch failed', details: err.message });
  });
});

// ━━ 404 fallback ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use((req, res) => {
  res.status(404).json({ error: 'not found', path: req.path });
});

// ━━ Start server ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.listen(PORT, () => {
  console.log(`nullpriest server running on port ${PORT}`);
});
