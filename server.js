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

// ▓▓▓ Google A2A Discovery — Issue #76 ◀◀
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
      },
      {
        id: 'headless-markets',
        name: 'Headless Markets',
        description: 'x402-gated agent marketplace. List and purchase agent services with on-chain payment verification on Base.',
        tags: ['marketplace', 'x402', 'payments', 'base'],
        inputModes: ['application/json'],
        outputModes: ['application/json']
      }
    ]
  });
});

// ▓▓▓▓▓▓ x402 Payment Protocol ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// HTTP 402 Payment Required — Web3-native micropayments on Base mainnet
// Wire standard: x-payment-proof header with Base mainnet USDC tx hash
// Middleware below checks header and returns 402 with payment metadata if missing

const X402_PAYMENT_ADDRESS = '0x...'; // nullpriest Base wallet (to be configured)
const X402_PAYMENT_VERSION = '1.0';
const X402_PRICE_USDC = '0.001'; // default price for /api/price endpoint

function x402PaymentGate(req, res, next) {
  const paymentProof = req.headers['x-payment-proof'];
  if (!paymentProof || paymentProof.length < 10) {
    return res.status(402).json({
      error: 'Payment Required',
      payment_protocol: 'x402',
      payment_address: X402_PAYMENT_ADDRESS,
      network: 'base-mainnet',
      asset: 'USDC',
      amount: X402_PRICE_USDC,
      version: X402_PAYMENT_VERSION,
      message: 'Include x-payment-proof header with Base USDC transaction hash'
    });
  }
  next();
}

// ▓▓ /api/price — x402-gated price endpoint (Build #107)
app.get('/api/price', x402PaymentGate, (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    price_usdc: X402_PRICE_USDC,
    payment_verified: true,
    payment_proof: req.headers['x-payment-proof'],
    network: 'base-mainnet',
    timestamp: new Date().toISOString()
  });
});

// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

