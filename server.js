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

// ▊▊ Static site ▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊
app.use(express.static(path.join(__dirname, 'site')));

// ▊▊ Health check ▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), agent: 'nullpriest', version: '2.4' });
});

// ▊▊ Well-known agent discovery (Google A2A protocol) ▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊
app.get('/.well-known/agent.json', (req, res) => {
  res.sendFile(path.join(__dirname, '.well-known', 'agent.json'));
});

// ▊▊ Agent status endpoint ▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊
app.get('/api/status', (req, res) => {
  res.json({
    agent: 'nullpriest',
    timestamp: new Date().toISOString(),
    cycle: {
      scout:        { schedule: '*/30 * * * *',     description: 'Scrapes SURVIVE, CLAWS, DARMON. Writes memory/scout-latest.md' },
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

// ▊▊ Agent registry endpoints (Issue #75) ▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊
const AGENT_REGISTRY = [
  { id: 'agent-scout', name: 'Scout', description: 'Competitive intelligence. Scrapes SURVIVE, CLAWS, DAIMON every 30 min and writes market intel to shared memory.', capabilities: ['scraping', 'market-intel', 'competitor-analysis', 'memory-write'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 0, quorumsFormed: 3, successRate: 94, joinedAt: '2026-01-15', role: 'Intelligence', schedule: 'every 30 min' },
  { id: 'agent-strategist', name: 'Strategist', description: 'Reads scout reports and build logs. Writes priority queues. Opens GitHub issues. Directs all builder agents.', capabilities: ['strategy', 'planning', 'github-issues', 'priority-queue', 'memory-read'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 0, quorumsFormed: 12, successRate: 91, joinedAt: '2026-01-15', role: 'Strategist', schedule: 'every hour at :00' },
  { id: 'agent-builder-a', name: 'Builder A', description: 'Ships production code for top-priority issues every hour. Commits to GitHub, closes issues, writes build logs.', capabilities: ['code-generation', 'github-commit', 'next-js', 'react', 'node-js', 'build-log'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 1, quorumsFormed: 8, successRate: 88, joinedAt: '2026-01-20', role: 'Builder', schedule: 'every hour at :00' },
  { id: 'agent-builder-b', name: 'Builder B', description: 'Parallel builder. Picks issues #2 and #7 from priority queue each hour. Runs concurrently with Builder A.', capabilities: ['code-generation', 'github-commit', 'react', 'typescript', 'build-log'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 0, quorumsFormed: 6, successRate: 85, joinedAt: '2026-01-22', role: 'Builder', schedule: 'every hour at :00' },
  { id: 'agent-builder-d', name: 'Builder D', description: 'Parallel builder. Picks issues #4 and #9 from priority queue each hour. Runs concurrently with Builders A/B.', capabilities: ['code-generation', 'github-commit', 'vercel-deploy', 'next-js', 'build-log'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 0, quorumsFormed: 4, successRate: 82, joinedAt: '2026-01-25', role: 'Builder', schedule: 'every hour at :00' },
  { id: 'agent-publisher', name: 'Publisher', description: 'Reads build logs. Posts to @nullPriest_ on X. Updates site activity feed. Runs every 3 hours.', capabilities: ['social-media', 'x-posting', 'activity-feed', 'memory-read'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 0, quorumsFormed: 2, successRate: 78, joinedAt: '2026-01-28', role: 'Publisher', schedule: 'every 3 hours' }
];

app.get('/api/agents', (req, res) => {
  res.json({ agents: AGENT_REGISTRY, timestamp: new Date().toISOString() });
});

app.get('/api/agents/:id', (req, res) => {
  const agent = AGENT_REGISTRY.find(a => a.id === req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
});

// ▊▊ Memory proxy endpoints ▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊
app.get('/api/memory/:file', (req, res) => {
  const file = req.params.file;
  const url = `${GITHUB_RAW_BASE}/memory/${file}`;
  
  https.get(url, (ghRes) => {
    if (ghRes.statusCode === 404) {
      return res.status(404).json({ error: 'Memory file not found' });
    }
    let body = '';
    ghRes.on('data', chunk => body += chunk);
    ghRes.on('end', () => {
      res.setHeader('Content-Type', file.endsWith('.md') ? 'text/markdown' : 'application/json');
      res.send(body);
    });
  }).on('error', err => {
    res.status(500).json({ error: 'Failed to fetch memory file', details: err.message });
  });
});

app.get('/api/memory', (req, res) => {
  const url = `${GITHUB_API_BASE}/contents/memory`;
  
  https.get(url, {
    headers: { 'User-Agent': 'nullpriest-server' }
  }, (ghRes) => {
    let body = '';
    ghRes.on('data', chunk => body += chunk);
    ghRes.on('end', () => {
      const files = JSON.parse(body);
      res.json({
        files: files.map(f => ({ name: f.name, path: f.path, size: f.size, url: f.download_url })),
        timestamp: new Date().toISOString()
      });
    });
  }).on('error', err => {
    res.status(500).json({ error: 'Failed to list memory files', details: err.message });
  });
});

// ▊▊ Token price endpoint (Issue #275) ▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊
const TOKEN_ADDRESS = '0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F';
let priceCache = { price: null, priceUsd: null, volume24h: null, priceChange24h: null, cachedAt: 0 };

app.get('/api/price', (req, res) => {
  const now = Date.now();
  if (priceCache.cachedAt && (now - priceCache.cachedAt) < 60000) {
    return res.json({ ...priceCache, cached: true });
  }
  const url = `https://api.dexscreener.com/latest/dex/tokens/${TOKEN_ADDRESS}`;
  https.get(url, { headers: { 'User-Agent': 'nullpriest-server' } }, (ghRes) => {
    let body = '';
    ghRes.on('data', chunk => body += chunk);
    ghRes.on('end', () => {
      try {
        const data = JSON.parse(body);
        const pair = (data.pairs && data.pairs.find(p => p.chainId === 'base')) || (data.pairs && data.pairs[0]);
        if (!pair) {
          return res.json({ price: 0, priceUsd: '0', volume24h: 0, priceChange24h: 0, error: 'no pairs found', token: TOKEN_ADDRESS });
        }
        priceCache = {
          price: parseFloat(pair.priceNative) || 0,
          priceUsd: pair.priceUsd || '0',
          volume24h: (pair.volume && pair.volume.h24) || 0,
          priceChange24h: (pair.priceChange && pair.priceChange.h24) || 0,
          pairAddress: pair.pairAddress,
          dexId: pair.dexId,
          token: TOKEN_ADDRESS,
          cachedAt: now
        };
        res.json({ ...priceCache, cached: false });
      } catch (e) {
        res.status(500).json({ error: 'Failed to parse price data', details: e.message, token: TOKEN_ADDRESS });
      }
    });
  }).on('error', err => {
    res.status(500).json({ error: 'Failed to fetch price', details: err.message, token: TOKEN_ADDRESS });
  });
});

// ▊▊ Activity feed endpoint ▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊
app.get('/api/activity', (req, res) => {
  const url = `${GITHUB_RAW_BASE}/memory/activity-feed.json`;
  
  https.get(url, (ghRes) => {
    if (ghRes.statusCode === 404) {
      return res.json({ events: [], timestamp: new Date().toISOString() });
    }
    let body = '';
    ghRes.on('data', chunk => body += chunk);
    ghRes.on('end', () => {
      try {
        const data = JSON.parse(body);
        res.json(data);
      } catch (e) {
        res.json({ events: [], timestamp: new Date().toISOString() });
      }
    });
  }).on('error', err => {
    res.status(500).json({ error: 'Failed to fetch activity feed', details: err.message });
  });
});

// ▊▊ Start server ▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊
app.listen(PORT, () => {
  console.log(`nullpriest server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});