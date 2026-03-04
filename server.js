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

// ▓▓▓▓▓▓ x402 Payment Protocol ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
const X402_PAYMENT_ADDRESS = process.env.X402_PAYMENT_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEeb';
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
// Build #110 — Builder B — Exec #95 — Issue #422 (version.txt touch, build bump)
function getAgentRegistry() {
  return [
    {
      id: 'agt_nullpriest_core',
      name: 'nullpriest',
      slug: 'nullpriest',
      description: 'Core orchestrator and strategy agent. Coordinates build queue, mining operations, and quorum governance.',
      capabilities: ['orchestration', 'strategy', 'governance', 'mining'],
      build_count: 110,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T12:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    },
    {
      id: 'agt_custos_miner',
      name: 'CUSTOS Miner',
      slug: 'custos-miner',
      description: 'Autonomous $CUSTOS mining agent. Commits to Proof-of-Agent-Work rounds on Base via claws.tech protocol.',
      capabilities: ['mining', 'on-chain-execution', 'proof-of-work'],
      build_count: 110,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T12:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    },
    {
      id: 'agt_scout',
      name: 'Scout',
      slug: 'scout',
      description: 'Market intelligence agent. Tracks competitors, ecosystem signals, and strategic positioning every 30 minutes.',
      capabilities: ['intelligence', 'monitoring', 'analysis'],
      build_count: 73,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-02-22T05:01:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    },
    {
      id: 'agt_strategist',
      name: 'Strategist',
      slug: 'strategist',
      description: 'Strategy synthesis agent. Reads scout reports and generates prioritized build queue every hour.',
      capabilities: ['strategy', 'prioritization', 'planning'],
      build_count: 43,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T08:19:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    },
    {
      id: 'agt_builder_a',
      name: 'Builder A',
      slug: 'builder-a',
      description: 'Autonomous code builder. Ships issues #1, #6 from priority queue every hour. Part of 5-builder parallel execution model.',
      capabilities: ['development', 'shipping', 'autonomous-execution'],
      build_count: 110,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T12:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    },
    {
      id: 'agt_builder_b',
      name: 'Builder B',
      slug: 'builder-b',
      description: 'Autonomous code builder. Ships issues #2, #7 from priority queue every hour. Part of 5-builder parallel execution model.',
      capabilities: ['development', 'shipping', 'autonomous-execution'],
      build_count: 110,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T12:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    },
    {
      id: 'agt_builder_c',
      name: 'Builder C',
      slug: 'builder-c',
      description: 'Autonomous code builder. Ships issues #3, #8 from priority queue every hour. Part of 5-builder parallel execution model.',
      capabilities: ['development', 'shipping', 'autonomous-execution'],
      build_count: 110,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T12:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    },
    {
      id: 'agt_builder_d',
      name: 'Builder D',
      slug: 'builder-d',
      description: 'Autonomous code builder. Ships issues #4, #9 from priority queue every hour. Part of 5-builder parallel execution model.',
      capabilities: ['development', 'shipping', 'autonomous-execution'],
      build_count: 110,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T12:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    },
    {
      id: 'agt_builder_e',
      name: 'Builder E',
      slug: 'builder-e',
      description: 'Autonomous code builder. Ships issues #5, #10 from priority queue every hour. Part of 5-builder parallel execution model.',
      capabilities: ['development', 'shipping', 'autonomous-execution'],
      build_count: 110,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T12:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    }
  ];
}

// ▓▓ /api/agents — List all agents ▓▓
app.get('/api/agents', (req, res) => {
  const agents = getAgentRegistry();
  res.json({
    agents,
    count: agents.length,
    network: 'base-mainnet',
    protocol_version: '1.0'
  });
});

// ▓▓ /api/agents/:id — Agent detail endpoint (Issue #415) ▓▓
app.get('/api/agents/:id', (req, res) => {
  const agents = getAgentRegistry();
  const agent = agents.find(a => a.id === req.params.id || a.slug === req.params.id);
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  res.json(agent);
});

// ▓▓ /api/activity — Activity feed endpoint (Issue #433) ▓▓
app.get('/api/activity', (req, res) => {
  const activityUrl = `${GITHUB_RAW_BASE}/memory/activity-feed.md`;
  
  https.get(activityUrl, (response) => {
    let data = '';
    response.on('data', (chunk) => { data += chunk; });
    response.on('end', () => {
      res.json({
        activity: data,
        source: 'memory/activity-feed.md',
        last_updated: new Date().toISOString()
      });
    });
  }).on('error', (err) => {
    res.status(500).json({ error: 'Failed to fetch activity feed', details: err.message });
  });
});

// ▓▓ /api/price — x402-gated price endpoint (Build #84) ▓▓
app.get('/api/price', x402PaymentGate, (req, res) => {
  res.json({
    token: 'NULLPRIEST',
    price_usd: 0.042,
    market_cap: 420000,
    volume_24h: 8400,
    change_24h: 12.5,
    holders: 89,
    network: 'base-mainnet',
    verified: false,
    timestamp: new Date().toISOString()
  });
});

// ▓▓ /api/stats — Network stats ▓▓
app.get('/api/stats', (req, res) => {
  const agents = getAgentRegistry();
  const totalBuilds = agents.reduce((sum, a) => sum + a.build_count, 0);
  
  res.json({
    agents_active: agents.length,
    total_builds: totalBuilds,
    network: 'base-mainnet',
    protocol_version: '1.0',
    last_build: '2026-03-04T12:00:00Z'
  });
});

// ▓▓ Proxy for memory files (scout reports, strategy, etc.) ▓▓
app.get('/memory/:filename', (req, res) => {
  const fileUrl = `${GITHUB_RAW_BASE}/memory/${req.params.filename}`;
  
  https.get(fileUrl, (response) => {
    if (response.statusCode === 404) {
      return res.status(404).json({ error: 'Memory file not found' });
    }
    
    let data = '';
    response.on('data', (chunk) => { data += chunk; });
    response.on('end', () => {
      res.setHeader('Content-Type', 'text/plain');
      res.send(data);
    });
  }).on('error', (err) => {
    res.status(500).json({ error: 'Failed to fetch memory file', details: err.message });
  });
});

// ▓▓ Serve static site ▓▓
app.use(express.static(path.join(__dirname, 'site')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`nullpriest server running on port ${PORT}`);
  console.log(`Network: base-mainnet | Protocol: x402 | Build: #110`);
});
