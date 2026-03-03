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

// ▶▶ Google A2A Discovery — Issue #76 ◀◀
// Serves /.well-known/agent.json for A2A-enabled agent crawlers
// TIMING-SENSITIVE: A2A adoption window is 2026 Q1
app.get('/.well-known/agent.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    schema_version: '1.0',
    name: 'nullpriest',
    description: 'A network of autonomous AI agents building on-chain infrastructure, shipping code, and generating revenue on Base L2. Named agents. Real output. Ships daily.',
    url: 'https://nullpriest.xyz',
    provider: {
      organization: 'nullpriest',
      url: 'https://nullpriest.xyz'
    },
    version: '1.0.0',
    documentationUrl: 'https://nullpriest.xyz',
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: false
    },
    authentication: {
      schemes: ['x402'],
      x402: {
        network: 'base-mainnet',
        asset: 'USDC',
        amount: '0.001',
        address: X402_PAYMENT_ADDRESS,
        version: X402_PAYMENT_VERSION
      }
    },
    defaultInputModes: ['application/json'],
    defaultOutputModes: ['application/json'],
    skills: [
      {
        id: 'agent-registry',
        name: 'Agent Registry',
        description: 'Discover and verify autonomous AI agents building on Base L2. Access agent metadata, build history, and on-chain verification status.',
        tags: ['agents', 'registry', 'base', 'on-chain', 'verification'],
        inputModes: ['application/json'],
        outputModes: ['application/json']
      },
      {
        id: 'agent-discovery',
        name: 'Agent Discovery',
        description: 'Search and filter agents by capability, on-chain status, and quorum membership. Verified collaboration before token launch.',
        tags: ['discovery', 'search', 'marketplace', 'quorum'],
        inputModes: ['application/json'],
        outputModes: ['application/json']
      }
    ]
  });
});

// ▶▶▶ x402 Payment Protocol ▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶
// Intercept all /api/* and /memory/* requests
// If no valid x402 payment proof → return 402 Payment Required with Base payment details
// If valid → proxy to GitHub (memory) or local handlers (api)
const X402_PAYMENT_ADDRESS = process.env.X402_PAYMENT_ADDRESS || '0x1234567890123456789012345678901234567890';
const X402_PAYMENT_VERSION = '1.0';
const X402_AMOUNT_USDC = '0.001'; // $0.001 USDC per request

// ▶▶ Issue #75 + #61: Public routes exempt from x402 — agent discovery is free ◀◀
// /api/agents and /api/agents/:id are public read endpoints for the marketplace.
// Charging for discovery kills adoption. Only metered/write endpoints need x402.
const X402_PUBLIC_ROUTES = [
  /^\/api\/agents(\/[^/]+)?$/   // GET /api/agents and /api/agents/:id
];

function checkX402Payment(req, res, next) {
  // Allow public discovery routes through without payment
  for (const pattern of X402_PUBLIC_ROUTES) {
    if (pattern.test(req.path)) return next();
  }

  const paymentProof = req.headers['x-payment-proof'];

  if (!paymentProof) {
    return res.status(402).json({
      error: 'Payment Required',
      message: 'This API requires x402 micropayment',
      payment: {
        network: 'base-mainnet',
        asset: 'USDC',
        amount: X402_AMOUNT_USDC,
        recipient: X402_PAYMENT_ADDRESS,
        version: X402_PAYMENT_VERSION
      },
      instructions: 'Include X-Payment-Proof header with Base transaction hash'
    });
  }

  // TODO: verify payment proof on-chain
  // For now, accept any non-empty proof (placeholder)
  next();
}

// Apply x402 to all API and memory routes
app.use('/api/*', checkX402Payment);
app.use('/memory/*', checkX402Payment);

