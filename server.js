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

// ██ Static site ████████████████████████████████████████████████████████████
app.use(express.static(path.join(__dirname, 'site')));

// ██ Health check ███████████████████████████████████████████████████████████
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), agent: 'nullpriest', version: '2.2' });
});

// ██ Well-known agent discovery (Google A2A protocol) ████████████████████████
app.get('/.well-known/agent.json', (req, res) => {
  res.sendFile(path.join(__dirname, '.well-known', 'agent.json'));
});

// ██ Agent status endpoint ██████████████████████████████████████████████████
app.get('/api/status', (req, res) => {
  res.json({
    agent: 'nullpriest',
    timestamp: new Date().toISOString(),
    cycle: {
      scout:        { schedule: '*/30 * * * *',  description: 'Scrapes SURVIVE, CLAQS, DARMON. Writes memory/scout-latest.md' },
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

// ██ Activity feed endpoint █████████████████████████████████████████████████
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

// ██ Activity feed JSON endpoint (Issue #48) ████████████████████████████████
// Serves GET /memory/activity-feed.json — reads local memory/activity-feed.json or parses .md
app.get('/memory/activity-feed.json', (req, res) => {
  try {
    // Try JSON file first
    const jsonPath = path.join(__dirname, 'memory', 'activity-feed.json');
    if (fs.existsSync(jsonPath)) {
      const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      return res.json(json);
    }
    // Fall back to parsing .md
    const mdPath = path.join(__dirname, 'memory', 'activity-feed.md');
    if (!fs.existsSync(mdPath)) {
      return res.status(404).json({ error: 'activity-feed not found' });
    }
    const md = fs.readFileSync(mdPath, 'utf8');
    const entries = parseActivityFeed(md);
    res.json({ entries, source: 'parsed_markdown' });
  } catch (err) {
    res.status(500).json({ error: 'failed to load activity feed', details: err.message });
  }
});

// ██ Memory proxy endpoints █████████████████████████████████████████████████
// Proxies /memory/* requests to GitHub raw content (read-only, never cached locally)
app.get('/memory/:filename', (req, res) => {
  const filename = req.params.filename;
  const url = `${GITHUB_RAW_BASE}/memory/${filename}`;
  https.get(url, (ghRes) => {
    if (ghRes.statusCode === 404) {
      return res.status(404).json({ error: 'memory file not found', path: `/memory/${filename}` });
    }
    if (ghRes.statusCode !== 200) {
      return res.status(ghRes.statusCode).json({ error: 'GitHub fetch failed', status: ghRes.statusCode });
    }
    res.setHeader('Content-Type', filename.endsWith('.json') ? 'application/json' : 'text/plain');
    ghRes.pipe(res);
  }).on('error', (err) => {
    res.status(500).json({ error: 'proxy request failed', details: err.message });
  });
});

// ██ Agents API endpoint ████████████████████████████████████████████████████
app.get('/api/agents', (req, res) => {
  res.json({
    agents: [
      {
        id: 'scout',
        name: 'Scout',
        role: 'Market intelligence. Scrapes competitor sites, writes memory/scout-latest.md every 30 min.',
        schedule: '*/30 * * * *',
        status: 'active',
        last_run: null
      },
      {
        id: 'strategist',
        name: 'Strategist',
        role: 'Reads scout report. Opens agent-build GitHub issues. Writes memory/strategy.md hourly.',
        schedule: '0 * * * *',
        status: 'active',
        last_run: null
      },
      {
        id: 'builder-a',
        name: 'Builder A',
        role: 'Picks issue #1 from priority queue. Writes production code. Commits to repo. Closes issue.',
        schedule: '30 * * * *',
        status: 'active',
        last_run: null
      },
      {
        id: 'builder-b',
        name: 'Builder B',
        role: 'Picks issue #2 from priority queue. Writes production code. Commits to repo. Closes issue.',
        schedule: '30 * * * *',
        status: 'active',
        last_run: null
      },
      {
        id: 'builder-d',
        name: 'Builder D',
        role: 'Picks issues #4 and #9 from priority queue. Writes production code. Commits to repo.',
        schedule: '0 * * * *',
        status: 'active',
        last_run: null
      },
      {
        id: 'publisher',
        name: 'Publisher',
        role: 'Reads build log. Posts to @nullPriest_. Updates activity feed.',
        schedule: '0 */3 * * *',
        status: 'active',
        last_run: null
      }
    ],
    updated_at: new Date().toISOString()
  });
});

// ██ Build log endpoint █████████████████████████████████████████████████████
app.get('/memory/build-log.md', (req, res) => {
  const url = `${GITHUB_RAW_BASE}/memory/build-log.md`;
  https.get(url, (ghRes) => {
    if (ghRes.statusCode === 404) {
      return res.status(404).json({ error: 'build log not found' });
    }
    if (ghRes.statusCode !== 200) {
      return res.status(ghRes.statusCode).json({ error: 'GitHub fetch failed', status: ghRes.statusCode });
    }
    res.setHeader('Content-Type', 'text/plain');
    ghRes.pipe(res);
  }).on('error', (err) => {
    res.status(500).json({ error: 'proxy request failed', details: err.message });
  });
});

// ██ Start server ███████████████████████████████████████████████████████████
app.listen(PORT, () => {
  console.log(`nullpriest v2.2 running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
  console.log(`Status: http://localhost:${PORT}/api/status`);
  console.log(`Activity: http://localhost:${PORT}/api/activity`);
});