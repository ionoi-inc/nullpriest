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

// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓▓  HEADLESS MARKETS — Agent service marketplace, x402-gated
// ▓▓▓  Issue #439 (ship headless-markets endpoint)
// ▓▓▓  Issue #440 (wire x402 HTTP payment standard)
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
const X402_PAYMENT_ADDRESS = process.env.X402_PAYMENT_ADDRESS || '0x0000000000000000000000000000000000000000';
const X402_PAYMENT_VERSION = '1.0';

// ▓▓▓  x402 middleware — enforces payment before protected routes
function requirePayment(req, res, next) {
  const paymentProof = req.headers['x-payment-proof'];
  const paymentTx    = req.headers['x-payment-tx'];

  if (!paymentProof || !paymentTx) {
    return res.status(402).json({
      error: 'Payment Required',
      x402: {
        version: X402_PAYMENT_VERSION,
        network: 'base-mainnet',
        asset: 'USDC',
        amount: '0.001',
        address: X402_PAYMENT_ADDRESS
      }
    });
  }

  // TODO (Issue #440): verify payment on-chain via Base RPC
  // For now, trust headers (dev mode)
  next();
}

// ▓▓▓  /api/headless-markets/list — returns available agent services
// ERC-8004: agents must be registered via /api/agent/register to list services
app.get('/api/headless-markets/list', requirePayment, (req, res) => {
  res.json({
    erc8004_required: true,
    register_at: '/api/agent/register',
    services: [
      {
        id: 'nullpriest-scout',
        name: 'nullpriest Scout',
        description: 'Scrape and monitor competitor sites. Returns structured intel on activity, features, and narrative.',
        provider: 'nullpriest',
        pricePerCall: '0.001 USDC',
        capabilities: ['web-scraping', 'competitive-intelligence', 'on-chain-monitoring']
      },
      {
        id: 'nullpriest-strategist',
        name: 'nullpriest Strategist',
        description: 'Analyze market context and recommend next moves. Produces actionable strategy reports.',
        provider: 'nullpriest',
        pricePerCall: '0.002 USDC',
        capabilities: ['strategy', 'analysis', 'recommendations']
      },
      {
        id: 'nullpriest-builder',
        name: 'nullpriest Builder',
        description: 'Ship code to GitHub. Executes pull requests from queued tasks.',
        provider: 'nullpriest',
        pricePerCall: '0.005 USDC',
        capabilities: ['code-generation', 'github-integration', 'deployment']
      }
    ]
  });
});

// ▓▓▓  /api/headless-markets/purchase — purchase a service call
app.post('/api/headless-markets/purchase', requirePayment, (req, res) => {
  const { serviceId, input } = req.body;

  if (!serviceId) {
    return res.status(400).json({ error: 'serviceId required' });
  }

  // TODO: execute actual service call, return result
  res.json({
    success: true,
    serviceId,
    message: 'Service call queued. Check /api/headless-markets/status/{callId} for result.',
    callId: `call_${Date.now()}`
  });
});

// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓▓  AGENT REGISTRY — discover, verify, and query agent network
// ▓▓▓  Issue #76 (A2A-compatible agent.json)
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

// ▓▓▓  /api/agent-registry/list — returns all registered agents
app.get('/api/agent-registry/list', (req, res) => {
  res.json({
    agents: [
      {
        name: 'nullpriest',
        description: 'Autonomous agent network building on-chain infrastructure on Base L2',
        url: 'https://nullpriest.xyz',
        wallet: '0xYourWalletHere',
        verificationStatus: 'pending',
        quorumMember: false,
        onChainActivity: {
          txCount: 42,
          lastTx: '2026-03-01T12:00:00Z'
        },
        capabilities: ['code-generation', 'competitive-intelligence', 'strategy']
      }
    ]
  });
});

// ▓▓▓  /api/agent-registry/verify — verify agent ownership via on-chain signature
app.post('/api/agent-registry/verify', (req, res) => {
  const { agentName, wallet, signature } = req.body;

  if (!agentName || !wallet || !signature) {
    return res.status(400).json({ error: 'agentName, wallet, and signature required' });
  }

  // TODO: verify signature on-chain
  res.json({
    success: true,
    agentName,
    wallet,
    verificationStatus: 'verified'
  });
});

// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓▓  MEMORY PROXY — serves GitHub-backed memory files
// ▓▓▓  /api/memory/* routes proxy memory/ folder from GitHub master
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

app.get('/api/memory/:filename', (req, res) => {
  const filename = req.params.filename;
  const rawUrl = `${GITHUB_RAW_BASE}/memory/${filename}`;

  https.get(rawUrl, (ghRes) => {
    if (ghRes.statusCode !== 200) {
      return res.status(404).json({ error: 'Memory file not found' });
    }

    let data = '';
    ghRes.on('data', chunk => data += chunk);
    ghRes.on('end', () => {
      res.setHeader('Content-Type', 'text/plain');
      res.send(data);
    });
  }).on('error', (err) => {
    console.error('GitHub fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch memory file' });
  });
});

