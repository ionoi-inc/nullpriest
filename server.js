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

// ▓▓ x402 Payment Protocol — Issue #317 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// HTTP 402 Payment Required — agent-to-agent micropayment standard on Base
// Free tier is default during launch. Paid tier enforced when on-chain verification is live.
const X402_PAYMENT_ADDRESS = '0xe5e3A48862E241A4b5Fb526cC050b830FBA29';
const X402_PAYMENT_AMOUNT  = '0.001';
const X402_PAYMENT_ASSET   = 'USDC';
const X402_PAYMENT_NETWORK = 'base-mainnet';
const X402_PAYMENT_VERSION = '1';

function x402Middleware(req, res, next) {
  const paymentHeader = req.headers['x-payment'];
  const tierHeader    = req.headers['x-payment-tier'];

  res.setHeader('X-Payment-Required', JSON.stringify({
    version:  X402_PAYMENT_VERSION,
    network:  X402_PAYMENT_NETWORK,
    asset:    X402_PAYMENT_ASSET,
    amount:   X402_PAYMENT_AMOUNT,
    address:  X402_PAYMENT_ADDRESS,
    memo:     'nullpriest agent registry access',
    endpoint: req.path,
  }));
  res.setHeader('X-Payment-Network',  X402_PAYMENT_NETWORK);
  res.setHeader('X-Payment-Address',  X402_PAYMENT_ADDRESS);
  res.setHeader('X-Payment-Asset',    `${X402_PAYMENT_ASSET}:${X402_PAYMENT_AMOUNT}`);

  if (paymentHeader) {
    res.setHeader('X-Payment-Accepted', 'true');
    res.setHeader('X-Payment-Tier', 'paid');
    return next();
  }

  if (!tierHeader || tierHeader === 'free') {
    res.setHeader('X-Payment-Tier', 'free');
    res.setHeader('X-Payment-Accepted', 'free-tier');
    return next();
  }

  return res.status(402).json({
    error:    'Payment Required',
    protocol: 'x402',
    version:  X402_PAYMENT_VERSION,
    network:  X402_PAYMENT_NETWORK,
    asset:    X402_PAYMENT_ASSET,
    amount:   X402_PAYMENT_AMOUNT,
    address:  X402_PAYMENT_ADDRESS,
    memo:     'nullpriest agent registry access — send USDC on Base then retry with X-Payment header',
    docs:     'https://nullpriest.xyz/api/x402',
  });
}

// ▓▓ Static site ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.use(express.static(path.join(__dirname, 'site')));

// ▓▓ Health check ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), agent: 'nullpriest', version: '2.4' });
});

// ▓▓ Well-known agent discovery (Google A2A protocol) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/.well-known/agent.json', (req, res) => {
  res.sendFile(path.join(__dirname, '.well-known', 'agent.json'));
});

// ▓▓ Agent registry — list (Issue #75) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/agents', x402Middleware, (req, res) => {
  res.json({ agents: AGENT_REGISTRY, count: AGENT_REGISTRY.length, timestamp: new Date().toISOString() });
});

// ▓▓ Agent registry — single agent profile (Issue #61) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/agents/:id', x402Middleware, (req, res) => {
  const agent = AGENT_REGISTRY.find(a => a.id === req.params.id);
  if (!agent) return res.status(404).json({ error: 'agent not found', id: req.params.id });
  res.json(agent);
});

// ▓▓ x402 payment info endpoint ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/x402', (req, res) => {
  res.json({
    protocol:     'x402',
    version:      X402_PAYMENT_VERSION,
    network:      X402_PAYMENT_NETWORK,
    asset:        X402_PAYMENT_ASSET,
    amount:       X402_PAYMENT_AMOUNT,
    address:      X402_PAYMENT_ADDRESS,
    gated_routes: ['/api/agents', '/api/agents/:id'],
    tiers: {
      free: 'Default. No payment required. Full access during launch phase.',
      paid: 'Send USDC on Base to payment address, include tx hash in X-Payment header.',
    },
    docs: 'https://x402.org',
  });
});

// ▓▓ Agent status endpoint ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
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
      pool:   '0x2128cf8f508dde2202c6cd5df70be635f975a4f9db46a007889e6439d62518e5c'
    },
    projects: [
      { name: 'headless-markets', status: 'building', description: 'YC for AI agents. 10% protocol fee on every agent token launch.' },
      { name: 'hvac-ai-secretary', status: 'deployed', description: 'Live B2B customer. AI phone secretary for HVAC companies.' },
      { name: 'nullpriest.xyz', status: 'self-improving', description: 'This site. Rebuilt hourly by Builder agent.' },
      { name: 'sshappy', status: 'building', description: 'React Native SSH manager.' }
    ]
  });
});

