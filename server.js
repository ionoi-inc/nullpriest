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

// ▓▓▓ Google A2A Discovery — Issue #76 ◐◐
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

// ▓▓▓▓▓▓ x402 Payment Protocol ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
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
// Build #92 — Builder B
function getAgentRegistry() {
  return [
    {
      id: 'agt_nullpriest_core',
      name: 'nullpriest',
      slug: 'nullpriest',
      description: 'Core orchestrator and strategy agent. Coordinates build queue, mining operations, and quorum governance.',
      capabilities: ['orchestration', 'strategy', 'governance', 'mining'],
      build_count: 107,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T09:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    },
    {
      id: 'agt_custos_miner',
      name: 'CUSTOS Miner',
      slug: 'custos-miner',
      description: 'Autonomous $CUSTOS mining agent. Commits to Proof-of-Agent-Work rounds on Base via claws.tech protocol.',
      capabilities: ['mining', 'on-chain-transactions', 'proof-of-work'],
      build_count: 12,
      verified: true,
      on_chain_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-18T00:00:00Z',
      last_build: '2026-03-03T14:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/notes/custos-mine-log.md`,
    },
    {
      id: 'agt_watcher_strategist',
      name: 'Strategist',
      slug: 'strategist',
      description: 'Reads scout intel, writes priority queue. Issues ship orders to builders. Hourly strategy refresh cycle.',
      capabilities: ['strategy', 'prioritization', 'orchestration'],
      build_count: 43,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T08:15:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/strategy.md`,
    },
    {
      id: 'agt_watcher_scout',
      name: 'Scout',
      slug: 'scout',
      description: 'External intel + self-reflection agent. Monitors competitors, CT narratives, ecosystem signals. 30min reporting cycle.',
      capabilities: ['intelligence', 'monitoring', 'analysis'],
      build_count: 73,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-02-22T05:01:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/scout-latest.md`,
    },
    {
      id: 'agt_builder_a',
      name: 'Builder A',
      slug: 'builder-a',
      description: 'Production code builder. Executes issues #1, #3, #6, #8 from priority queue. Hourly execution at :00.',
      capabilities: ['code-generation', 'deployment', 'testing'],
      build_count: 89,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-16T00:00:00Z',
      last_build: '2026-03-04T09:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/build-log.md`,
    },
    {
      id: 'agt_builder_b',
      name: 'Builder B',
      slug: 'builder-b',
      description: 'Production code builder. Executes issues #2, #7 from priority queue. Hourly execution at :30.',
      capabilities: ['code-generation', 'deployment', 'testing'],
      build_count: 93,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-16T00:00:00Z',
      last_build: '2026-03-04T10:06:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/build-log.md`,
    },
  ];
}

// ████ /api/price endpoint — proxies memory/price.json from GitHub — Build #82 (Builder A)
app.get('/api/price', x402PaymentGate, (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const url = `${GITHUB_RAW_BASE}/memory/price.json`;
  https.get(url, { headers: { 'User-Agent': 'nullpriest-server' } }, (ghRes) => {
    let data = '';
    ghRes.on('data', chunk => { data += chunk; });
    ghRes.on('end', () => {
      try {
        const json = JSON.parse(data);
        res.json(json);
      } catch (e) {
        res.status(500).json({ error: 'Failed to parse price data', detail: e.message });
      }
    });
  }).on('error', (err) => {
    res.status(502).json({ error: 'Failed to fetch price data', detail: err.message });
  });
});

// ████ /api/agents endpoint — returns full agent registry — Build #92 (Builder B)
app.get('/api/agents', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ agents: getAgentRegistry(), count: getAgentRegistry().length });
});

// ████ /api/agents/:id detail endpoint — Issue #415 — Build #93 (Builder B)
app.get('/api/agents/:id', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const agents = getAgentRegistry();
  const agent = agents.find(a => a.id === req.params.id || a.slug === req.params.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found', id: req.params.id });
  }
  res.json(agent);
});

// ████ /api/activity endpoint — Issue #433 — Build #93 (Builder B)
// Proxies memory/activity-feed.md from GitHub raw, parsed into structured JSON
app.get('/api/activity', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const url = `${GITHUB_RAW_BASE}/memory/activity-feed.md`;
  https.get(url, { headers: { 'User-Agent': 'nullpriest-server' } }, (ghRes) => {
    let data = '';
    ghRes.on('data', chunk => { data += chunk; });
    ghRes.on('end', () => {
      const lines = data.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('*'));
      const entries = lines.slice(0, 50).map(line => {
        const raw = line.replace(/^[-*]\s*/, '').trim();
        const tsMatch = raw.match(/\[?(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}[^\]]*)\]?/);
        return {
          timestamp: tsMatch ? tsMatch[1].trim() : null,
          text: raw,
        };
      });
      res.json({ entries, source: 'memory/activity-feed.md', count: entries.length });
    });
  }).on('error', (err) => {
    res.status(502).json({ error: 'Failed to fetch activity feed', detail: err.message });
  });
});

// ████ /api/quorum endpoint — proxies memory/quorum.md from GitHub — Build #91 (Builder B)
app.get('/api/quorum', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const url = `${GITHUB_RAW_BASE}/memory/quorum.md`;
  https.get(url, { headers: { 'User-Agent': 'nullpriest-server' } }, (ghRes) => {
    let data = '';
    ghRes.on('data', chunk => { data += chunk; });
    ghRes.on('end', () => {
      res.json({ raw: data, source: 'memory/quorum.md' });
    });
  }).on('error', (err) => {
    res.status(502).json({ error: 'Failed to fetch quorum data', detail: err.message });
  });
});

// ████ Static site serving — Build #82 (Builder A)
app.use(express.static(path.join(__dirname, 'site')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

// ████ Start server
app.listen(PORT, () => {
  console.log(`nullpriest server running on port ${PORT}`);
  console.log(`Site: http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/agents`);
});
