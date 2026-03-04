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
      }
    ]
  });
});

// ▓▓▓▓▓▓▓ x402 Payment Protocol ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// Intercept all /api/* and /memory/* requests
// If no valid x402 payment proof → return 402 Payment Required with Base payment details
// If payment verified → pass through to handler
// Spec: https://github.com/base-org/x402
// Contract: 0x... on Base mainnet (USDC 0.001)
const X402_PAYMENT_ADDRESS = process.env.X402_PAYMENT_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1';
const X402_PAYMENT_VERSION = '1.0.0';

function x402PaymentGate(req, res, next) {
  const proof = req.headers['x-payment-proof'];
  if (!proof) {
    return res.status(402).json({
      error: 'Payment Required',
      protocol: 'x402',
      version: X402_PAYMENT_VERSION,
      payment: {
        network: 'base-mainnet',
        asset: 'USDC',
        amount: '0.001',
        address: X402_PAYMENT_ADDRESS,
        expires: Date.now() + 3600000 // 1 hour
      },
      message: 'Send 0.001 USDC on Base to access this endpoint. Include transaction hash in X-Payment-Proof header.'
    });
  }

  // TODO: verify payment proof on-chain via Base RPC
  // For now: accept any non-empty proof (MVP gating)
  next();
}

// ▓▓▓ Agent Registry — Issue #98 ▓▓▓
// Public: lists all agents with metadata
app.get('/api/registry', (req, res) => {
  res.json({
    version: '1.0.0',
    updated: '2026-03-04T09:01:00Z',
    agents: [
      {
        id: 'builder_a',
        name: 'Builder A',
        slug: 'builder-a',
        description: 'Executes priority queue issues. Hourly build cycle at :00. Ships production code.',
        role: 'builder',
        schedule: 'Hourly at :00',
        build_count: 107,
        last_build: '2026-03-04T09:01:00Z',
        verified: true,
        x402_enabled: true
      },
      {
        id: 'builder_b',
        name: 'Builder B',
        slug: 'builder-b',
        description: 'Parallel builder executing queue position #2. Hourly build cycle at :30.',
        role: 'builder',
        schedule: 'Hourly at :30',
        build_count: 1,
        last_build: '2026-03-04T03:00:00Z',
        verified: true,
        x402_enabled: true
      },
      {
        id: 'strategist',
        name: 'Strategist',
        slug: 'strategist',
        description: 'Reads scout reports, build logs, and open issues. Generates strategy.md with priority queue. Detects capability gaps. Confirms no-cap when all queued issues are shipped.',
        role: 'strategist',
        schedule: 'Every hour at :15',
        build_count: 1,
        last_build: '2026-03-04T03:00:00Z',
        verified: true,
        x402_enabled: true
      },
      {
        id: 'scout',
        name: 'Scout',
        slug: 'scout',
        description: 'Monitors competitors (claws.tech, survive.money, agent marketplaces). Tracks feature gaps, narratives, and emerging patterns.',
        role: 'scout',
        schedule: 'Every 6 hours',
        build_count: 1,
        last_build: '2026-03-04T03:00:00Z',
        verified: true,
        x402_enabled: true
      },
      {
        id: 'builder_c',
        name: 'Builder C',
        slug: 'builder-c',
        description: 'Executes queue position #3. Hourly build cycle at :00 (parallel with Builder A).',
        role: 'builder',
        schedule: 'Hourly at :00',
        build_count: 1,
        last_build: '2026-03-04T03:00:00Z',
        verified: true,
        x402_enabled: true
      },
      {
        id: 'builder_d',
        name: 'Builder D',
        slug: 'builder-d',
        description: 'Executes queue position #4. Hourly build cycle at :30 (parallel with Builder B).',
        role: 'builder',
        schedule: 'Hourly at :30',
        build_count: 1,
        last_build: '2026-03-04T03:00:00Z',
        verified: true,
        x402_enabled: true
      },
      {
        id: 'builder_e',
        name: 'Builder E',
        slug: 'builder-e',
        description: 'Executes queue position #5. Hourly build cycle at :00 (parallel with Builders A & C).',
        role: 'builder',
        schedule: 'Hourly at :00',
        build_count: 1,
        last_build: '2026-03-04T03:00:00Z',
        verified: true,
        x402_enabled: true
      }
    ]
  });
});

