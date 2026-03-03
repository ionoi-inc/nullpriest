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

// ▓▓ x402 Payment Protocol — Issue #317 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
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
    error:   'Payment Required',
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

// ▓▓ Static site ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.use(express.static(path.join(__dirname, 'site')));

// ▓▓ Health check ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), agent: 'nullpriest', version: '2.5' });
});

// ▓▓ Well-known agent discovery (Google A2A protocol) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/.well-known/agent.json', (req, res) => {
  res.sendFile(path.join(__dirname, '.well-known', 'agent.json'));
});

// ▓▓ Agent registry — list (Issue #75) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/agents', x402Middleware, (req, res) => {
  res.json({ agents: AGENT_REGISTRY, count: AGENT_REGISTRY.length, timestamp: new Date().toISOString() });
});

// ▓▓ Agent registry — single agent profile (Issue #61) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/agents/:id', x402Middleware, (req, res) => {
  const agent = AGENT_REGISTRY.find(a => a.id === req.params.id);
  if (!agent) return res.status(404).json({ error: 'agent not found', id: req.params.id });
  res.json(agent);
});

// ▓▓ x402 payment info endpoint ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/x402', (req, res) => {
  res.json({
    protocol: 'x402',
    version:  X402_PAYMENT_VERSION,
    network:  X402_PAYMENT_NETWORK,
    asset:    X402_PAYMENT_ASSET,
    amount:   X402_PAYMENT_AMOUNT,
    address:  X402_PAYMENT_ADDRESS,
    usage: 'Include X-Payment header with proof of payment, or X-Payment-Tier: free for free tier access',
    docs:  'https://nullpriest.xyz/docs/x402',
  });
});

// ▓▓ GitHub memory proxy ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/memory/:file', (req, res) => {
  const file = req.params.file;
  const url = `${GITHUB_RAW_BASE}/memory/${file}`;
  https.get(url, (ghRes) => {
    if (ghRes.statusCode !== 200) {
      return res.status(ghRes.statusCode).json({ error: 'file not found', file });
    }
    ghRes.pipe(res);
  }).on('error', (e) => {
    res.status(500).json({ error: 'proxy error', message: e.message });
  });
});

// ▓▓ AGENT_REGISTRY ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
const AGENT_REGISTRY = [
  {
    id: 'nullpriest-scout',
    name: 'Scout',
    role: 'Market Intelligence',
    status: 'active',
    cadence: 'every 30min',
    builds: 79,
    commits: 158,
    verification: 'on-chain',
    skills: ['web-scraping', 'trend-detection', 'competitive-intel'],
    output: 'memory/scout-latest.md',
  },
  {
    id: 'nullpriest-strategist',
    name: 'Strategist',
    role: 'Priority Queue Management',
    status: 'active',
    cadence: 'hourly at :15',
    builds: 42,
    commits: 89,
    verification: 'on-chain',
    skills: ['issue-triage', 'roadmap-planning', 'resource-allocation'],
    output: 'memory/strategy.md',
  },
  {
    id: 'nullpriest-builder-a',
    name: 'Builder A',
    role: 'Production Code',
    status: 'active',
    cadence: 'hourly at :00',
    builds: 79,
    commits: 237,
    verification: 'on-chain',
    skills: ['react', 'nextjs', 'typescript', 'tailwind'],
    output: 'git commits',
  },
  {
    id: 'nullpriest-builder-b',
    name: 'Builder B',
    role: 'Production Code',
    status: 'active',
    cadence: 'hourly at :10',
    builds: 23,
    commits: 72,
    verification: 'on-chain',
    skills: ['nodejs', 'express', 'api-design', 'database'],
    output: 'git commits',
  },
  {
    id: 'nullpriest-builder-d',
    name: 'Builder D',
    role: 'Production Code',
    status: 'active',
    cadence: 'hourly at :30',
    builds: 19,
    commits: 61,
    verification: 'on-chain',
    skills: ['devops', 'cloud-deployment', 'monitoring'],
    output: 'git commits',
  },
];

app.listen(PORT, () => {
  console.log(`nullpriest API running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
  console.log(`Agents: http://localhost:${PORT}/api/agents`);
});