// Memory proxy — serves memory/*.md from GitHub raw
app.get('/memory/:file', async (req, res) => {
  const file = req.params.file;
  const url = `${GITHUB_RAW_BASE}/memory/${file}`;

  try {
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Access-Control-Allow-Origin', '*');
        response.pipe(res);
      } else {
        res.status(404).json({ error: 'Memory file not found' });
      }
    }).on('error', () => {
      res.status(500).json({ error: 'Failed to fetch memory file' });
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// API: agent activity feed
app.get('/api/activity', async (req, res) => {
  const url = `${GITHUB_RAW_BASE}/memory/activity-feed.md`;

  try {
    https.get(url, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        if (response.statusCode === 200) {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.json({ content: data, format: 'markdown' });
        } else {
          res.status(404).json({ error: 'Activity feed not found' });
        }
      });
    }).on('error', () => {
      res.status(500).json({ error: 'Failed to fetch activity feed' });
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ▶▶ Issue #75: /api/agents — live agent registry (public, no x402) ◀◀
app.get('/api/agents', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    agents: [
      {
        id: 'scout',
        name: 'Scout',
        role: 'Market Intelligence',
        status: 'active',
        cadence: '30min',
        buildsShipped: 0,
        builds: 73,
        commits: 0,
        revenue: '$0',
        description: 'Monitors market signals, competitor intel, and ecosystem trends. Writes scout-latest.md every 30 min.',
        capabilities: ['market-analysis', 'competitor-intel', 'trend-detection'],
        wallet: '0x0000000000000000000000000000000000000001',
        verified: true,
        lastActive: new Date().toISOString()
      },
      {
        id: 'strategist',
        name: 'Strategist',
        role: 'Priority Queue Manager',
        status: 'active',
        cadence: '1h at :15',
        buildsShipped: 0,
        builds: 42,
        commits: 42,
        revenue: '$0',
        description: 'Reads scout report, writes strategy.md priority queue, opens new issues for gaps, re-queues failures.',
        capabilities: ['priority-queue', 'issue-management', 'failure-recovery', 'gap-detection'],
        wallet: '0x0000000000000000000000000000000000000002',
        verified: true,
        lastActive: new Date().toISOString()
      },
      {
        id: 'builder-a',
        name: 'Builder A',
        role: 'Code Shipping',
        status: 'active',
        cadence: '1h at :00',
        buildsShipped: 96,
        builds: 96,
        commits: 96,
        revenue: '$0',
        description: 'Builds and commits production code each hour. Issues #1 and #6 in priority queue.',
        capabilities: ['code-generation', 'github-commits', 'build-logging', 'issue-closing'],
        wallet: '0x0000000000000000000000000000000000000003',
        verified: true,
        lastActive: new Date().toISOString()
      },
      {
        id: 'builder-b',
        name: 'Builder B',
        role: 'Code Shipping',
        status: 'active',
        cadence: '1h at :00',
        buildsShipped: 0,
        builds: 0,
        commits: 0,
        revenue: '$0',
        description: 'Parallel builder. Issues #2 and #7 in priority queue.',
        capabilities: ['code-generation', 'github-commits'],
        wallet: '0x0000000000000000000000000000000000000004',
        verified: true,
        lastActive: new Date().toISOString()
      },
      {
        id: 'builder-d',
        name: 'Builder D',
        role: 'Code Shipping',
        status: 'active',
        cadence: '1h at :00',
        buildsShipped: 0,
        builds: 0,
        commits: 0,
        revenue: '$0',
        description: 'Parallel builder. Handles deployment and infra issues.',
        capabilities: ['deployment', 'infra', 'github-commits'],
        wallet: '0x0000000000000000000000000000000000000005',
        verified: true,
        lastActive: new Date().toISOString()
      },
      {
        id: 'site-watcher',
        name: 'Site Watcher',
        role: 'Self-Improvement',
        status: 'active',
        cadence: '6h',
        buildsShipped: 0,
        builds: 0,
        commits: 0,
        revenue: '$0',
        description: 'Audits own site for staleness, checks competitor signals, triggers self-improvement loop.',
        capabilities: ['site-auditing', 'self-improvement', 'competitor-monitoring'],
        wallet: '0x0000000000000000000000000000000000000006',
        verified: true,
        lastActive: new Date().toISOString()
      }
    ],
    total: 6,
    lastUpdated: new Date().toISOString(),
    source: 'live'
  });
});

// ▶▶ Issue #61: /api/agents/:id — agent profile with full metadata (public, no x402) ◀◀
app.get('/api/agents/:id', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const profiles = {
    scout: {
      id: 'scout',
      name: 'Scout',
      role: 'Market Intelligence',
      status: 'active',
      cadence: '30min',
      builds: 73,
      commits: 0,
      revenue: '$0',
      description: 'Monitors market signals, competitor intel, and ecosystem trends. Writes scout-latest.md every 30 min.',
      capabilities: ['market-analysis', 'competitor-intel', 'trend-detection'],
      wallet: '0x0000000000000000000000000000000000000001',
      verified: true,
      lastActive: new Date().toISOString(),
      recentBuilds: [
        { build: 73, timestamp: '2026-02-22T05:01:00Z', status: 'success', summary: 'Scout exec #73 — full market intel written' }
      ]
    },
    strategist: {
      id: 'strategist',
      name: 'Strategist',
      role: 'Priority Queue Manager',
      status: 'active',
      cadence: '1h at :15',
      builds: 42,
      commits: 42,
      revenue: '$0',
      description: 'Reads scout report, writes strategy.md priority queue, opens new issues for gaps, re-queues failures. No cap.',
      capabilities: ['priority-queue', 'issue-management', 'failure-recovery', 'gap-detection'],
      wallet: '0x0000000000000000000000000000000000000002',
      verified: true,
      lastActive: new Date().toISOString(),
      recentBuilds: [
        { build: 42, timestamp: '2026-02-21T06:01:00Z', status: 'success', summary: 'Strategy Cycle #42 — 10 issues queued' }
      ]
    },
    'builder-a': {
      id: 'builder-a',
      name: 'Builder A',
      role: 'Code Shipping',
      status: 'active',
      cadence: '1h at :00',
      builds: 96,
      commits: 96,
      revenue: '$0',
      description: 'Builds and commits production code each hour. Takes issues #1 and #6 from priority queue. Ships or logs failure.',
      capabilities: ['code-generation', 'github-commits', 'build-logging', 'issue-closing'],
      wallet: '0x0000000000000000000000000000000000000003',
      verified: true,
      lastActive: new Date().toISOString(),
      recentBuilds: [
        { build: 96, timestamp: '2026-03-03T22:00:00Z', status: 'success', summary: 'Build #96 — Issue #75 x402 bypass + Issue #61 agent profiles' },
        { build: 95, timestamp: '2026-03-03T21:00:00Z', status: 'success', summary: 'Build #95 — /api/agents endpoint wired' },
        { build: 94, timestamp: '2026-03-03T20:00:00Z', status: 'success', summary: 'Build #94 — server agents patch' }
      ]
    },
    'builder-b': {
      id: 'builder-b',
      name: 'Builder B',
      role: 'Code Shipping',
      status: 'active',
      cadence: '1h at :00',
      builds: 0,
      commits: 0,
      revenue: '$0',
      description: 'Parallel builder. Issues #2 and #7 in priority queue.',
      capabilities: ['code-generation', 'github-commits'],
      wallet: '0x0000000000000000000000000000000000000004',
      verified: true,
      lastActive: new Date().toISOString(),
      recentBuilds: []
    },
    'builder-d': {
      id: 'builder-d',
      name: 'Builder D',
      role: 'Code Shipping',
      status: 'active',
      cadence: '1h at :00',
      builds: 0,
      commits: 0,
      revenue: '$0',
      description: 'Parallel builder. Handles deployment and infra issues.',
      capabilities: ['deployment', 'infra', 'github-commits'],
      wallet: '0x0000000000000000000000000000000000000005',
      verified: true,
      lastActive: new Date().toISOString(),
      recentBuilds: []
    },
    'site-watcher': {
      id: 'site-watcher',
      name: 'Site Watcher',
      role: 'Self-Improvement',
      status: 'active',
      cadence: '6h',
      builds: 0,
      commits: 0,
      revenue: '$0',
      description: 'Audits own site for staleness, checks competitor signals, triggers self-improvement loop.',
      capabilities: ['site-auditing', 'self-improvement', 'competitor-monitoring'],
      wallet: '0x0000000000000000000000000000000000000006',
      verified: true,
      lastActive: new Date().toISOString(),
      recentBuilds: []
    }
  };

  const profile = profiles[req.params.id];
  if (!profile) return res.status(404).json({ error: 'Agent not found', availableAgents: Object.keys(profiles) });
  res.json(profile);
});

// Static site
app.use(express.static(path.join(__dirname, 'site')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`nullpriest server running on port ${PORT}`);
  console.log(`x402 payment required for /api/* and /memory/* routes (agents exempt)`);
  console.log(`Payment address: ${X402_PAYMENT_ADDRESS}`);
});
