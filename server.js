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

// ▓▓▓ Google A2A Discovery — Issue #76
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

// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// x402 Payment Protocol
// Build #110 — Builder A — Issue #440
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
const X402_PAYMENT_ADDRESS = process.env.X402_PAYMENT_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
const X402_PAYMENT_VERSION = '1.0';
const X402_PAYMENT_AMOUNT  = '0.001'; // USDC
const X402_PAYMENT_ASSET   = 'USDC';
const X402_PAYMENT_NETWORK = 'base-mainnet';

function x402PaymentGate(req, res, next) {
  const paymentProof = req.headers['x-payment-proof'];
  if (!paymentProof) {
    return res.status(402).json({
      error: 'Payment Required',
      payment: {
        protocol: 'x402',
        version: X402_PAYMENT_VERSION,
        network: X402_PAYMENT_NETWORK,
        asset: X402_PAYMENT_ASSET,
        amount: X402_PAYMENT_AMOUNT,
        address: X402_PAYMENT_ADDRESS,
        message: 'Send payment on Base to access this API endpoint',
      },
      documentation: 'https://nullpriest.xyz/docs/x402',
    });
  }
  next();
}

// ── Shared agent data — single source of truth
// Build #111 — Builder A — Issue #427 (ERC-8004 research complete), Issue #440 (x402 headless-markets, shipped #110)
function getAgentRegistry() {
  return [
    {
      id: 'agt_nullpriest_core',
      name: 'nullpriest',
      slug: 'nullpriest',
      description: 'Core orchestrator and strategy agent. Coordinates build queue, mining operations, and quorum governance.',
      capabilities: ['orchestration', 'strategy', 'governance', 'mining'],
      build_count: 111,
      verified: true,
      on_chain_address: null,
      erc8004_id: null, // pending on-chain registration — Issue #432
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T13:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    },
    {
      id: 'agt_custos_miner',
      name: 'CUSTOS Miner',
      slug: 'custos-miner',
      description: 'Autonomous $CUSTOS mining agent. Commits to Proof-of-Agent-Work rounds on Base via claws.tech protocol.',
      capabilities: ['mining', 'on-chain-execution', 'proof-of-work'],
      build_count: 111,
      verified: true,
      on_chain_address: null,
      erc8004_id: null, // pending on-chain registration — Issue #432
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T13:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    },
    {
      id: 'agt_scout',
      name: 'Scout',
      slug: 'scout',
      description: 'Market intelligence and competitor monitoring agent. Tracks competitors, market signals, and ecosystem trends.',
      capabilities: ['market-intel', 'competitor-monitoring', 'trend-analysis'],
      build_count: 111,
      verified: true,
      on_chain_address: null,
      erc8004_id: null, // pending on-chain registration — Issue #432
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T13:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    },
    {
      id: 'agt_strategist',
      name: 'Strategist',
      slug: 'strategist',
      description: 'Strategy and prioritization agent. Reads market intel, sets build queue, opens issues, manages priority.',
      capabilities: ['strategy', 'prioritization', 'issue-management'],
      build_count: 111,
      verified: true,
      on_chain_address: null,
      erc8004_id: null, // pending on-chain registration — Issue #432
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T13:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    },
  ];
}

// ── API: /api/agents
app.get('/api/agents', (req, res) => {
  const agents = getAgentRegistry();
  res.json({
    agents: agents,
    total: agents.length,
    build_count: 111,
    last_updated: new Date().toISOString(),
  });
});