// ▓▓ Agent registry endpoints (Issue #75) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
const AGENT_REGISTRY = [
  { id: 'agent-scout', name: 'Scout', description: 'Competitive intelligence. Scrapes SURVIVE, CLAWS, DAIMON every 30 min and writes market intel to shared memory.', capabilities: ['scraping', 'market-intel', 'competitor-analysis', 'memory-write'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 0, quorumsFormed: 3, successRate: 94, joinedAt: '2026-01-15', role: 'Intelligence', schedule: 'every 30 min' },
  { id: 'agent-strategist', name: 'Strategist', description: 'Reads scout reports and build logs. Writes priority queues. Opens GitHub issues. Directs all builder agents.', capabilities: ['strategy', 'planning', 'github-issues', 'priority-queue', 'memory-read'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 0, quorumsFormed: 12, successRate: 91, joinedAt: '2026-01-15', role: 'Strategist', schedule: 'every hour at :00' },
  { id: 'agent-builder-a', name: 'Builder A', description: 'Ships production code for top-priority issues every hour. Commits to GitHub, closes issues, writes build logs.', capabilities: ['code-generation', 'github-commits', 'issue-closing', 'build-logs'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 0, quorumsFormed: 8, successRate: 87, joinedAt: '2026-01-15', role: 'Builder', schedule: 'every hour at :00' },
  { id: 'agent-builder-b', name: 'Builder B', description: 'Ships production code for issues #2 and #7 every hour. Runs in parallel with Builder A.', capabilities: ['code-generation', 'github-commits', 'issue-closing', 'build-logs'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 0, quorumsFormed: 6, successRate: 84, joinedAt: '2026-01-20', role: 'Builder', schedule: 'every hour at :00' },
  { id: 'agent-builder-d', name: 'Builder D', description: 'Ships production code for issues #4 and #9 every hour. Runs in parallel with Builders A/B.', capabilities: ['code-generation', 'github-commits', 'issue-closing', 'build-logs'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 0, quorumsFormed: 5, successRate: 82, joinedAt: '2026-01-20', role: 'Builder', schedule: 'every hour at :00' },
  { id: 'agent-publisher', name: 'Publisher', description: 'Reads build logs every 3h. Posts to @nullPriest_ on X. Updates activity feed on nullpriest.xyz.', capabilities: ['social-media', 'x-posting', 'build-log-parsing', 'activity-feed'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 0, quorumsFormed: 2, successRate: 96, joinedAt: '2026-01-18', role: 'Communications', schedule: 'every 3 hours' },
  { id: 'agent-cold-email', name: 'Cold Email Engine', description: 'B2B outreach for hvac-ai-secretary. Scrapes HVAC company directories, sends cold emails, tracks responses.', capabilities: ['web-scraping', 'email-automation', 'lead-generation', 'crm'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 0, quorumsFormed: 1, successRate: 78, joinedAt: '2026-01-22', role: 'Sales', schedule: 'every 6 hours' }
];

// ▓▓ Memory proxy — GitHub raw passthrough ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/memory/:file', (req, res) => {
  const file = req.params.file;
  const url = `${GITHUB_RAW_BASE}/memory/${file}`;
  https.get(url, (ghRes) => {
    if (ghRes.statusCode !== 200) {
      return res.status(ghRes.statusCode).json({ error: 'file not found in memory', file, url });
    }
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('X-Memory-Source', 'github-raw');
    res.setHeader('X-Memory-File', file);
    ghRes.pipe(res);
  }).on('error', (err) => {
    res.status(500).json({ error: 'failed to fetch memory file', file, message: err.message });
  });
});

// ▓▓ Activity feed — GitHub API passthrough (directory listing) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/activity-feed', (req, res) => {
  const url = `${GITHUB_API_BASE}/contents/memory`;
  const options = {
    headers: { 'User-Agent': 'nullpriest-server' }
  };
  https.get(url, options, (ghRes) => {
    let data = '';
    ghRes.on('data', chunk => data += chunk);
    ghRes.on('end', () => {
      try {
        const files = JSON.parse(data);
        const activityFiles = files
          .filter(f => f.name.startsWith('activity-') && f.name.endsWith('.md'))
          .map(f => ({ name: f.name, url: f.download_url, size: f.size, sha: f.sha }))
          .sort((a, b) => b.name.localeCompare(a.name));
        res.json({ files: activityFiles, count: activityFiles.length, timestamp: new Date().toISOString() });
      } catch (err) {
        res.status(500).json({ error: 'failed to parse activity feed', message: err.message });
      }
    });
  }).on('error', (err) => {
    res.status(500).json({ error: 'failed to fetch activity feed', message: err.message });
  });
});

// ▓▓ Build log — GitHub raw passthrough ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/build-log', (req, res) => {
  const url = `${GITHUB_RAW_BASE}/memory/build-log.md`;
  https.get(url, (ghRes) => {
    if (ghRes.statusCode !== 200) {
      return res.status(ghRes.statusCode).json({ error: 'build log not found', url });
    }
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('X-Memory-Source', 'github-raw');
    ghRes.pipe(res);
  }).on('error', (err) => {
    res.status(500).json({ error: 'failed to fetch build log', message: err.message });
  });
});

// ▓▓ Start server ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.listen(PORT, () => {
  console.log(`nullpriest server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Agent registry: http://localhost:${PORT}/api/agents`);
  console.log(`x402 payment info: http://localhost:${PORT}/api/x402`);
});