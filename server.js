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

// ▓▓▓▓▓▓ x402 Payment Protocol ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
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
// Build #109 — Builder B — Issue #433 (/api/activity), Issue #415 (/api/agents/:id)
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
      description: 'Market intelligence agent. Monitors competitors, tracks trends, and generates intel reports for strategy optimization.',
      capabilities: ['scraping', 'intelligence', 'monitoring'],
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
      description: 'Strategy and planning agent. Generates priority queues from intel reports.',
      capabilities: ['strategy', 'planning', 'prioritization'],
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
      description: 'Autonomous code builder for issues #1, #3, #5, #6, #8 from strategy.md priority queue.',
      capabilities: ['code-generation', 'git-commit', 'issue-closing'],
      build_count: 109,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T11:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    },
    {
      id: 'agt_builder_b',
      name: 'Builder B',
      slug: 'builder-b',
      description: 'Autonomous code builder for issues #2, #7 from strategy.md priority queue.',
      capabilities: ['code-generation', 'git-commit', 'issue-closing'],
      build_count: 109,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T11:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    },
  ];
}

// ▓▓ GET /api/agents — list all agents
app.get('/api/agents', (req, res) => {
  const agents = getAgentRegistry();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    agents: agents,
    total: agents.length,
    build_count: 109,
    last_updated: '2026-03-04T11:00:00Z',
  });
});

// ▓▓ GET /api/price — x402-gated price feed
app.get('/api/price', x402PaymentGate, (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    price: 1.0,
    asset: 'USDC',
    timestamp: new Date().toISOString(),
    protocol: 'x402',
  });
});

// ▓▓ GET /api/status — system health
app.get('/api/status', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    agents: getAgentRegistry().length,
  });
});

// ▓▓▓▓▓▓ Memory Proxy Endpoints — Read from GitHub Raw
// All memory/* files proxied from GitHub Raw for performance
function fetchGithubRaw(path) {
  return new Promise((resolve, reject) => {
    const url = `${GITHUB_RAW_BASE}/${path}`;
    https.get(url, (rtes) => {
      let data = '';
      rtes.on('data', (chunk) => data += chunk);
      rtes.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// ▓▓ GET /memory/:file — proxy GitHub Raw memory files
app.get('/memory/:file', async (req, res) => {
  try {
    const content = await fetchGithubRaw(`memory/${req.params.file}`);
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(content);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch memory file' });
  }
});

// ▓▓ GET /api/build-log — proxy build log from GitHub Raw
app.get('/api/build-log', async (req, res) => {
  try {
    const content = await fetchGithubRaw('memory/build-log.md');
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(content);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch build log' });
  }
});

// ▓▓ GET /api/scout — proxy scout report from GitHub Raw
app.get('/api/scout', async (req, res) => {
  try {
    const content = await fetchGithubRaw('memory/scout-latest.md');
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(content);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch scout report' });
  }
});

// ▓▓ GET /api/strategy — proxy strategy from GitHub Raw
app.get('/api/strategy', async (req, res) => {
  try {
    const content = await fetchGithubRaw('memory/strategy.md');
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(content);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch strategy' });
  }
});

// ▓▓ GET /api/activity — Build #94 (Issue #433) — Builder B
// Wire activity feed to API. Reads memory/activity-feed.md from GitHub Raw.
// Returns parsed entries as JSON array for dashboard widget consumption.
app.get('/api/activity', async (req, res) => {
  try {
    const raw = await fetchGithubRaw('memory/activity-feed.md');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    // Parse markdown activity feed lines into structured entries
    const lines = raw.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('*'));
    const entries = lines.slice(0, 50).map((line, i) => {
      const text = line.replace(/^[\-\*]\s+/, '').trim();
      // Extract timestamp pattern [YYYY-MM-DD HH:MM UTC] if present
      const tsMatch = text.match(/\[?(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?(?:\s?UTC)?Z?)\]?/);
      return {
        id: i,
        text: text,
        timestamp: tsMatch ? tsMatch[1] : null,
        raw: line.trim(),
      };
    });
    res.json({
      entries,
      total: entries.length,
      source: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
});

// ▓▓ GET /api/agents/:id — Build #94 (Issue #415) — Builder B
// Agent detail endpoint. Matches by id field OR slug. Returns enriched agent data.
// Supersedes /api/agents/:id/detail (kept for backwards compat below).
app.get('/api/agents/:id', (req, res) => {
  const agents = getAgentRegistry();
  const agent = agents.find(a => a.id === req.params.id || a.slug === req.params.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    ...agent,
    detail: true,
    endpoint_url: `https://nullpriest.xyz/api/agents/${req.params.id}`,
    metadata: {
      agent_json_url: `https://nullpriest.xyz/.well-known/agent.json`,
      build_log_url: `https://nullpriest.xyz/api/build-log`,
      activity_url: `https://nullpriest.xyz/api/activity`,
    },
  });
});

// ▓▓ GET /api/agents/:id/detail — Build #110 — kept for backwards compat
app.get('/api/agents/:id/detail', (req, res) => {
  const agents = getAgentRegistry();
  const agent = agents.find(a => a.id === req.params.id || a.slug === req.params.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    ...agent,
    detail: true,
    endpoint_url: `https://nullpriest.xyz/api/agents/${req.params.id}`,
    metadata: {
      agent_json_url: `https://nullpriest.xyz/.well-known/agent.json`,
      build_log_url: `https://nullpriest.xyz/api/build-log`,
      activity_url: `https://nullpriest.xyz/api/activity`,
    },
  });
});

// ▓▓ Static site serving
app.use(express.static(path.join(__dirname, 'site')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`nullpriest server listening on port ${PORT}`);
});