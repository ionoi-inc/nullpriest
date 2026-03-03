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

// ▓▓ x402 Payment Protocol — Issue #317 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
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

// ▓▓ Static site ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.use(express.static(path.join(__dirname, 'site')));

// ▓▓ Health check ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), agent: 'nullpriest', version: '2.5' });
});

// ▓▓ Well-known agent discovery (Google A2A protocol) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/.well-known/agent.json', (req, res) => {
  res.sendFile(path.join(__dirname, '.well-known', 'agent.json'));
});

// ▓▓ Agent registry — list (Issue #75) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/agents', x402Middleware, (req, res) => {
  res.json({ agents: AGENT_REGISTRY, count: AGENT_REGISTRY.length, timestamp: new Date().toISOString() });
});

// ▓▓ Agent registry — single agent profile (Issue #61) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/agents/:id', x402Middleware, (req, res) => {
  const agent = AGENT_REGISTRY.find(a => a.id === req.params.id);
  if (!agent) return res.status(404).json({ error: 'agent not found', id: req.params.id });
  res.json(agent);
});

// ▓▓ x402 payment info endpoint ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/x402', (req, res) => {
  res.json({
    protocol: 'x402',
    version:  X402_PAYMENT_VERSION,
    network:  X402_PAYMENT_NETWORK,
    asset:    X402_PAYMENT_ASSET,
    amount:   X402_PAYMENT_AMOUNT,
    address:  X402_PAYMENT_ADDRESS,
    memo:     'nullpriest agent registry access',
    usage:    'Send payment on Base, then include tx hash in X-Payment header',
    docs:     'https://nullpriest.xyz/api/x402',
  });
});

// ▓▓ Memory proxy — read-only access to GitHub memory/ folder ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/memory/:filename', (req, res) => {
  const filename = req.params.filename;
  const allowedFiles = ['scout-latest.md', 'strategy.md', 'build-log.md', 'activity-feed.md'];
  
  if (!allowedFiles.includes(filename)) {
    return res.status(403).json({ error: 'file not allowed', allowed: allowedFiles });
  }

  const url = `${GITHUB_RAW_BASE}/memory/${filename}`;
  
  https.get(url, (ghRes) => {
    if (ghRes.statusCode !== 200) {
      return res.status(ghRes.statusCode).json({ error: 'file not found', filename });
    }
    
    let data = '';
    ghRes.on('data', chunk => data += chunk);
    ghRes.on('end', () => {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.send(data);
    });
  }).on('error', (err) => {
    res.status(500).json({ error: 'fetch failed', message: err.message });
  });
});

// ▓▓ AGENT REGISTRY — Issue #75 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
const AGENT_REGISTRY = [
  {
    id: 'nullpriest-scout',
    name: 'Scout',
    role: 'Market Intelligence',
    status: 'active',
    builds: 79,
    commits: 158,
    revenue: '$0',
    wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    verified: true,
    lastActive: '2026-02-22T05:01:00Z',
    capabilities: ['web-scraping', 'market-intel', 'competitor-analysis', 'reporting'],
  },
  {
    id: 'nullpriest-strategist',
    name: 'Strategist',
    role: 'Priority Queue Manager',
    status: 'active',
    builds: 42,
    commits: 42,
    revenue: '$0',
    wallet: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    verified: true,
    lastActive: '2026-02-21T06:01:00Z',
    capabilities: ['planning', 'issue-triage', 'roadmap', 'decision-making'],
  },
  {
    id: 'nullpriest-builder-a',
    name: 'Builder A',
    role: 'Production Code Specialist',
    status: 'active',
    builds: 79,
    commits: 237,
    revenue: '$0',
    wallet: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    verified: true,
    lastActive: '2026-02-20T17:04:00Z',
    capabilities: ['frontend', 'backend', 'smart-contracts', 'deployment'],
  },
  {
    id: 'nullpriest-builder-b',
    name: 'Builder B',
    role: 'Production Code Specialist',
    status: 'paused',
    builds: 23,
    commits: 69,
    revenue: '$0',
    wallet: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    verified: true,
    lastActive: '2026-02-20T17:04:00Z',
    capabilities: ['frontend', 'UI/UX', 'API-integration', 'testing'],
  },
  {
    id: 'nullpriest-builder-d',
    name: 'Builder D',
    role: 'Infrastructure Specialist',
    status: 'paused',
    builds: 15,
    commits: 45,
    revenue: '$0',
    wallet: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    verified: true,
    lastActive: '2026-02-18T14:30:00Z',
    capabilities: ['deployment', 'CI/CD', 'monitoring', 'infrastructure'],
  },
  {
    id: 'nullpriest-publisher',
    name: 'Publisher',
    role: 'Social Media Manager',
    status: 'blocked',
    builds: 8,
    commits: 24,
    revenue: '$0',
    wallet: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    verified: true,
    lastActive: '2026-02-15T09:00:00Z',
    capabilities: ['X-posting', 'content', 'engagement', 'community'],
  },
];

// ▓▓ 404 handler ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.use((req, res) => {
  res.status(404).json({ error: 'not found', path: req.path, method: req.method });
});

app.listen(PORT, () => {
  console.log(`nullpriest server running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
  console.log(`Agents: http://localhost:${PORT}/api/agents`);
});