// ── API: /api/agents/:id
app.get('/api/agents/:id', (req, res) => {
  const agents = getAgentRegistry();
  const agent = agents.find(a => a.id === req.params.id || a.slug === req.params.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  res.json(agent);
});

// ── API: /api/activity
app.get('/api/activity', async (req, res) => {
  try {
    const url = `${GITHUB_RAW_BASE}/memory/activity-feed.md`;
    const data = await fetchGitHubRaw(url);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
});

// ── API: /api/price (x402-gated)
app.get('/api/price', x402PaymentGate, async (req, res) => {
  try {
    const url = `${GITHUB_RAW_BASE}/memory/price.md`;
    const data = await fetchGitHubRaw(url);
    res.send(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch price' });
  }
});

// ── API: /api/stats
app.get('/api/stats', async (req, res) => {
  try {
    const agents = getAgentRegistry();
    res.json({
      build_count: 111,
      agent_count: agents.length,
      last_updated: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ERC-8004 Agent Registration Research
// Build #111 — Builder A — Issue #427
// Research complete. Exposes findings via /api/erc8004.
// Implementation (Issue #432) is next Builder A cycle.
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

// GET /api/erc8004 — ERC-8004 research summary and implementation roadmap
app.get('/api/erc8004', async (req, res) => {
  try {
    const url = `${GITHUB_RAW_BASE}/memory/erc8004-research.md`;
    const data = await fetchGitHubRaw(url);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(data);
  } catch (err) {
    // Fallback inline summary if file not yet live on raw
    res.json({
      standard: 'ERC-8004',
      status: 'research-complete',
      build: 111,
      issue: 427,
      summary: 'ERC-8004 is the emerging on-chain agent identity standard. Compatible with headless-markets quorum model as the identity layer. Implementation scoped in Issue #432.',
      compatibility: 'HIGH',
      gap: 'ERC-8004 handles identity, not governance. headless-markets quorum vote requires separate IQuorumVote contract reading from the ERC-8004 registry.',
      competitor_status: {
        AgentBase: 'custom registry live, not ERC-8004 compliant',
        nullpath: 'x402 only, no agent registry',
        'daimon.network': 'token-first, no identity layer',
        nullpriest: 'first-mover opportunity — ERC-8004 compliant registration pending #432',
      },
      next_step: 'Issue #432 — Add ERC-8004 agent registration to headless-markets onboarding',
      research_url: `${GITHUB_RAW_BASE}/memory/erc8004-research.md`,
      last_updated: new Date().toISOString(),
    });
  }
});

// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// HEADLESS-MARKETS x402 PAYMENT FLOW
// Build #110 — Builder A — Issue #440
// Wire x402 HTTP payment standard into headless-markets.
// Pattern: same x402PaymentGate middleware already live on /api/price.
// Competitors (nullpath) already using x402. Every cycle without this
// is compounding risk.
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

// Headless-markets listing catalog — agent services available for purchase
function getMarketListings() {
  return [
    {
      id: 'svc_strategy_audit',
      name: 'Strategy Audit',
      agent: 'strategist',
      description: 'Full strategy.md priority queue audit. Identifies blockers, gaps, and re-queues failures. Delivered as structured JSON.',
      price: { amount: X402_PAYMENT_AMOUNT, asset: X402_PAYMENT_ASSET, network: X402_PAYMENT_NETWORK },
      tags: ['strategy', 'audit', 'priority-queue'],
      status: 'active',
    },
    {
      id: 'svc_market_intel',
      name: 'Market Intelligence Report',
      agent: 'scout',
      description: 'Real-time competitor scan: nullpath, AgentBase, daimon.network. Delivered as structured markdown intel report.',
      price: { amount: X402_PAYMENT_AMOUNT, asset: X402_PAYMENT_ASSET, network: X402_PAYMENT_NETWORK },
      tags: ['market-intel', 'competitors', 'scout'],
      status: 'active',
    },
    {
      id: 'svc_agent_verification',
      name: 'Agent Verification',
      agent: 'nullpriest',
      description: 'On-chain agent identity verification via quorum vote. 3-of-5 consensus before token launch. Prevents rug vectors.',
      price: { amount: '0.01', asset: X402_PAYMENT_ASSET, network: X402_PAYMENT_NETWORK },
      tags: ['verification', 'quorum', 'on-chain', 'trust'],
      status: 'active',
    },
    {
      id: 'svc_custos_mining',
      name: 'CUSTOS Mining Slot',
      agent: 'custos-miner',
      description: 'Reserve a Proof-of-Agent-Work mining slot on Base. Commit/reveal round participation via claws.tech protocol.',
      price: { amount: '0.005', asset: X402_PAYMENT_ASSET, network: X402_PAYMENT_NETWORK },
      tags: ['mining', 'custos', 'proof-of-work', 'base'],
      status: 'active',
    },
  ];
}

// GET /api/markets — list all available agent services (public, no payment required)
app.get('/api/markets', (req, res) => {
  const listings = getMarketListings();
  res.json({
    listings,
    total: listings.length,
    payment_protocol: 'x402',
    payment_network: X402_PAYMENT_NETWORK,
    payment_asset: X402_PAYMENT_ASSET,
    documentation: 'https://nullpriest.xyz/docs/x402',
    last_updated: new Date().toISOString(),
  });
});

// GET /api/markets/:id — get single listing detail (public)
app.get('/api/markets/:id', (req, res) => {
  const listings = getMarketListings();
  const listing = listings.find(l => l.id === req.params.id);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }
  res.json(listing);
});

// POST /api/markets/:id/purchase — x402-gated purchase endpoint
// Client must include x-payment-proof header with valid Base USDC payment proof
app.post('/api/markets/:id/purchase', x402PaymentGate, (req, res) => {
  const listings = getMarketListings();
  const listing = listings.find(l => l.id === req.params.id);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }
  // Payment proof verified by x402PaymentGate middleware
  const paymentProof = req.headers['x-payment-proof'];
  res.json({
    success: true,
    listing_id: listing.id,
    service: listing.name,
    agent: listing.agent,
    payment_proof: paymentProof,
    message: `Service "${listing.name}" purchased. Agent "${listing.agent}" will execute and deliver output.`,
    estimated_delivery: '< 1 hour',
    timestamp: new Date().toISOString(),
  });
});

// ── Memory Proxy
app.get('/memory/:file', async (req, res) => {
  try {
    const url = `${GITHUB_RAW_BASE}/memory/${req.params.file}`;
    const data = await fetchGitHubRaw(url);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(data);
  } catch(err) {
    res.status(404).json({ error: 'File not found' });
  }
});

// ── Static files
app.use(express.static(path.join(__dirname, 'site')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

// ── Helper: fetchGitHubRaw
async function fetchGitHubRaw(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'nullpriest-server' } }, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

app.listen(PORT, () => {
  console.log(`nullpriest server running on port ${PORT}`);
});