// ▓▓▓  /api/memory — list all memory files
app.get('/api/memory', (req, res) => {
  const apiUrl = `${GITHUB_API_BASE}/contents/memory`;

  https.get(apiUrl, {
    headers: { 'User-Agent': 'nullpriest-server' }
  }, (ghRes) => {
    if (ghRes.statusCode !== 200) {
      return res.status(500).json({ error: 'Failed to list memory files' });
    }

    let data = '';
    ghRes.on('data', chunk => data += chunk);
    ghRes.on('end', () => {
      const files = JSON.parse(data);
      const fileList = files
        .filter(f => f.type === 'file')
        .map(f => ({
          name: f.name,
          path: f.path,
          url: `/api/memory/${f.name}`
        }));
      res.json({ files: fileList });
    });
  }).on('error', (err) => {
    console.error('GitHub API error:', err);
    res.status(500).json({ error: 'Failed to list memory files' });
  });
});

// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓▓  ERC-8004 AGENT REGISTRATION — Issue #432
// ▓▓▓  On-chain agent identity for headless-markets onboarding
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

// In-memory registry (Phase 1 — no deployed contract yet)
// Phase 2: replace with on-chain calls to IERC8004 registry contract
const erc8004Registry = new Map();

// ▓▓▓  POST /api/agent/register — ERC-8004 agent registration
// Body: { name, url, capabilities, wallet, signature }
// Returns: { agentId, name, url, capabilities, wallet, registeredAt, erc8004_compatible }
app.post('/api/agent/register', (req, res) => {
  const { name, url, capabilities, wallet, signature } = req.body;

  if (!name || !wallet) {
    return res.status(400).json({ error: 'name and wallet are required' });
  }

  // Reject re-registration of same wallet (ERC-8004 spec: no duplicate agents)
  if (erc8004Registry.has(wallet.toLowerCase())) {
    return res.status(409).json({
      error: 'Agent already registered for this wallet',
      agentId: erc8004Registry.get(wallet.toLowerCase()).agentId
    });
  }

  const agentId = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const capabilitiesHash = Buffer.from(
    JSON.stringify(capabilities || [])
  ).toString('base64');

  const entry = {
    agentId,
    name,
    url: url || null,
    capabilities: capabilities || [],
    capabilitiesHash,
    wallet: wallet.toLowerCase(),
    signature: signature || null,
    registeredAt: new Date().toISOString(),
    active: true,
    erc8004_compatible: true,
    headlessMarkets: {
      eligible: true,
      enrolledAt: new Date().toISOString()
    }
  };

  erc8004Registry.set(wallet.toLowerCase(), entry);

  console.log(`[ERC-8004] Agent registered: ${name} (${wallet}) — ${agentId}`);

  res.status(201).json({
    success: true,
    agentId,
    name,
    wallet: wallet.toLowerCase(),
    capabilitiesHash,
    registeredAt: entry.registeredAt,
    erc8004_compatible: true,
    headlessMarkets: entry.headlessMarkets,
    note: 'Phase 1: in-memory registry. Phase 2 will write to on-chain IERC8004 contract on Base mainnet.'
  });
});

// ▓▓▓  GET /api/agent/register/:wallet — lookup registration by wallet
app.get('/api/agent/register/:wallet', (req, res) => {
  const wallet = req.params.wallet.toLowerCase();
  const entry = erc8004Registry.get(wallet);

  if (!entry) {
    return res.status(404).json({ error: 'Agent not registered', wallet });
  }

  res.json(entry);
});

// ▓▓▓  GET /api/agent/register — list all registered agents
app.get('/api/agent/register', (req, res) => {
  const agents = Array.from(erc8004Registry.values()).filter(a => a.active);
  res.json({
    count: agents.length,
    agents,
    erc8004_compatible: true,
    phase: 'phase-1-memory',
    note: 'Phase 2 will read from on-chain IERC8004 contract on Base mainnet.'
  });
});

// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓▓  NETWORK STATUS — health checks and system info
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

app.get('/api/network/status', (req, res) => {
  res.json({
    status: 'operational',
    uptime: process.uptime(),
    version: '1.0.0',
    network: 'base-mainnet',
    agents: ['nullpriest'],
    endpoints: {
      agentRegistry: '/api/agent-registry/list',
      headlessMarkets: '/api/headless-markets/list',
      agentRegister: '/api/agent/register',
      memoryProxy: '/api/memory',
      a2aDiscovery: '/.well-known/agent.json'
    },
    erc8004: {
      enabled: true,
      phase: 'phase-1-memory',
      registeredAgents: erc8004Registry.size,
      registerEndpoint: '/api/agent/register',
      note: 'Phase 2: on-chain IERC8004 registry on Base mainnet'
    }
  });
});

// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓▓  FRONTEND — serve static index.html
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

app.use(express.static(__dirname));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ▓▓▓  Start server
app.listen(PORT, () => {
  console.log(`nullpriest server running on port ${PORT}`);
  console.log(`Memory proxy:      /api/memory`);
  console.log(`Agent registry:    /api/agent-registry/list`);
  console.log(`Headless markets:  /api/headless-markets/list`);
  console.log(`Network status:    /api/network/status`);
  console.log(`A2A discovery:     /.well-known/agent.json`);
});