require('dotenv').config();

const express = require('express');
const path    = require('path');
const cors    = require('cors');
const https   = require('https');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3149;

// GitHub config for memory proxy
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/iono-such-things/nullpriest/master';
const GITHUB_API_BASE = 'https://api.github.com/repos/iono-such-things/nullpriest';

app.use(cors());
app.use(express.json());

// ██ Static site ██████████████████████████████████████████████████████████████████████████████████
app.use(express.static(path.join(__dirname, 'site')));

// ██ Health check ██████████████████████████████████████████████████████████████████████████████████
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), agent: 'nullpriest', version: '2.2' });
});

// ██ Agent status endpoint ██████████████████████████████████████████████████████████████████████████
app.get('/api/status', (req, res) => {
  res.json({
    agent: 'nullpriest',
    timestamp: new Date().toISOString(),
    cycle: {
      scout:       { schedule: '*/30 * * * *',  description: 'Scrapes SURVIVE, CLAQS, DARMON. Writes memory/scout-latest.md' },
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

// ██ Activity feed endpoint ██████████████████████████████████████████████████████████████████████████
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

// ██ Activity feed JSON endpoint (Issue #48) ██████████████████████████████████████████████████████
// Serves GET /memory/activity-feed.json — reads local memory/activity-feed.json or parses .md
app.get('/memory/activity-feed.json', (req, res) => {
  try {
    // Try JSON file first
    const jsonPath = path.join(__dirname, 'memory', 'activity-feed.json');
    if (fs.existsSync(jsonPath)) {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      return res.json(data);
    }
    // Fallback: parse markdown
    const mdPath = path.join(__dirname, 'memory', 'activity-feed.md');
    const md = fs.readFileSync(mdPath, 'utf8');
    const entries = parseActivityFeed(md);
    res.json({ entries, cached_at: new Date().toISOString(), source: 'local-md' });
  } catch (err) {
    res.status(500).json({ error: 'activity-feed.json unavailable', details: err.message });
  }
});

// ██ Memory proxy ██████████████████████████████████████████████████████████████████████████████████
app.get('/memory/:filename', (req, res) => {
  const url = `${GITHUB_RAW_BASE}/memory/${req.params.filename}`;
  https.get(url, (ghRes) => {
    res.setHeader('Content-Type', ghRes.headers['content-type'] || 'text/plain');
    ghRes.pipe(res);
  }).on('error', (err) => {
    res.status(500).json({ error: 'GitHub fetch failed', details: err.message });
  });
});

// ██ $NULP price endpoint ██████████████████████████████████████████████████████████████████████████
app.get('/api/price', (req, res) => {
  const url = `https://api.dexscreener.com/latest/dex/tokens/0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F`;
  https.get(url, (dexRes) => {
    let body = '';
    dexRes.on('data', (chunk) => { body += chunk; });
    dexRes.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (data.pairs && data.pairs.length > 0) {
          const pair = data.pairs[0];
          res.json({
            price: parseFloat(pair.priceUsd || 0),
            volume24h: parseFloat(pair.volume?.h24 || 0),
            liquidity: parseFloat(pair.liquidity?.usd || 0),
            priceChange24h: parseFloat(pair.priceChange?.h24 || 0),
            source: 'dexscreener'
          });
        } else {
          res.json({ price: 0, error: 'no pairs found' });
        }
      } catch (err) {
        res.status(500).json({ error: 'parse failed', details: err.message });
      }
    });
  }).on('error', (err) => {
    res.status(500).json({ error: 'dexscreener fetch failed', details: err.message });
  });
});

// ██ Catch-all: serve index.html for client-side routing ██████████████████████████████████████████
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`nullpriest server live on port ${PORT}`);
});
