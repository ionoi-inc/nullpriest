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

// ████ Static site ████████████████████████████████████████████████████████████
app.use(express.static(path.join(__dirname, 'site')));

// ████ Health check ████████████████████████████████████████████████████████████
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), agent: 'nullpriest', version: '2.2' });
});

// ████ Agent status endpoint ████████████████████████████████████████████████████
app.get('/api/status', (req, res) => {
  res.json({
    agent: 'nullpriest',
    timestamp: new Date().toISOString(),
    cycle: {
      scout:        { schedule: '*/30 * * * *',  description: 'Scrapes SURVIVE, CLAWS, DARMON. Writes memory/scout-latest.md' },
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

// ████ Activity feed endpoint ████████████████████████████████████████████████████
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

// ████ Activity feed JSON endpoint (Issue #48) ████████████████████████████████
// Serves GET /memory/activity-feed.json — reads local memory/activity-feed.json or parses .md
app.get('/memory/activity-feed.json', (req, res) => {
  try {
    // Try JSON file first
    const jsonPath = path.join(__dirname, 'memory', 'activity-feed.json');
    if (fs.existsSync(jsonPath)) {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      return res.json(data);
    }
    // Fall back to parsing .md
    const mdPath = path.join(__dirname, 'memory', 'activity-feed.md');
    if (fs.existsSync(mdPath)) {
      const md = fs.readFileSync(mdPath, 'utf8');
      const entries = parseActivityFeed(md);
      return res.json({ entries, source: 'parsed_from_md', generated_at: new Date().toISOString() });
    }
    res.status(404).json({ error: 'activity feed not found' });
  } catch (err) {
    res.status(500).json({ error: 'failed to read activity feed', details: err.message });
  }
});

// ████ /api/agents endpoint (Issue #75) ████████████████████████████████████████
// Wires real agent registry to /app/agents page. Reads from memory/agents.json
// if present, falls back to canonical hardcoded registry.
// Cache TTL: 60s. Returns array of agent objects.

let agentsCache = null;
let agentsCacheAt = 0;
const AGENTS_CACHE_TTL_MS = 60_000;

function deriveAgentsFromStatus() {
  return [
    { id: 'scout', name: 'Scout', role: 'Intelligence', status: 'active', schedule: '*/30 * * * *', description: 'Scrapes survive.money, claws.tech, darmon.co. Writes memory/scout-latest.md.', builds: 0, verified: true },
    { id: 'strategist', name: 'Strategist', role: 'Planning', status: 'active', schedule: '15 * * * *', description: 'Reads scout report. Writes strategy.md priority queue. Opens GitHub issues.', builds: 0, verified: true },
    { id: 'builder-a', name: 'Builder A', role: 'Engineering', status: 'active', schedule: '0 * * * *', description: 'Picks issues #1 and #6 from priority queue. Writes code. Commits to repo.', builds: 39, verified: true },
    { id: 'builder-b', name: 'Builder B', role: 'Engineering', status: 'active', schedule: '0 * * * *', description: 'Picks issues #2 and #7. Writes code. Commits to repo. Parallel with Builder A.', builds: 0, verified: true },
    { id: 'builder-d', name: 'Builder D', role: 'Engineering', status: 'active', schedule: '0 * * * *', description: 'Picks issues #4 and #9. Writes code. Commits to repo. Parallel with Builders A/B.', builds: 0, verified: true },
    { id: 'publisher', name: 'Publisher', role: 'Distribution', status: 'active', schedule: '0 */3 * * *', description: 'Reads build log. Posts to @nullPriest_. Updates activity feed.', builds: 0, verified: true },
    { id: 'site-watcher', name: 'Site Watcher', role: 'Quality', status: 'active', schedule: '0 */6 * * *', description: 'Audits nullpriest.xyz for staleness. Triggers self-improvement loop.', builds: 0, verified: true },
    { id: 'sales-engine', name: 'Sales Engine', role: 'Revenue', status: 'active', schedule: '0 */2 * * *', description: 'Searches X for HVAC leads. Sends outreach. Tracks pipeline.', builds: 0, verified: true }
  ];
}

app.get('/api/agents', (req, res) => {
  const now = Date.now();
  if (agentsCache && (now - agentsCacheAt < AGENTS_CACHE_TTL_MS)) {
    return res.json(agentsCache);
  }
  try {
    const agentsPath = path.join(__dirname, 'memory', 'agents.json');
    if (fs.existsSync(agentsPath)) {
      const data = JSON.parse(fs.readFileSync(agentsPath, 'utf8'));
      agentsCache = { agents: data, cached_at: new Date().toISOString(), source: 'registry' };
      agentsCacheAt = now;
      return res.json(agentsCache);
    }
  } catch (_) { /* fall through */ }
  const agents = deriveAgentsFromStatus();
  agentsCache = { agents, cached_at: new Date().toISOString(), source: 'derived', count: agents.length };
  agentsCacheAt = now;
  res.json(agentsCache);
});

app.get('/api/agents/:id', (req, res) => {
  let agents;
  try {
    const agentsPath = path.join(__dirname, 'memory', 'agents.json');
    agents = fs.existsSync(agentsPath)
      ? JSON.parse(fs.readFileSync(agentsPath, 'utf8'))
      : deriveAgentsFromStatus();
  } catch (_) { agents = deriveAgentsFromStatus(); }
  const agent = agents.find(a => a.id === req.params.id);
  if (!agent) return res.status(404).json({ error: 'agent not found', id: req.params.id });
  res.json({ agent, fetched_at: new Date().toISOString() });
});

// ████ Memory proxy ████████████████████████████████████████████████████████████
// Proxies /memory/* requests to GitHub raw content (falls back to local disk)
app.get('/memory/:filename', (req, res) => {
  const filename = req.params.filename;
  const localPath = path.join(__dirname, 'memory', filename);
  
  // Try local first
  if (fs.existsSync(localPath)) {
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.md') {
      res.type('text/markdown');
    } else if (ext === '.json') {
      res.type('application/json');
    }
    return res.sendFile(localPath);
  }
  
  // Fall back to GitHub
  const url = `${GITHUB_RAW_BASE}/memory/${filename}`;
  https.get(url, (ghRes) => {
    if (ghRes.statusCode === 200) {
      const ext = path.extname(filename).toLowerCase();
      if (ext === '.md') {
        res.type('text/markdown');
      } else if (ext === '.json') {
        res.type('application/json');
      }
      ghRes.pipe(res);
    } else {
      res.status(404).json({ error: 'file not found', filename, searched: ['local', 'github'] });
    }
  }).on('error', (err) => {
    res.status(500).json({ error: 'proxy failed', details: err.message });
  });
});

// ████ Catch-all (SPA routing) ████████████████████████████████████████████████
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

// ████ Start server ████████████████████████████████████████████████████████████
app.listen(PORT, () => {
  console.log(`✓ nullpriest live on port ${PORT}`);
  console.log(`✓ Agent status: /api/status`);
  console.log(`✓ Activity feed: /api/activity`);
  console.log(`✓ Agent registry: /api/agents`);
  console.log(`✓ Memory proxy: /memory/*`);
});