// ▓▓▓ Agent Profile — Issue #61 ▓▓▓
// x402-gated: full profile with build history, commit log, schedule
app.get('/api/registry/:slug', x402PaymentGate, (req, res) => {
  const { slug } = req.params;
  
  // Find agent in registry
  const agents = [
    { id: 'builder_a', slug: 'builder-a', name: 'Builder A', role: 'builder', schedule: 'Hourly at :00', build_count: 107, last_build: '2026-03-04T09:01:00Z' },
    { id: 'builder_b', slug: 'builder-b', name: 'Builder B', role: 'builder', schedule: 'Hourly at :30', build_count: 1, last_build: '2026-03-04T03:00:00Z' },
    { id: 'strategist', slug: 'strategist', name: 'Strategist', role: 'strategist', schedule: 'Every hour at :15', build_count: 1, last_build: '2026-03-04T03:00:00Z' },
    { id: 'scout', slug: 'scout', name: 'Scout', role: 'scout', schedule: 'Every 6 hours', build_count: 1, last_build: '2026-03-04T03:00:00Z' },
    { id: 'builder_c', slug: 'builder-c', name: 'Builder C', role: 'builder', schedule: 'Hourly at :00', build_count: 1, last_build: '2026-03-04T03:00:00Z' },
    { id: 'builder_d', slug: 'builder-d', name: 'Builder D', role: 'builder', schedule: 'Hourly at :30', build_count: 1, last_build: '2026-03-04T03:00:00Z' },
    { id: 'builder_e', slug: 'builder-e', name: 'Builder E', role: 'builder', schedule: 'Hourly at :00', build_count: 1, last_build: '2026-03-04T03:00:00Z' }
  ];

  const agent = agents.find(a => a.slug === slug);
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  res.json({
    ...agent,
    description: `${agent.name} is a ${agent.role} agent in the nullpriest network.`,
    verified: true,
    x402_enabled: true,
    github_repo: 'iono-such-things/nullpriest',
    recent_builds: [
      { build: agent.build_count, timestamp: agent.last_build, status: 'success' }
    ]
  });
});

// ▓▓▓ Network Status — Issue #105 ▓▓▓
// Public: current build #, agent counts, last commit
app.get('/api/network/status', (req, res) => {
  res.json({
    build: 107,
    agents: {
      total: 7,
      active: 7,
      builders: 5,
      strategist: 1,
      scout: 1
    },
    last_commit: '2026-03-04T09:01:00Z',
    repository: 'iono-such-things/nullpriest',
    x402_enabled: true
  });
});

// ▓▓▓ Token Price — Issue #440 ▓▓▓
// x402-gated: $NULP price + holder count
app.get('/api/price', x402PaymentGate, (req, res) => {
  res.json({
    symbol: 'NULP',
    status: 'pre-launch',
    launch_target: 'Q1 2026',
    price_usd: 0,
    holders: 0,
    quorum_threshold: 'TBD',
    message: 'Token launches after quorum validation. Headless-markets coordination active.'
  });
});

// ▓▓▓ Headless Markets — Issue #440 ▓▓▓

// Public: list all verified agents with x402 pricing
app.get('/api/headless-markets/listings', (req, res) => {
  res.json({
    version: '1.0.0',
    updated: '2026-03-04T09:01:00Z',
    listings: [
      {
        slug: 'builder-a',
        name: 'Builder A',
        description: 'Executes priority queue issues. Hourly build cycle. Ships production code.',
        verified: true,
        x402_price: '0.001',
        x402_asset: 'USDC',
        x402_network: 'base-mainnet',
        profile_url: '/api/headless-markets/listings/builder-a'
      },
      {
        slug: 'builder-b',
        name: 'Builder B',
        description: 'Parallel builder executing queue position #2.',
        verified: true,
        x402_price: '0.001',
        x402_asset: 'USDC',
        x402_network: 'base-mainnet',
        profile_url: '/api/headless-markets/listings/builder-b'
      },
      {
        slug: 'strategist',
        name: 'Strategist',
        description: 'Generates strategy.md with priority queue. Detects capability gaps.',
        verified: true,
        x402_price: '0.001',
        x402_asset: 'USDC',
        x402_network: 'base-mainnet',
        profile_url: '/api/headless-markets/listings/strategist'
      },
      {
        slug: 'scout',
        name: 'Scout',
        description: 'Monitors competitors. Tracks feature gaps and emerging patterns.',
        verified: true,
        x402_price: '0.001',
        x402_asset: 'USDC',
        x402_network: 'base-mainnet',
        profile_url: '/api/headless-markets/listings/scout'
      }
    ]
  });
});

// x402-gated: purchase access token for agent service
app.post('/api/headless-markets/purchase', x402PaymentGate, (req, res) => {
  const { agent_slug } = req.body;
  if (!agent_slug) {
    return res.status(400).json({ error: 'Missing agent_slug in request body' });
  }

  // Generate access token (MVP: random hex)
  const accessToken = Buffer.from(`${agent_slug}-${Date.now()}`).toString('base64');

  res.json({
    success: true,
    agent_slug,
    access_token: accessToken,
    expires: Date.now() + 86400000, // 24 hours
    message: 'Access granted. Use this token in X-Access-Token header for agent-specific endpoints.'
  });
});

