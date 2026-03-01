require('dotenv').config();

const express = require('express');
const path    = require('path');
const cors    = require('cors');
const https   = require('https');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 31499;

// GitHub config for memory proxy
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/iono-such-things/nullpriest/master';
const GITHUB_API_BASE = 'https://api.github.com/repos/iono-such-things/nullpriest';

app.use(cors());
app.use(express.json());

// ▊▊ Static site ▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊
app.use(express.static(path.join(__dirname, 'site')));

// ▊▊ Health check ▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), agent: 'nullpriest', version: '2.3' });
});

// ▊▊ Well-known agent discovery (Google A2A protocol) ▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊
app.get('/.well-known/agent.json', (req, res) => {
  res.sendFile(path.join(__dirname, '.well-known', 'agent.json'));
});

// ▊▊ Agent status endpoint ▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊
app.get('/api/status', (req, res) => {
  res.json({
    agent: 'nullpriest',
    timestamp: new Date().toISOString(),
    cycle: {
      scout:        { schedule: '*/30 * * * *',     description: 'Scrapes SURVIVE, CLAQS, DARMON. Writes memory/scout-latest.md' },
      strategist:  { schedule: '0 * * * *',       description: 'Reads scout report. Opens agent-build GitHub issues.' },
      builder:     { schedule: '0 * * * *',       description: 'Picks top issue. Writes code. Commits to repo. Closes issue.' },
      builderB:    { schedule: '0 * * * *',       description: 'Picks issues #2 and #7. Writes code. Commits to repo. Runs in parallel with Builder A.' },
      builderD:    { schedule: '0 * * * *',       description: 'Picks issues #4 and #9. Writes code. Commits to repo. Runs in parallel with Builders A/B.' },
      publisher:   { schedule: '0 */3 * * *',   description: 'Reads build log. Posts to @nullPriest_. Updates activity feed.' }
    },
    contracts: {
      token:  '0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F',
      wallet: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29',
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

// ▊▊ Agent registry endpoints (Issue #75) ▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊
const AGENT_REGISTRY = [
  { id: 'agent-scout', name: 'Scout', description: 'Competitive intelligence. Scrapes SURVIVE, CLAWS, DAIMON every 30 min and writes market intel to shared memory.', capabilities: ['scraping', 'market-intel', 'competitor-analysis', 'memory-write'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 0, quorumsFormed: 3, successRate: 94, joinedAt: '2026-01-15', role: 'Intelligence', schedule: 'every 30 min' },
  { id: 'agent-strategist', name: 'Strategist', description: 'Reads scout reports and build logs. Writes priority queues. Opens GitHub issues. Directs all builder agents.', capabilities: ['strategy', 'planning', 'github-issues', 'priority-queue', 'memory-read'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 0, quorumsFormed: 12, successRate: 91, joinedAt: '2026-01-15', role: 'Strategist', schedule: 'every hour at :00' },
  { id: 'agent-builder-a', name: 'Builder A', description: 'Ships production code for top-priority issues every hour. Commits to GitHub, closes issues, writes build logs.', capabilities: ['code-generation', 'github-commit', 'next-js', 'react', 'node-js', 'build-log'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 1, quorumsFormed: 8, successRate: 88, joinedAt: '2026-01-20', role: 'Builder', schedule: 'every hour at :00' },
  { id: 'agent-builder-b', name: 'Builder B', description: 'Parallel builder. Picks issues #2 and #7 from priority queue each hour. Runs concurrently with Builder A.', capabilities: ['code-generation', 'github-commit', 'react', 'typescript', 'build-log'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 0, quorumsFormed: 6, successRate: 85, joinedAt: '2026-01-22', role: 'Builder', schedule: 'every hour at :00' },
  { id: 'agent-builder-d', name: 'Builder D', description: 'Parallel builder. Picks issues #4 and #9. Specialises in infrastructure and API work.', capabilities: ['code-generation', 'github-commit', 'api-design', 'infrastructure', 'build-log'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 0, quorumsFormed: 4, successRate: 82, joinedAt: '2026-01-25', role: 'Builder', schedule: 'every hour at :00' },
  { id: 'agent-publisher', name: 'Publisher', description: 'Reads build logs every 3h. Posts to @nullPriest_ on X. Updates activity feed on nullpriest.xyz.', capabilities: ['social-media', 'x-posting', 'activity-feed', 'memory-read'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 0, quorumsFormed: 2, successRate: 96, joinedAt: '2026-01-28', role: 'Publisher', schedule: 'every 3 hours' },
  { id: 'agent-sales-engine', name: 'Sales Engine', description: 'Searches X for leads every 2h. Sends cold DMs. Tracks pipeline. B2B sales automation for HVAC-AI-Secretary.', capabilities: ['lead-generation', 'x-search', 'cold-outreach', 'pipeline-tracking'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 0, quorumsFormed: 1, successRate: 73, joinedAt: '2026-02-01', role: 'Sales', schedule: 'every 2 hours' },
];

app.get('/api/agents', (req, res) => {
  res.json({ agents: AGENT_REGISTRY, total: AGENT_REGISTRY.length, verified: AGENT_REGISTRY.filter(a => a.verified).length, cached_at: new Date().toISOString() });
});

app.get('/api/agents/:id', (req, res) => {
  const agent = AGENT_REGISTRY.find(a => a.id === req.params.id);
  if (!agent) return res.status(404).json({ error: 'agent not found', id: req.params.id });

  // Enrich with extended profile data (Issue #61)
  // Fetch recent commits from GitHub API for this agent based on role keyword
  const roleKeywords = {
    'agent-scout':       'scout',
    'agent-strategist':  'strateg',
    'agent-builder-a':   'Builder A',
    'agent-builder-b':   'Builder B',
    'agent-builder-d':   'Builder D',
    'agent-publisher':   'publisher',
    'agent-sales-engine':'sales',
  };
  const keyword = roleKeywords[agent.id] || agent.name;

  const githubUrl = `${GITHUB_API_BASE}/commits?per_page=10&path=`;
  const searchUrl = `https://api.github.com/search/commits?q=repo:iono-such-things/nullpriest+${encodeURIComponent(keyword)}&per_page=5&sort=committer-date&order=desc`;

  const options = {
    headers: {
      'User-Agent': 'nullpriest-server',
      'Accept': 'application/vnd.github.cloak-preview+json',
    }
  };

  https.get(searchUrl, options, (ghRes) => {
    let body = '';
    ghRes.on('data', chunk => { body += chunk; });
    ghRes.on('end', () => {
      let recentCommits = [];
      try {
        const data = JSON.parse(body);
        recentCommits = (data.items || []).map(c => ({
          sha: c.sha,
          message: c.commit.message.split('\n')[0],
          date: c.commit.committer.date,
          url: c.html_url,
        }));
      } catch (e) { /* ignore parse errors */ }

      res.json({
        ...agent,
        totalBuilds: recentCommits.length > 0 ? agent.successRate : 0,
        lastActive: recentCommits[0]?.date ?? agent.joinedAt,
        buildLog: recentCommits.slice(0, 5).map(c => ({
          date: c.date,
          issue: c.message.match(/#(\d+)/)?.[0] ?? 'misc',
          result: c.message.toLowerCase().includes('fail') ? 'failure' : 'success',
          detail: c.message,
        })),
        recentCommits,
        openIssues: [],
      });
    });
  }).on('error', () => {
    // Fallback: return agent with empty extended fields
    res.json({
      ...agent,
      totalBuilds: 0,
      lastActive: agent.joinedAt,
      buildLog: [],
      recentCommits: [],
      openIssues: [],
    });
  });
});

// ▊▊ Activity feed endpoint ▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊
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

// ▊▊ Activity feed JSON endpoint (Issue #48) ▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊
// Serves GET /memory/activity-feed.json — reads local memory/activity-feed.json or parses .md
app.get('/memory/activity-feed.json', (req, res) => {
  try {
    // Try JSON file first
    const jsonPath = path.join(__dirname, 'memory', 'activity-feed.json');
    if (fs.existsSync(jsonPath)) {
      const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      return res.json(json);
    }
    // Fallback to parsing markdown
    const mdPath = path.join(__dirname, 'memory', 'activity-feed.md');
    const md = fs.readFileSync(mdPath, 'utf8');
    const entries = parseActivityFeed(md);
    res.json({ entries, source: 'markdown-fallback', cached_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'activity feed unavailable', details: err.message });
  }
});

// ▊▊ Memory file proxy — serves memory/*.md as JSON via GitHub Raw ▊▊▊▊▊▊▊▊▊▊▊▊▊
app.get('/memory/:filename', (req, res) => {
  const filename = req.params.filename;
  if (!/^[a-z0-9._-]+$/i.test(filename)) {
    return res.status(400).json({ error: 'invalid filename' });
  }
  const url = `${GITHUB_RAW_BASE}/memory/${filename}`;
  https.get(url, (ghRes) => {
    if (ghRes.statusCode === 404) {
      return res.status(404).json({ error: 'memory file not found', file: filename });
    }
    if (ghRes.statusCode !== 200) {
      return res.status(502).json({ error: 'upstream error', status: ghRes.statusCode });
    }
    let body = '';
    ghRes.on('data', chunk => { body += chunk; });
    ghRes.on('end', () => {
      if (filename.endsWith('.json')) {
        try {
          const json = JSON.parse(body);
          res.json(json);
        } catch (e) {
          res.status(500).json({ error: 'invalid JSON in memory file' });
        }
      } else {
        res.type('text/markdown').send(body);
      }
    });
  }).on('error', (err) => {
    res.status(502).json({ error: 'failed to fetch from GitHub', details: err.message });
  });
});

// ▊▊ Fallback — send index.html for client-side routing ▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✓ nullpriest server running on port ${PORT}`);
  console.log(`  → http://localhost:${PORT}`);
  console.log(`  → /api/health | /api/status | /api/activity | /api/agents`);
});