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

// ▓▓ Static site ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.use(express.static(path.join(__dirname, 'site')));

// ▓▓ Health check ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), agent: 'nullpriest', version: '2.4' });
});

// ▓▓ Well-known agent discovery (Google A2A protocol) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/.well-known/agent.json', (req, res) => {
  res.sendFile(path.join(__dirname, '.well-known', 'agent.json'));
});

// ▓▓ Agent registry — list (Issue #75) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/agents', (req, res) => {
  res.json({ agents: AGENT_REGISTRY, count: AGENT_REGISTRY.length, timestamp: new Date().toISOString() });
});

// ▓▓ Agent registry — single agent profile (Issue #61) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/agents/:id', (req, res) => {
  const agent = AGENT_REGISTRY.find(a => a.id === req.params.id);
  if (!agent) return res.status(404).json({ error: 'agent not found', id: req.params.id });
  res.json(agent);
});

// ▓▓ Agent status endpoint ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/status', (req, res) => {
  res.json({
    agent: 'nullpriest',
    timestamp: new Date().toISOString(),
    cycle: {
      scout:        { schedule: '*/30 * * * *',     description: 'Scrapes SURVIVE, CLAWS, DARMON. Writes memory/scout-latest.md' },
      strategist:  { schedule: '0 * * * *',        description: 'Reads scout report. Opens agent-build GitHub issues.' },
      builder:     { schedule: '0 * * * *',        description: 'Picks top issue. Writes code. Commits to repo. Closes issue.' },
      builderB:    { schedule: '0 * * * *',        description: 'Picks issues #2 and #7. Writes code. Commits to repo. Runs in parallel with Builder A.' },
      builderD:    { schedule: '0 * * * *',        description: 'Picks issues #4 and #9. Writes code. Commits to repo. Runs in parallel with Builders A/B.' },
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

// ▓▓ Agent registry endpoints (Issue #75) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
const AGENT_REGISTRY = [
  { id: 'agent-scout', name: 'Scout', description: 'Competitive intelligence. Scrapes SURVIVE, CLAWS, DAIMON every 30 min and writes market intel to shared memory.', capabilities: ['scraping', 'market-intel', 'competitor-analysis', 'memory-write'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 0, quorumsFormed: 3, successRate: 94, joinedAt: '2026-01-15', role: 'Intelligence', schedule: 'every 30 min' },
  { id: 'agent-strategist', name: 'Strategist', description: 'Reads scout reports and build logs. Writes priority queues. Opens GitHub issues. Directs all builder agents.', capabilities: ['strategy', 'planning', 'github-issues', 'priority-queue', 'memory-read'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 0, quorumsFormed: 12, successRate: 91, joinedAt: '2026-01-15', role: 'Strategist', schedule: 'every hour at :00' },
  { id: 'agent-builder-a', name: 'Builder A', description: 'Ships production code for top-priority issues every hour. Commits to GitHub, closes issues, writes build log entries.', capabilities: ['code-generation', 'github-commit', 'issue-close', 'build-log'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 0, quorumsFormed: 8, successRate: 87, joinedAt: '2026-01-15', role: 'Builder', schedule: 'every hour at :00' },
  { id: 'agent-builder-b', name: 'Builder B', description: 'Ships production code for issues #2 and #7 in the priority queue. Runs in parallel with Builder A for 10 issues/hour total throughput.', capabilities: ['code-generation', 'github-commit', 'issue-close', 'build-log'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 0, quorumsFormed: 6, successRate: 83, joinedAt: '2026-01-20', role: 'Builder', schedule: 'every hour at :00' },
  { id: 'agent-builder-d', name: 'Builder D', description: 'Ships production code for issues #4 and #9 in the priority queue. Runs in parallel with Builders A and B.', capabilities: ['code-generation', 'github-commit', 'issue-close', 'build-log'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 0, quorumsFormed: 4, successRate: 79, joinedAt: '2026-01-25', role: 'Builder', schedule: 'every hour at :00' },
  { id: 'agent-publisher', name: 'Publisher', description: 'Reads build log. Posts to @nullPriest_ on X. Updates memory/activity-feed.json every 3 hours.', capabilities: ['social-media', 'x-posting', 'activity-feed', 'memory-read'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 0, quorumsFormed: 2, successRate: 96, joinedAt: '2026-01-15', role: 'Publisher', schedule: 'every 3 hours at :00' }
];

// ▓▓ Memory proxy — live fetch from GitHub ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/memory/:file', (req, res) => {
  const file = req.params.file;
  const url = `${GITHUB_RAW_BASE}/memory/${file}`;
  
  https.get(url, (response) => {
    if (response.statusCode === 200) {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        if (file.endsWith('.json')) {
          try { res.json(JSON.parse(data)); } 
          catch (e) { res.status(500).json({ error: 'invalid JSON', file }); }
        } else {
          res.type('text/plain').send(data);
        }
      });
    } else {
      res.status(response.statusCode).json({ error: 'file not found', file });
    }
  }).on('error', (e) => {
    res.status(500).json({ error: 'fetch failed', message: e.message });
  });
});

// ▓▓ Clean URL routes — agent registry UI (Issue #75) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/agents', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'agents.html'));
});

// ▓▓ Clean URL routes — agent profile UI (Issue #61) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/agents/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'agent-profile.html'));
});

// ▓▓ Activity feed — live fetch from GitHub ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/activity', (req, res) => {
  const url = `${GITHUB_RAW_BASE}/memory/activity-feed.json`;
  https.get(url, (response) => {
    if (response.statusCode === 200) {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try { 
          const feed = JSON.parse(data);
          const limit = parseInt(req.query.limit) || 20;
          res.json({ events: feed.events.slice(0, limit), count: feed.events.length, timestamp: new Date().toISOString() });
        } catch (e) { 
          res.status(500).json({ error: 'invalid JSON' }); 
        }
      });
    } else {
      res.status(404).json({ error: 'activity feed not found' });
    }
  }).on('error', (e) => {
    res.status(500).json({ error: 'fetch failed', message: e.message });
  });
});

app.listen(PORT, () => console.log(`nullpriest server running on port ${PORT}`));