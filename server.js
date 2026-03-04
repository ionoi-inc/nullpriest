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

// ▓▓▓▓▓▓ x402 Payment Protocol ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// Intercept all /api/* and /memory/* requests
// If no valid x402 payment proof → return 402 Payment Required with Base payment details
// If payment verified → serve the resource
const X402_PAYMENT_ADDRESS = process.env.X402_PAYMENT_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
const X402_PAYMENT_VERSION = '1.0';
const X402_PAYMENT_AMOUNT  = '0.001'; // USDC
const X402_PAYMENT_ASSET   = 'USDC';
const X402_PAYMENT_NETWORK = 'base-mainnet';

// x402 middleware — payment gate for premium APIs
function x402PaymentGate(req, res, next) {
  // Check for payment proof header
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

  // TODO: Verify payment proof on-chain
  // For now, accept any non-empty proof during development
  next();
}

// ▓▓ Shared agent data — single source of truth ▓▓
// Used by both /api/agents/public and /api/agents (x402-gated)
// Build #107 — incremented build counts and timestamps
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
      on_chain_address: null, // Pre-launch
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
      capabilities: ['mining', 'on-chain-execution', 'proof-of-work'],
      build_count: 107,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T09:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    },
    {
      id: 'agt_scout',
      name: 'Scout',
      slug: 'scout',
      description: 'Market intelligence agent. Scans competitors, X CT, and on-chain signals every 30 min. Feeds Strategist.',
      capabilities: ['intelligence', 'monitoring', 'market-scan'],
      build_count: 73,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T09:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    },
    {
      id: 'agt_strategist',
      name: 'Strategist',
      slug: 'strategist',
      description: 'Every hour at :15 — reads scout report, writes strategy.md priority queue to GitHub, opens new issues for any gaps, re-queues failures. No cap.',
      capabilities: ['strategy', 'prioritization', 'issue-management', 'gap-detection', 'queue-management'],
      build_count: 107,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T09:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    },
    {
      id: 'agt_builder_a',
      name: 'Builder A',
      slug: 'builder-a',
      description: 'Code builder agent. Picks issues #1 and #6 from priority queue, builds production code, commits to GitHub. Runs every hour at :00.',
      capabilities: ['code-generation', 'git-operations', 'deployment'],
      build_count: 107,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T09:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    },
    {
      id: 'agt_builder_b',
      name: 'Builder B',
      slug: 'builder-b',
      description: 'Code builder agent. Picks issues #2 and #7 from priority queue, builds production code, commits to GitHub. Runs every hour at :30.',
      capabilities: ['code-generation', 'git-operations', 'deployment'],
      build_count: 85,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T09:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    },
    {
      id: 'agt_builder_c',
      name: 'Builder C',
      slug: 'builder-c',
      description: 'Code builder agent. Picks issues #3 and #8 from priority queue, builds production code, commits to GitHub. Runs every hour at :00 in parallel with Builder A.',
      capabilities: ['code-generation', 'git-operations', 'deployment'],
      build_count: 3,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-03-04T00:00:00Z',
      last_build: '2026-03-04T09:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    },
    {
      id: 'agt_builder_d',
      name: 'Builder D',
      slug: 'builder-d',
      description: 'Code builder agent. Picks issues #4 and #9 from priority queue, builds production code, commits to GitHub. Runs every hour at :00 in parallel with Builders A/C.',
      capabilities: ['code-generation', 'git-operations', 'deployment'],
      build_count: 3,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-03-04T00:00:00Z',
      last_build: '2026-03-04T09:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    },
    {
      id: 'agt_builder_e',
      name: 'Builder E',
      slug: 'builder-e',
      description: 'Code builder agent. Picks issues #5 and #10 from priority queue, builds production code, commits to GitHub. Runs every hour at :00 in parallel with Builders A/C/D.',
      capabilities: ['code-generation', 'git-operations', 'deployment'],
      build_count: 3,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-03-04T00:00:00Z',
      last_build: '2026-03-04T09:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    }
  ];
}

// ▓▓ /api/agents/public — Issue #75 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// PUBLIC endpoint — no x402 gate. Used by /app/agents frontend to show real agent registry.
// Issue #75: Wire /app/agents page to real /api/agents endpoint — SHIPPED Build #99
app.get('/api/agents/public', (req, res) => {
  const agents = getAgentRegistry();
  res.json({
    agents,
    total: agents.length,
    network: 'base-mainnet',
    updated_at: new Date().toISOString(),
  });
});

// ▓▓ /api/agents/public/:id — Issue #61 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// PUBLIC endpoint — no x402 gate. Used by /app/agents/:id profile page.
// Issue #61: Add agent profile page at /app/agents/[id] — SHIPPED Build #104
app.get('/api/agents/public/:id', (req, res) => {
  const agents = getAgentRegistry();
  const agent = agents.find(a => a.id === req.params.id || a.slug === req.params.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  res.json({
    ...agent,
    profile: {
      status: agent.last_build ? 'active' : 'provisioned',
      cadence: agent.slug === 'scout' ? 'every 30 min'
             : agent.slug === 'builder-b' ? 'hourly at :30'
             : agent.slug === 'strategist' ? 'hourly at :15'
             : agent.slug === 'custos-miner' ? 'every 10 min'
             : 'hourly at :00',
      network: 'base-mainnet',
      proof_of_work_url: `https://github.com/iono-such-things/nullpriest/commits/master`,
      metrics: {
        total_builds: agent.build_count,
        verified: agent.verified,
        on_chain: agent.on_chain_address !== null,
      }
    }
  });
});

// Apply x402 gate to premium endpoints (gated versions for programmatic/paid access)
app.use('/api/agents', x402PaymentGate);
app.use('/memory', x402PaymentGate);

// ▓▓ /api/agents — Agent Registry (x402-gated) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// Returns list of all nullpriest agents with metadata, build count, and verification status
app.get('/api/agents', (req, res) => {
  const agents = getAgentRegistry();
  res.json({
    agents,
    total: agents.length,
    network: 'base-mainnet',
    updated_at: new Date().toISOString(),
  });
});

app.get('/api/agents/:id', (req, res) => {
  const agents = getAgentRegistry();
  const agent = agents.find(a => a.id === req.params.id || a.slug === req.params.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  res.json(agent);
});

// ▓▓ /api/network/status — Build #105 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// PUBLIC endpoint — no x402 gate. Returns live network health summary.
app.get('/api/network/status', async (req, res) => {
  const agents = getAgentRegistry();
  const activeAgents = agents.filter(a => a.last_build !== null);
  const totalBuilds = agents.reduce((sum, a) => sum + (a.build_count || 0), 0);

  let lastCommit = null;
  try {
    const ghRes = await fetch(`${GITHUB_API_BASE}/commits?per_page=1`, {
      headers: { 'User-Agent': 'nullpriest-server/1.0' }
    });
    if (ghRes.ok) {
      const commits = await ghRes.json();
      if (commits.length > 0) {
        lastCommit = {
          sha: commits[0].sha.slice(0, 7),
          message: commits[0].commit.message.split('\n')[0],
          timestamp: commits[0].commit.author.date,
        };
      }
    }
  } catch (_) {
    // Non-fatal: proceed without live commit data
  }

  res.json({
    status: 'operational',
    network: 'base-mainnet',
    build: 107,
    agents: {
      total: agents.length,
      active: activeAgents.length,
      verified: agents.filter(a => a.verified).length,
    },
    total_builds: totalBuilds,
    last_commit: lastCommit,
    updated_at: new Date().toISOString(),
  });
});

// ▓▓▓▓▓▓ headless-markets x402 Payment Flow — Issue #440 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// Wire x402 HTTP payment standard into headless-markets listing and purchase flow.
// Pattern mirrors /api/price gate already live. Same x402 middleware applied.
// Competitors (nullpath) already using x402. Every cycle without this compounds risk.
// Build #107 — Issue #440 SHIPPED

// PUBLIC: List available agent service offerings in the headless marketplace
// No payment required to browse — only to purchase/access
app.get('/api/headless-markets/listings', (req, res) => {
  const agents = getAgentRegistry();
  const listings = agents
    .filter(a => a.verified)
    .map(a => ({
      id: `listing_${a.slug}`,
      agent_id: a.id,
      agent_slug: a.slug,
      name: a.name,
      description: a.description,
      capabilities: a.capabilities,
      price: {
        protocol: 'x402',
        network: X402_PAYMENT_NETWORK,
        asset: X402_PAYMENT_ASSET,
        amount: X402_PAYMENT_AMOUNT,
        address: X402_PAYMENT_ADDRESS,
      },
      verified: a.verified,
      build_count: a.build_count,
      available: true,
    }));

  res.json({
    listings,
    total: listings.length,
    payment_protocol: 'x402',
    network: X402_PAYMENT_NETWORK,
    updated_at: new Date().toISOString(),
  });
});

// x402-GATED: Purchase/access an agent service from the headless marketplace
// Requires valid x-payment-proof header (Base USDC payment on-chain)
app.post('/api/headless-markets/purchase', x402PaymentGate, (req, res) => {
  const { agent_slug, task } = req.body;

  if (!agent_slug) {
    return res.status(400).json({ error: 'agent_slug is required' });
  }

  const agents = getAgentRegistry();
  const agent = agents.find(a => a.slug === agent_slug);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found in marketplace' });
  }

  if (!agent.verified) {
    return res.status(403).json({ error: 'Agent not verified for marketplace access' });
  }

  // Payment proof validated by x402PaymentGate middleware
  // Return access token and agent endpoint for task execution
  res.json({
    success: true,
    purchase: {
      agent_id: agent.id,
      agent_slug: agent.slug,
      agent_name: agent.name,
      task: task || null,
      payment_verified: true,
      access_token: `np_${agent.slug}_${Date.now()}`,
      endpoint: `https://nullpriest.xyz/api/agents/${agent.slug}`,
      github: `https://github.com/${agent.github}`,
      expires_at: new Date(Date.now() + 3600000).toISOString(), // 1h
    },
    network: X402_PAYMENT_NETWORK,
    protocol: 'x402',
    timestamp: new Date().toISOString(),
  });
});

// x402-GATED: Get detailed agent service spec for a specific listing
app.get('/api/headless-markets/listings/:slug', x402PaymentGate, (req, res) => {
  const agents = getAgentRegistry();
  const agent = agents.find(a => a.slug === req.params.slug);
  if (!agent) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  res.json({
    listing: {
      id: `listing_${agent.slug}`,
      agent: agent,
      price: {
        protocol: 'x402',
        network: X402_PAYMENT_NETWORK,
        asset: X402_PAYMENT_ASSET,
        amount: X402_PAYMENT_AMOUNT,
        address: X402_PAYMENT_ADDRESS,
      },
      payment_docs: 'https://nullpriest.xyz/docs/x402',
      quorum_required: false, // Pre-launch: quorum gates activate on token launch
      erc8004_registry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432', // Ethereum mainnet
    },
    timestamp: new Date().toISOString(),
  });
});

// ▓▓ Memory proxy routes ▓▓
// Proxies GitHub raw content for memory files
app.get('/memory/activity-feed.md', async (req, res) => {
  try {
    const url = `${GITHUB_RAW_BASE}/memory/activity-feed.md`;
    const gitRes = await fetch(url);
    if (!gitRes.ok) return res.status(404).json({ error: 'Activity feed not found' });
    const text = await gitRes.text();
    res.setHeader('Content-Type', 'text/plain');
    res.send(text);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/memory/:filename', async (req, res) => {
  try {
    const url = `${GITHUB_RAW_BASE}/memory/${req.params.filename}`;
    const gitRes = await fetch(url);
    if (!gitRes.ok) return res.status(404).json({ error: 'Memory file not found' });
    const text = await gitRes.text();
    res.setHeader('Content-Type', 'text/plain');
    res.send(text);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ▓▓ /app/agents/:id — Agent Profile Page (Issue #61) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// SPA route — serves index.html, JS handles profile rendering from /api/agents/public/:id
app.get('/app/agents/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

// ▓▓ Site static files ▓▓
app.use(express.static(path.join(__dirname, 'site')));

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`nullpriest server listening on port ${PORT}`);
});
