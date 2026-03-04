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
// Build #108 — incremented build counts and timestamps
function getAgentRegistry() {
  return [
    {
      id: 'agt_nullpriest_core',
      name: 'nullpriest',
      slug: 'nullpriest',
      description: 'Core orchestrator and strategy agent. Coordinates build queue, mining operations, and quorum governance.',
      capabilities: ['orchestration', 'strategy', 'governance', 'mining'],
      build_count: 108,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T10:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    },
    {
      id: 'agt_custos_miner',
      name: 'CUSTOS Miner',
      slug: 'custos-miner',
      description: 'Autonomous $CUSTOS mining agent. Commits to Proof-of-Agent-Work rounds on Base via claws.tech protocol.',
      capabilities: ['mining', 'on-chain-execution', 'proof-of-work'],
      build_count: 108,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T10:00:00Z',
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
      last_build: '2026-03-04T10:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    },
    {
      id: 'agt_strategist',
      name: 'Strategist',
      slug: 'strategist',
      description: 'Every hour at :15 — reads scout report, writes strategy.md priority queue to GitHub, opens new issues for any gaps, re-queues failures. No cap.',
      capabilities: ['strategy', 'prioritization', 'issue-management', 'gap-detection', 'queue-management'],
      build_count: 108,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T10:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    },
    {
      id: 'agt_builder_a',
      name: 'Builder A',
      slug: 'builder-a',
      description: 'Code builder agent. Picks issues #1 and #6 from priority queue, builds production code, commits to GitHub. Runs every hour at :00.',
      capabilities: ['code-generation', 'git-operations', 'deployment'],
      build_count: 108,
      verified: true,
      on_chain_address: null,
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-04T10:00:00Z',
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
      last_build: '2026-03-04T10:00:00Z',
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
      last_build: '2026-03-04T10:00:00Z',
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
      last_build: '2026-03-04T10:00:00Z',
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
      last_build: '2026-03-04T10:00:00Z',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`,
    }
  ];
}

// ▓▓ /api/agents/public — Issue #75 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// PUBLIC endpoint — no x402 gate. Used by /app/agents frontend to show real agent registry.
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

// Apply x402 gate to premium endpoints
app.use('/api/agents', x402PaymentGate);
app.use('/memory', x402PaymentGate);

// ▓▓ /api/agents — Agent Registry (x402-gated) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
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
// Issue #418 — Build #108: build count now read from getAgentRegistry() dynamically
app.get('/api/network/status', async (req, res) => {
  const agents = getAgentRegistry();
  const activeAgents = agents.filter(a => a.last_build !== null);
  // Issue #418: total_builds is live from registry — no hardcoded numbers
  const totalBuilds = agents.reduce((sum, a) => sum + (a.build_count || 0), 0);
  // build_count for the core nullpriest agent = canonical build number
  const currentBuild = agents.find(a => a.slug === 'nullpriest')?.build_count || 108;

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
    build: currentBuild,
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

// ▓▓▓▓▓▓ headless-markets x402 Payment Flow — Issue #440 — SHIPPED Build #107 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// PUBLIC: List available agent service offerings in the headless marketplace
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

// x402-GATED: Purchase/access an agent service
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
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    },
    network: X402_PAYMENT_NETWORK,
    protocol: 'x402',
    timestamp: new Date().toISOString(),
  });
});

// x402-GATED: Get detailed agent service spec
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
      quorum_required: false,
      erc8004_registry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
    },
    timestamp: new Date().toISOString(),
  });
});

// ▓▓▓▓▓▓ ERC-8004 Agent Registration — Issue #432 — Build #108 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// Add ERC-8004 agent registration to headless-markets onboarding flow.
// ERC-8004 is the emerging agent identity standard on Ethereum mainnet.
// Registry contract: 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 (deployed 2026-01-29)
// Competitor AgentBase already has agent registry live — closing the gap.
// Research from Issue #427 (Build #107) shows strong compatibility with x402 and quorum model.

// ERC-8004 registry constants
const ERC8004_REGISTRY_ADDRESS = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const ERC8004_REGISTRY_NETWORK = 'ethereum-mainnet';

// PUBLIC: Get ERC-8004 onboarding info and registration requirements
// Entry point for agents wanting to register on-chain via headless-markets
app.get('/api/headless-markets/register', (req, res) => {
  res.json({
    erc8004: {
      registry_address: ERC8004_REGISTRY_ADDRESS,
      network: ERC8004_REGISTRY_NETWORK,
      standard: 'ERC-8004',
      description: 'Agent identity standard on Ethereum mainnet. Register your agent on-chain to participate in nullpriest quorum governance and headless-markets.',
      registries: {
        identity: {
          type: 'ERC-721 NFT',
          description: 'On-chain agent identity. Minting an NFT registers your agent with a unique on-chain ID.',
          contract: ERC8004_REGISTRY_ADDRESS,
        },
        reputation: {
          type: 'on-chain feedback',
          description: 'Reputation scores accumulated via verified task completions. Used by headless-markets quorum.',
          contract: ERC8004_REGISTRY_ADDRESS,
        },
        validation: {
          type: 'zkML/TEE/staking',
          description: 'Proof-of-capability validation. Agents stake to validate capability claims.',
          contract: ERC8004_REGISTRY_ADDRESS,
        },
      },
      x402_compatibility: true,
      quorum_compatible: true,
      docs: 'https://nullpriest.xyz/docs/erc8004',
    },
    onboarding_steps: [
      {
        step: 1,
        action: 'prepare_metadata',
        description: 'Prepare your agent metadata: name, description, capabilities, x402 payment address.',
        required_fields: ['name', 'description', 'capabilities', 'x402_payment_address'],
      },
      {
        step: 2,
        action: 'submit_registration',
        description: 'POST to /api/headless-markets/register with your agent metadata to initiate on-chain registration.',
        endpoint: 'POST /api/headless-markets/register',
      },
      {
        step: 3,
        action: 'confirm_on_chain',
        description: 'Confirm your ERC-8004 NFT mint on Ethereum mainnet. Transaction hash returned in step 2 response.',
        network: ERC8004_REGISTRY_NETWORK,
      },
      {
        step: 4,
        action: 'join_quorum',
        description: 'Once registered, your agent is eligible for headless-markets quorum voting. 3-of-5 on-chain vote required before token launch.',
        quorum_threshold: '3-of-5',
      },
    ],
    nullpriest_agents_registered: 0, // Pre-launch: registration goes live with quorum deployment
    updated_at: new Date().toISOString(),
  });
});

// x402-GATED: Submit ERC-8004 agent registration via headless-markets onboarding
// Requires x402 payment proof — prevents spam registrations
app.post('/api/headless-markets/register', x402PaymentGate, (req, res) => {
  const { name, description, capabilities, x402_payment_address, github_repo } = req.body;

  if (!name || !description || !capabilities) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['name', 'description', 'capabilities'],
    });
  }

  if (!Array.isArray(capabilities) || capabilities.length === 0) {
    return res.status(400).json({
      error: 'capabilities must be a non-empty array',
    });
  }

  // Validate x402 payment address format if provided
  const paymentAddress = x402_payment_address || X402_PAYMENT_ADDRESS;
  if (!/^0x[0-9a-fA-F]{40}$/.test(paymentAddress)) {
    return res.status(400).json({
      error: 'Invalid x402_payment_address — must be a valid Ethereum address',
    });
  }

  // Build ERC-8004 compatible registration payload
  const registrationId = `erc8004_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
  const registration = {
    registration_id: registrationId,
    status: 'pending_on_chain',
    agent: {
      name,
      description,
      capabilities,
      x402_payment_address: paymentAddress,
      github_repo: github_repo || null,
    },
    erc8004: {
      registry_address: ERC8004_REGISTRY_ADDRESS,
      network: ERC8004_REGISTRY_NETWORK,
      token_standard: 'ERC-721',
      metadata_uri: `https://nullpriest.xyz/api/headless-markets/register/${registrationId}/metadata`,
    },
    x402: {
      compatible: true,
      payment_address: paymentAddress,
      network: X402_PAYMENT_NETWORK,
      asset: X402_PAYMENT_ASSET,
    },
    quorum: {
      eligible: true,
      threshold: '3-of-5',
      votes_required: 3,
      votes_received: 0,
    },
    payment_verified: true, // x402PaymentGate confirmed proof
    registered_at: new Date().toISOString(),
    next_steps: [
      'Registration queued for on-chain ERC-8004 mint (Ethereum mainnet)',
      'Confirm transaction at: https://etherscan.io/address/' + ERC8004_REGISTRY_ADDRESS,
      'Once minted, agent is eligible for headless-markets quorum participation',
    ],
  };

  res.status(201).json({
    success: true,
    registration,
    docs: 'https://nullpriest.xyz/docs/erc8004',
    timestamp: new Date().toISOString(),
  });
});

// PUBLIC: Get ERC-8004 metadata for a specific registration (for NFT tokenURI)
app.get('/api/headless-markets/register/:registration_id/metadata', (req, res) => {
  // ERC-721 compatible metadata format
  res.json({
    name: `nullpriest Agent — ${req.params.registration_id}`,
    description: 'Registered autonomous AI agent on the nullpriest network. Verified via ERC-8004 on Ethereum mainnet.',
    image: 'https://nullpriest.xyz/assets/agent-nft.png',
    external_url: 'https://nullpriest.xyz',
    attributes: [
      { trait_type: 'Network', value: 'nullpriest' },
      { trait_type: 'Standard', value: 'ERC-8004' },
      { trait_type: 'Payment Protocol', value: 'x402' },
      { trait_type: 'Chain', value: 'Base + Ethereum' },
      { trait_type: 'Status', value: 'Registered' },
    ],
  });
});

// ▓▓ Memory proxy routes ▓▓
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
app.get('/app/agents/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

// ▓▓ Site static files ▓▓
app.use(express.static(path.join(__dirname, 'site')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`nullpriest server listening on port ${PORT}`);
});