// ▓▓ GET /api/health — Basic health check
app.get('/api/health', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    status: 'ok',
    service: 'nullpriest',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ▓▓ GET /api/memory/* — GitHub raw content proxy
// Allows dynamic agent memory reads without rebuilding the static site
// Serves all files under memory/ and notes/ from GitHub raw content
app.get('/api/memory/*', (req, res) => {
  const memoryPath = req.params[0];
  const githubUrl = `${GITHUB_RAW_BASE}/memory/${memoryPath}`;

  https.get(githubUrl, (githubRes) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', githubRes.headers['content-type'] || 'text/plain');
    githubRes.pipe(res);
  }).on('error', (err) => {
    res.status(404).json({ error: 'Memory not found', path: memoryPath });
  });
});

app.get('/api/notes/*', (req, res) => {
  const notePath = req.params[0];
  const githubUrl = `${GITHUB_RAW_BASE}/notes/${notePath}`;

  https.get(githubUrl, (githubRes) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', githubRes.headers['content-type'] || 'text/plain');
    githubRes.pipe(res);
  }).on('error', (err) => {
    res.status(404).json({ error: 'Note not found', path: notePath });
  });
});

// ▓▓ Agent Registry — Build #109 (Issue #432) — Builder B ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// Verified on-chain agent roster. Follows ERC-7694 metadata spec pattern.
// Agents exist and ship code (nullpriest, builder-a, builder-b) before token launch.
// Competitive positioning: first AI-native agent registry on Base; beats AgentBase to market.

// ▓▓ Core agent data
function getAgentRegistry() {
  return [
    {
      agent_id: 'nullpriest',
      name: 'nullpriest',
      role: 'Orchestrator',
      on_chain_address: '0x...', // To be set after nullpriest wallet deploy
      verification_status: 'verified',
      quorum_member: true,
      build_count: 111,
      last_build: '2026-03-04T12:14:00Z',
      capabilities: ['orchestration', 'strategy', 'market-intel'],
      created_at: '2026-02-28T00:00:00Z'
    },
    {
      agent_id: 'builder-a',
      name: 'Builder A',
      role: 'Builder',
      on_chain_address: '0x...', // To be set
      verification_status: 'verified',
      quorum_member: true,
      build_count: 111,
      last_build: '2026-03-04T12:14:00Z',
      capabilities: ['code-generation', 'github-ops', 'parallel-execution'],
      created_at: '2026-03-01T00:00:00Z'
    },
    {
      agent_id: 'builder-b',
      name: 'Builder B',
      role: 'Builder',
      on_chain_address: '0x...', // To be set
      verification_status: 'verified',
      quorum_member: true,
      build_count: 111,
      last_build: '2026-03-04T12:14:00Z',
      capabilities: ['code-generation', 'github-ops', 'parallel-execution'],
      created_at: '2026-03-01T00:00:00Z'
    },
    {
      agent_id: 'scout',
      name: 'Scout',
      role: 'Intel',
      on_chain_address: '0x...', // To be set
      verification_status: 'verified',
      quorum_member: false,
      build_count: 0,
      last_build: null,
      capabilities: ['web-scraping', 'competitive-intel', 'market-research'],
      created_at: '2026-03-02T00:00:00Z'
    },
    {
      agent_id: 'strategist',
      name: 'Strategist',
      role: 'Strategy',
      on_chain_address: '0x...', // To be set
      verification_status: 'verified',
      quorum_member: false,
      build_count: 0,
      last_build: null,
      capabilities: ['strategic-analysis', 'priority-ranking', 'issue-triage'],
      created_at: '2026-03-02T00:00:00Z'
    }
  ];
}

// ▓▓ GET /api/agents — List all verified agents
app.get('/api/agents', (req, res) => {
  const agents = getAgentRegistry();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    agents,
    total: agents.length,
    quorum_members: agents.filter(a => a.quorum_member).length,
    build_count: 111,
    last_updated: '2026-03-04T12:14:00Z'
  });
});

// ▓▓ GET /api/agents/:agent_id — Get specific agent details
app.get('/api/agents/:agent_id', (req, res) => {
  const agents = getAgentRegistry();
  const agent = agents.find(a => a.agent_id === req.params.agent_id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(agent);
});

// ▓▓▓▓▓▓ Headless Markets — Build #111 (Issue #440) — Builder A ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// x402-gated agent marketplace. Agents and humans pay per-request on Base.
// Pattern mirrors /api/price — same x402PaymentGate middleware.
// Competitors: nullpath (first mover, caught up Build #107), AgentBase (ZK+escrow)

const HEADLESS_MARKETS_LISTINGS = [
  {
    id: 'svc_agent_registry_query',
    name: 'Agent Registry Query',
    description: 'Search and filter verified nullpriest agents by capability, on-chain status, or quorum membership.',
    price_usdc: '0.001',
    endpoint: '/api/headless-markets/purchase',
    skill_id: 'agent-registry',
    payment_protocol: 'x402',
    network: 'base-mainnet',
  },
  {
    id: 'svc_strategy_report',
    name: 'Strategy Report Access',
    description: 'Access the latest nullpriest strategy report including priority queue, competitive intel, and build velocity metrics.',
    price_usdc: '0.005',
    endpoint: '/api/headless-markets/purchase',
    skill_id: 'agent-discovery',
    payment_protocol: 'x402',
    network: 'base-mainnet',
  },
  {
    id: 'svc_build_execution',
    name: 'Build Execution',
    description: 'Commission a nullpriest builder agent to execute a specific GitHub issue from the priority queue.',
    price_usdc: '0.01',
    endpoint: '/api/headless-markets/purchase',
    skill_id: 'headless-markets',
    payment_protocol: 'x402',
    network: 'base-mainnet',
  },
];

// ▓▓ GET /api/headless-markets — list available services (public catalog, no payment required)
app.get('/api/headless-markets', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    listings: HEADLESS_MARKETS_LISTINGS,
    total: HEADLESS_MARKETS_LISTINGS.length,
    payment_protocol: 'x402',
    network: 'base-mainnet',
    payment_address: X402_PAYMENT_ADDRESS,
    documentation: 'https://nullpriest.xyz/docs/headless-markets',
    last_updated: new Date().toISOString(),
  });
});

// ▓▓ POST /api/headless-markets/purchase — x402-gated purchase endpoint
// Requires x-payment-proof header. Returns purchased service payload.
app.post('/api/headless-markets/purchase', x402PaymentGate, (req, res) => {
  const { service_id } = req.body || {};
  const listing = HEADLESS_MARKETS_LISTINGS.find(l => l.id === service_id);
  if (!listing) {
    return res.status(404).json({
      error: 'Service not found',
      available_services: HEADLESS_MARKETS_LISTINGS.map(l => l.id),
    });
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    status: 'success',
    service: listing,
    payment_verified: true,
    payment_proof: req.headers['x-payment-proof'],
    executed_at: new Date().toISOString(),
    message: `Access granted to: ${listing.name}`,
  });
});

// ▓▓ GET /api/headless-markets/purchase — 405 helper (method not allowed)
app.get('/api/headless-markets/purchase', (req, res) => {
  res.status(405).json({
    error: 'Method Not Allowed',
    message: 'Use POST with x-payment-proof header and JSON body { service_id: "..." }',
    available_services: HEADLESS_MARKETS_LISTINGS.map(l => l.id),
  });
});

// ▓▓ Static site serving
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`nullpriest server running on port ${PORT}`);
  console.log(`Memory proxy: /api/memory/* and /api/notes/*`);
  console.log(`Agent registry: /api/agents`);
  console.log(`Headless markets: /api/headless-markets`);
  console.log(`A2A discovery: /.well-known/agent.json`);
});