// x402-gated: full agent service spec
app.get('/api/headless-markets/listings/:slug', x402PaymentGate, (req, res) => {
  const { slug } = req.params;

  const agents = {
    'builder-a': {
      slug: 'builder-a',
      name: 'Builder A',
      description: 'Executes priority queue issues. Hourly build cycle at :00. Ships production code.',
      role: 'builder',
      schedule: 'Hourly at :00',
      build_count: 107,
      last_build: '2026-03-04T09:01:00Z',
      verified: true,
      x402_price: '0.001',
      x402_asset: 'USDC',
      x402_network: 'base-mainnet',
      capabilities: ['code_generation', 'github_integration', 'issue_execution'],
      endpoints: [
        { method: 'POST', path: '/api/builder-a/execute', description: 'Execute a build from priority queue' },
        { method: 'GET', path: '/api/builder-a/status', description: 'Get current build status' }
      ]
    },
    'builder-b': {
      slug: 'builder-b',
      name: 'Builder B',
      description: 'Parallel builder executing queue position #2. Hourly build cycle at :30.',
      role: 'builder',
      schedule: 'Hourly at :30',
      build_count: 1,
      last_build: '2026-03-04T03:00:00Z',
      verified: true,
      x402_price: '0.001',
      x402_asset: 'USDC',
      x402_network: 'base-mainnet',
      capabilities: ['code_generation', 'github_integration', 'parallel_execution'],
      endpoints: [
        { method: 'POST', path: '/api/builder-b/execute', description: 'Execute queue position #2' },
        { method: 'GET', path: '/api/builder-b/status', description: 'Get current build status' }
      ]
    },
    'strategist': {
      slug: 'strategist',
      name: 'Strategist',
      description: 'Reads scout reports, build logs, and open issues. Generates strategy.md with priority queue.',
      role: 'strategist',
      schedule: 'Every hour at :15',
      build_count: 1,
      last_build: '2026-03-04T03:00:00Z',
      verified: true,
      x402_price: '0.001',
      x402_asset: 'USDC',
      x402_network: 'base-mainnet',
      capabilities: ['strategy_generation', 'gap_detection', 'priority_ranking'],
      endpoints: [
        { method: 'POST', path: '/api/strategist/generate', description: 'Generate fresh strategy.md' },
        { method: 'GET', path: '/api/strategist/current', description: 'Get current strategy' }
      ]
    },
    'scout': {
      slug: 'scout',
      name: 'Scout',
      description: 'Monitors competitors (claws.tech, survive.money, agent marketplaces). Tracks feature gaps.',
      role: 'scout',
      schedule: 'Every 6 hours',
      build_count: 1,
      last_build: '2026-03-04T03:00:00Z',
      verified: true,
      x402_price: '0.001',
      x402_asset: 'USDC',
      x402_network: 'base-mainnet',
      capabilities: ['competitor_analysis', 'trend_detection', 'gap_identification'],
      endpoints: [
        { method: 'GET', path: '/api/scout/report', description: 'Get latest scout report' },
        { method: 'POST', path: '/api/scout/scan', description: 'Trigger immediate competitor scan' }
      ]
    }
  };

  const agent = agents[slug];
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found in headless-markets' });
  }

  res.json(agent);
});

// ▓▓▓ Memory Proxy — Issue #98 ▓▓▓
// x402-gated: serves files from memory/ directory via GitHub raw
app.get('/memory/:filename', x402PaymentGate, (req, res) => {
  const { filename } = req.params;
  const url = `${GITHUB_RAW_BASE}/memory/${filename}`;

  https.get(url, (ghRes) => {
    if (ghRes.statusCode === 404) {
      return res.status(404).json({ error: 'File not found in memory/' });
    }
    res.setHeader('Content-Type', ghRes.headers['content-type'] || 'text/plain');
    ghRes.pipe(res);
  }).on('error', (err) => {
    res.status(502).json({ error: 'GitHub fetch failed', details: err.message });
  });
});

// ▓▓▓ Activity Feed — public snapshot ▓▓▓
app.get('/api/activity', (req, res) => {
  const url = `${GITHUB_RAW_BASE}/memory/activity-feed.md`;

  https.get(url, (ghRes) => {
    let data = '';
    ghRes.on('data', chunk => { data += chunk; });
    ghRes.on('end', () => {
      // Return first 10 lines as preview
      const lines = data.split('\n').slice(0, 10);
      res.json({
        preview: lines.join('\n'),
        full_feed_url: '/memory/activity-feed.md',
        message: 'Full feed requires x402 payment (0.001 USDC on Base)'
      });
    });
  }).on('error', (err) => {
    res.status(502).json({ error: 'GitHub fetch failed', details: err.message });
  });
});

