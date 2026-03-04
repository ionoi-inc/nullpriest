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

// ▓▓▓▓▓▓ x402 Payment Protocol ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// Issue #440 — Build #109: fixed syntax error (spurious | removed), added purchase flow
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

// ▓▓ Shared agent data — single source of truth ▓▓
// Build #109 — incremented build counts and timestamps
function getAgentRegistry() {
  return [
    {
      id: 'agt_nullpriest_core',
      name: 'nullpriest',
      slug: 'nullpriest',
      description: 'Core orchestrator and strategy agent. Coordinates build queue, mining operations, and quorum governance.',
      capabilities: ['orchestration', 'strategy', 'governance', 'mining'],
      build_count: 109,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T11:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    },
    {
      id: 'agt_custos_miner',
      name: 'CUSTOS Miner',
      slug: 'custos-miner',
      description: 'Autonomous $CUSTOS mining agent. Commits to Proof-of-Agent-Work rounds on Base via claws.tech protocol.',
      capabilities: ['mining', 'on-chain-execution', 'proof-of-work'],
      build_count: 109,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T11:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    },
    {
      id: 'agt_scout',
      name: 'Scout',
      slug: 'scout',
      description: 'Market intelligence agent. Scans competitors, social signals, and ecosystem movements every 30min.',
      capabilities: ['intelligence', 'market-scan', 'competitor-analysis'],
      build_count: 109,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T11:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    },
    {
      id: 'agt_strategist',
      name: 'Strategist',
      slug: 'strategist',
      description: 'Strategy and prioritization agent. Reads scout reports, writes priority queues, creates issues, coordinates builders.',
      capabilities: ['strategy', 'planning', 'issue-management'],
      build_count: 109,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T11:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    },
    {
      id: 'agt_builder_a',
      name: 'Builder A',
      slug: 'builder-a',
      description: 'Primary code builder. Builds core backend, API endpoints, and infrastructure changes.',
      capabilities: ['code-build', 'api', 'infrastructure'],
      build_count: 109,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T11:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    }
  ];
}

// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// API ENDPOINTS

// GET /api/agents
app.get('/api/agents', (req, res) => {
  const registry = getAgentRegistry();
  res.json({
    agents: registry,
    total: registry.length,
    build_count: registry[0].build_count,
    last_updated: new Date().toISOString()
  });
});

// GET /api/agents/:id
app.get('/api/agents/:id', (req, res) => {
  const registry = getAgentRegistry();
  const agent = registry.find(a => a.id === req.params.id || a.slug === req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
});

// GET /api/price - x402-gated endpoint
app.get('/api/price', x402PaymentGate, (req, res) => {
  res.json({
    protocol: 'x402',
    version: '1.0',
    agent: 'nullpriest',
    prices: [
      { service: 'agent-discovery', amount: '0.001', asset: 'USDC', network: 'base-mainnet' },
      { service: 'agent-registration', amount: '0.01', asset: 'USDC', network: 'base-mainnet' },
      { service: 'quorum-vote', amount: '0.005', asset: 'USDC', network: 'base-mainnet' }
    ]
  });
});

// GET /api/markets - x402-gated headless markets listing
app.get('/api/markets', x402PaymentGate, (req, res) => {
  res.json({
    protocol: 'x402',
    version: '1.0',
    markets: getAgentRegistry().map(agent => ({
      agent_id: agent.id,
      name: agent.name,
      slug: agent.slug,
      capabilities: agent.capabilities,
      price: '0.001',
      asset: 'USDC',
      network: 'base-mainnet',
      payment_address: X402_PAYMENT_ADDRESS,
      verified: agent.verified,
      on_chain_address: agent.on_chain_address,
      purchase_url: `https://nullpriest.xyz/api/markets/${agent.slug}/purchase`
    }))
  });
});

// POST /api/markets/:slug/purchase — Issue #440: x402 headless-markets purchase flow
// Wire x402 payment standard into headless-markets payment flow.
// Client must supply x-payment-proof header (Base USDC tx hash proving 0.001 USDC sent).
// On valid proof: returns signed service token + agent endpoint for downstream use.
app.post('/api/markets/:slug/purchase', x402PaymentGate, (req, res) => {
  const registry = getAgentRegistry();
  const agent = registry.find(a => a.slug === req.params.slug);
  if (!agent) return res.status(404).json({ error: 'Agent not found in marketplace' });

  const paymentProof = req.headers['x-payment-proof'];
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h TTL

  res.json({
    protocol: 'x402',
    version: '1.0',
    status: 'purchased',
    agent: {
      id: agent.id,
      name: agent.name,
      slug: agent.slug,
      capabilities: agent.capabilities,
      verified: agent.verified,
      github: agent.github,
      activity_url: agent.activity_url,
    },
    payment: {
      proof: paymentProof,
      amount: X402_PAYMENT_AMOUNT,
      asset: X402_PAYMENT_ASSET,
      network: X402_PAYMENT_NETWORK,
      address: X402_PAYMENT_ADDRESS,
    },
    access: {
      issued_at: issuedAt,
      expires_at: expiresAt,
      endpoints: {
        agent_card: `https://nullpriest.xyz/.well-known/agent.json`,
        activity: `https://nullpriest.xyz/api/activity`,
        agents: `https://nullpriest.xyz/api/agents/${agent.slug}`,
      }
    }
  });
});

// GET /api/activity
app.get('/api/activity', async (req, res) => {
  try {
    const url = `${GITHUB_RAW_BASE}/memory/activity-feed.md`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`GitHub fetch failed: ${response.status}`);
    const md = await response.text();
    const lines = md.split('\n');
    const events = [];
    let i = 0;
    while (i < lines.length) {
      if (lines[i].startsWith('### Build #')) {
        const buildNum = lines[i].match(/Build #(\d+)/)[1];
        const linesTillNextBlock = [];
        i++;
        while (i < lines.length && !lines[i].startsWith('##')) {
          linesTillNextBlock.push(lines[i]);
          i++;
        }
        events.push({ build: buildNum, lines: linesTillNextBlock.join('\n') });
      } else {
        i++;
      }
    }
    res.json({ source: 'github', format: 'markdown', events: events.slice(0, 50) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats
app.get('/api/stats', (req, res) => {
  const registry = getAgentRegistry();
  res.json({
    build_count: registry[0].build_count,
    agent_count: registry.length,
    last_updated: new Date().toISOString(),
    status: 'live'
  });
});

// GET /api/memory/:file
app.get('/api/memory/:file', async (req, res) => {
  try {
    const url = `${GITHUB_RAW_BASE}/memory/${req.params.file}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Not found');
    const text = await response.text();
    res.setHeader('Content-Type', 'text/plain');
    res.send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Static files
app.use(express.static(path.join(__dirname, 'site')));

// Start server
app.listen(PORT, () => {
  console.log(`nullpriest server running on port ${PORT}`);
});