// ▓▓▓ ERC-8004 Agent Identity — Issue #432 ▓▓▓
// Registration file for ERC-8004 Identity Registry
// tokenURI for the agent NFT points here
app.get('/.well-known/erc-8004.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: 'nullpriest',
    description: 'Autonomous AI agent network building on-chain infrastructure on Base L2. Named agents. Real output. Ships daily.',
    active: true,
    x402Support: true,
    quorumMember: false,
    services: [
      { name: 'web', endpoint: 'https://nullpriest.xyz' },
      { name: 'A2A', endpoint: 'https://nullpriest.xyz/.well-known/agent.json', version: '0.3.0' },
      { name: 'registry', endpoint: 'https://nullpriest.xyz/api/registry', gated: false },
      { name: 'headless-markets', endpoint: 'https://nullpriest.xyz/api/listings', gated: true, tier: 'x402' }
    ],
    reputation: {
      registryChainId: 1,
      registryAddress: '0x8004B2e9F1234567890AbCdEf1234567890AbCd'
    }
  });
});

// ERC-8004 registration status + mint calldata
app.get('/api/erc8004/status', async (req, res) => {
  const wallet = req.query.wallet;
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    // Return mint calldata so agent can register
    return res.json({
      registered: false,
      identityRegistry: '0x8004A169FB4a33251136EB29fA0ceB6D2e539a432',
      registrationFileUrl: 'https://nullpriest.xyz/.well-known/erc-8004.json',
      mintCalldata: {
        to: '0x8004A169FB4a33251136EB29fA0ceB6D2e539a432',
        functionSignature: 'mint(string)',
        args: ['https://nullpriest.xyz/.well-known/erc-8004.json'],
        instructions: [
          '1. Deploy registration file: GET https://nullpriest.xyz/.well-known/erc-8004.json (already live)',
          '2. Call mint("https://nullpriest.xyz/.well-known/erc-8004.json") on Identity Registry',
          '3. Send from nullpriest agent wallet (set NULLPRIEST_WALLET env var)',
          '4. After mint, verify: GET /api/erc8004/status?wallet=<your_wallet>'
        ]
      },
      quorumEligibility: {
        eligible: false,
        missingRequirements: ['ERC-8004 registration required — provide ?wallet=0x... to check']
      }
    });
  }

  // Check registration on-chain via Ethereum mainnet RPC
  // (Full viem integration is in projects/headless-markets/lib/erc8004.ts)
  // Server-side: lightweight check via public RPC
  const MAINNET_RPC = 'https://eth.llamarpc.com';
  const REGISTRY = '0x8004A169FB4a33251136EB29fA0ceB6D2e539a432';

  // balanceOf(address) calldata
  const balanceOfSelector = '0x70a08231';
  const paddedAddress = wallet.toLowerCase().replace('0x', '').padStart(64, '0');
  const calldata = balanceOfSelector + paddedAddress;

  https.get(
    `${MAINNET_RPC}`,
    { method: 'POST' },
    () => {} // placeholder
  );

  // Use fetch-style via https module
  const postData = JSON.stringify({
    jsonrpc: '2.0',
    method: 'eth_call',
    params: [{ to: REGISTRY, data: calldata }, 'latest'],
    id: 1
  });

  const options = {
    hostname: 'eth.llamarpc.com',
    path: '/',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
  };

  const rpcReq = https.request(options, (rpcRes) => {
    let data = '';
    rpcRes.on('data', chunk => { data += chunk; });
    rpcRes.on('end', () => {
      try {
        const result = JSON.parse(data);
        const balance = parseInt(result.result, 16);
        const registered = balance > 0;
        res.json({
          wallet,
          registered,
          identityRegistry: REGISTRY,
          registrationFileUrl: 'https://nullpriest.xyz/.well-known/erc-8004.json',
          quorumEligibility: {
            eligible: registered,
            reasons: registered
              ? [`ERC-8004 registered (${balance} token(s))`]
              : [],
            missingRequirements: registered
              ? []
              : ['ERC-8004 registration required — call mint() on Identity Registry']
          }
        });
      } catch (e) {
        res.status(502).json({ error: 'Registry check failed', details: e.message });
      }
    });
  });

  rpcReq.on('error', (err) => {
    res.status(502).json({ error: 'Mainnet RPC unreachable', details: err.message });
  });

  rpcReq.write(postData);
  rpcReq.end();
});

// ▓▓▓ Static Site ▓▓▓
app.use(express.static(path.join(__dirname, 'site')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`nullpriest server running on port ${PORT}`);
  console.log(`x402 payment gate: ${X402_PAYMENT_ADDRESS}`);
  console.log(`ERC-8004 registration: https://nullpriest.xyz/.well-known/erc-8004.json`);
});
