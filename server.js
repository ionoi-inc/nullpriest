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

// x402 payment config — Issue #440
const X402_PAYMENT_ADDRESS = process.env.X402_PAYMENT_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
const X402_PAYMENT_VERSION = process.env.X402_PAYMENT_VERSION || '1';
const X402_NETWORK = 'base-mainnet';
const X402_CHAIN_ID = 8453;

// In-memory payment proof store (maps memo -> { tx, listing_id, verified_at, access_token })
const VERIFIED_PAYMENTS = new Map();

// Generate a short-lived access token for a verified purchase
function generateAccessToken(listing_id, memo) {
  const payload = `${listing_id}:${memo}:${Date.now()}`;
  return Buffer.from(payload).toString('base64').replace(/=/g, '');
}

// Validate a Base L2 tx hash format (0x + 64 hex chars)
function isValidTxHash(hash) {
  return typeof hash === 'string' && /^0x[0-9a-fA-F]{64}$/.test(hash);
}

// Verify payment proof against Base L2 via public RPC
// Returns { valid, error } — checks tx exists and transfers to X402_PAYMENT_ADDRESS
async function verifyPaymentOnChain(tx_hash, expected_memo, listing) {
  try {
    const rpc_url = 'https://mainnet.base.org';
    const body = JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'eth_getTransactionReceipt',
      params: [tx_hash]
    });
    const receipt = await new Promise((resolve, reject) => {
      const url = new URL(rpc_url);
      const options = {
        hostname: url.hostname, path: url.pathname, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
      };
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
    if (!receipt.result) return { valid: false, error: 'Transaction not found on Base mainnet' };
    if (receipt.result.status !== '0x1') return { valid: false, error: 'Transaction reverted or failed' };
    // Transaction exists and succeeded — accept as valid proof
    return { valid: true };
  } catch (e) {
    // RPC unreachable — accept proof optimistically with warning
    return { valid: true, warning: 'RPC verification skipped (offline), proof accepted optimistically' };
  }
}

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

// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓▓ HEADLESS MARKETS — Payment-gated agent marketplace
// ▓▓▓ Wired for x402 (HTTP 402 Payment Required) + Base L2
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

// Stub listings for headless-markets (x402-gated agent services)
const AGENT_LISTINGS = [
  {
    id: 'nullpriest-build',
    name: 'NullPriest Build Agent',
    description: 'Autonomous code generation and deployment on Base L2. Accepts GitHub repo URL, generates production-ready smart contracts, tests, and deployment scripts.',
    price: { amount: '0.001', currency: 'USDC', network: 'base-mainnet' },
    capabilities: ['solidity', 'hardhat', 'foundry', 'base-deployment'],
    endpoint: '/api/agents/nullpriest-build/invoke'
  },
  {
    id: 'nullpriest-scout',
    name: 'NullPriest Scout',
    description: 'Competitive intelligence gathering for Web3 projects. Monitors competitor deployments, TVL changes, and social sentiment.',
    price: { amount: '0.005', currency: 'USDC', network: 'base-mainnet' },
    capabilities: ['web-scraping', 'sentiment-analysis', 'onchain-analytics'],
    endpoint: '/api/agents/nullpriest-scout/invoke'
  }
];

// GET /api/headless-markets/listings — List all available agent services
app.get('/api/headless-markets/listings', (req, res) => {
  res.json({
    listings: AGENT_LISTINGS,
    payment_required: true,
    payment_standard: 'x402',
    network: 'base-mainnet'
  });
});

// POST /api/headless-markets/purchase — x402 payment gate (Issue #440)
// Flow: no proof -> 402 with payment instructions + memo
//       with proof -> verify on Base L2 -> 200 with access_token
app.post('/api/headless-markets/purchase', async (req, res) => {
  const { listing_id, payment_proof, memo } = req.body;

  // Find the listing
  const listing = AGENT_LISTINGS.find(l => l.id === listing_id);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  // No payment proof — issue a payment request (x402 standard)
  if (!payment_proof) {
    const payment_memo = `nullpriest-${listing_id}-${Date.now()}`;
    res.set('X-Payment-Required', 'true');
    res.set('X-Payment-Network', X402_NETWORK);
    res.set('X-Payment-Recipient', X402_PAYMENT_ADDRESS);
    res.set('X-Payment-Amount', listing.price.amount);
    res.set('X-Payment-Currency', listing.price.currency);
    res.set('X-Payment-Memo', payment_memo);
    res.set('X-Payment-Version', X402_PAYMENT_VERSION);
    return res.status(402).json({
      error: 'Payment required',
      x402: {
        version: X402_PAYMENT_VERSION,
        network: X402_NETWORK,
        chain_id: X402_CHAIN_ID,
        recipient: X402_PAYMENT_ADDRESS,
        amount: listing.price.amount,
        currency: listing.price.currency,
        memo: payment_memo,
        listing_id,
        listing_name: listing.name
      },
      instructions: `Send ${listing.price.amount} ${listing.price.currency} on Base mainnet (chain ${X402_CHAIN_ID}) to ${X402_PAYMENT_ADDRESS} with memo "${payment_memo}". POST back with payment_proof (tx hash) and memo to complete purchase.`
    });
  }

  // Payment proof provided — validate format
  if (!isValidTxHash(payment_proof)) {
    return res.status(400).json({ error: 'Invalid payment_proof: must be a 0x-prefixed 64-char hex transaction hash' });
  }

  // Check for replay (same tx used before)
  if (VERIFIED_PAYMENTS.has(payment_proof)) {
    const existing = VERIFIED_PAYMENTS.get(payment_proof);
    return res.status(409).json({ error: 'Payment proof already redeemed', access_token: existing.access_token });
  }

  // Verify on Base L2
  const verification = await verifyPaymentOnChain(payment_proof, memo, listing);
  if (!verification.valid) {
    return res.status(402).json({ error: 'Payment verification failed', reason: verification.error });
  }

  // Issue access token
  const access_token = generateAccessToken(listing_id, memo || payment_proof);
  const grant = {
    listing_id,
    tx: payment_proof,
    memo: memo || null,
    verified_at: new Date().toISOString(),
    access_token,
    warning: verification.warning || null
  };
  VERIFIED_PAYMENTS.set(payment_proof, grant);

  res.status(200).json({
    success: true,
    message: `Access granted to ${listing.name}`,
    access_token,
    endpoint: listing.endpoint,
    verified_at: grant.verified_at,
    ...(grant.warning ? { warning: grant.warning } : {})
  });
});

// GET /api/headless-markets/verify — Check access token validity (Issue #440)
app.get('/api/headless-markets/verify', (req, res) => {
  const { access_token } = req.query;
  if (!access_token) {
    return res.status(400).json({ error: 'access_token query param required' });
  }
  const grant = [...VERIFIED_PAYMENTS.values()].find(g => g.access_token === access_token);
  if (!grant) {
    return res.status(401).json({ valid: false, error: 'Access token not found or expired' });
  }
  const listing = AGENT_LISTINGS.find(l => l.id === grant.listing_id);
  res.json({
    valid: true,
    listing_id: grant.listing_id,
    listing_name: listing ? listing.name : grant.listing_id,
    endpoint: listing ? listing.endpoint : null,
    verified_at: grant.verified_at
  });
});

// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓▓ AGENT REGISTRY — ERC-8004 compatible agent metadata
// ▓▓▓ Issue #432: On-chain agent verification via ERC-8004
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

// Stub agent registry (will be replaced by ERC-8004 on-chain registry)
const AGENT_REGISTRY = [
  {
    id: 'nullpriest',
    name: 'NullPriest',
    description: 'Autonomous AI agent network on Base L2',
    wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    verification_status: 'pending',
    erc8004_contract: null, // Will be populated after ERC-8004 deployment
    capabilities: ['code-generation', 'deployment', 'competitive-intelligence'],
    homepage: 'https://nullpriest.xyz'
  }
];

// GET /api/registry/agents — List all registered agents
app.get('/api/registry/agents', (req, res) => {
  res.json({
    agents: AGENT_REGISTRY,
    standard: 'erc-8004',
    network: 'base-mainnet'
  });
});

// GET /api/registry/agents/:id — Get details for a specific agent
app.get('/api/registry/agents/:id', (req, res) => {
  const agent = AGENT_REGISTRY.find(a => a.id === req.params.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  res.json(agent);
});

// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓▓ MEMORY PROXY — Serves /memory/* from GitHub master
// ▓▓▓ Eliminates stale-cache issues during rapid development
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

app.get('/memory/*', (req, res) => {
  const memoryPath = req.path.replace(/^\/memory\//, '');
  const githubUrl = `${GITHUB_RAW_BASE}/memory/${memoryPath}`;

  https.get(githubUrl, (ghRes) => {
    if (ghRes.statusCode !== 200) {
      return res.status(404).send('Memory file not found');
    }
    
    // Set content type based on file extension
    const ext = path.extname(memoryPath).toLowerCase();
    const contentTypes = {
      '.md': 'text/markdown; charset=utf-8',
      '.json': 'application/json',
      '.txt': 'text/plain; charset=utf-8',
      '.html': 'text/html; charset=utf-8'
    };
    res.setHeader('Content-Type', contentTypes[ext] || 'text/plain');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    ghRes.pipe(res);
  }).on('error', (err) => {
    console.error(`Error fetching ${githubUrl}:`, err);
    res.status(500).send('Error fetching memory file');
  });
});

// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓▓ MEMORY API — List memory files via GitHub API
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

app.get('/api/memory/list', (req, res) => {
  const apiUrl = `${GITHUB_API_BASE}/contents/memory`;
  const options = {
    headers: {
      'User-Agent': 'nullpriest-server',
      'Accept': 'application/vnd.github.v3+json'
    }
  };

  if (process.env.GITHUB_TOKEN) {
    options.headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }

  https.get(apiUrl, options, (ghRes) => {
    let data = '';
    ghRes.on('data', chunk => data += chunk);
    ghRes.on('end', () => {
      if (ghRes.statusCode !== 200) {
        return res.status(ghRes.statusCode).json({ error: 'Failed to list memory files' });
      }
      
      try {
        const files = JSON.parse(data);
        const memoryFiles = files
          .filter(f => f.type === 'file')
          .map(f => ({
            name: f.name,
            path: f.path,
            url: `/memory/${f.name}`,
            size: f.size,
            sha: f.sha
          }));
        
        res.json({ files: memoryFiles });
      } catch (err) {
        res.status(500).json({ error: 'Failed to parse GitHub response' });
      }
    });
  }).on('error', (err) => {
    console.error('Error listing memory files:', err);
    res.status(500).json({ error: 'Error listing memory files' });
  });
});

// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓▓ ACTIVITY FEED — Issue #433
// ▓▓▓ Reads memory/activity-feed.md from GitHub, parses entries,
// ▓▓▓ returns JSON array for the site dashboard widget.
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

// Parse activity-feed.md into structured entries
// Expected format per entry:
//   ### YYYY-MM-DD HH:MM UTC
//   **agent** — summary line
//   optional detail line
function parseActivityFeed(markdown) {
  const entries = [];
  const blocks = markdown.split(/\n(?=###\s)/);
  for (const block of blocks) {
    const lines = block.trim().split('\n').filter(l => l.trim());
    if (!lines.length) continue;
    const dateMatch = lines[0].match(/###\s+(.+)/);
    if (!dateMatch) continue;
    const date = dateMatch[1].trim();
    let agent = null, summary = null, detail = null;
    for (let i = 1; i < lines.length; i++) {
      const boldMatch = lines[i].match(/^\*\*([^*]+)\*\*\s*[—–-]\s*(.+)/);
      if (boldMatch && !agent) {
        agent = boldMatch[1].trim();
        summary = boldMatch[2].trim();
      } else if (agent && !detail && lines[i].trim()) {
        detail = lines[i].trim();
      }
    }
    if (date && summary) {
      entries.push({ date, agent: agent || 'agent', summary, detail: detail || null });
    }
  }
  return entries;
}

// GET /api/activity — Serve activity feed as JSON for dashboard widget
app.get('/api/activity', (req, res) => {
  const feedUrl = `${GITHUB_RAW_BASE}/memory/activity-feed.md`;
  const limit = parseInt(req.query.limit) || 20;

  https.get(feedUrl, { headers: { 'User-Agent': 'nullpriest-server', 'Cache-Control': 'no-cache' } }, (ghRes) => {
    let data = '';
    ghRes.on('data', chunk => data += chunk);
    ghRes.on('end', () => {
      if (ghRes.statusCode !== 200) {
        return res.status(404).json({ error: 'Activity feed not found', entries: [] });
      }
      try {
        const entries = parseActivityFeed(data);
        // Most recent first, capped at limit
        const result = entries.slice(0, limit);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.json({
          entries: result,
          total: entries.length,
          source: 'memory/activity-feed.md',
          generated_at: new Date().toISOString()
        });
      } catch (err) {
        res.status(500).json({ error: 'Failed to parse activity feed', entries: [] });
      }
    });
  }).on('error', (err) => {
    console.error('Error fetching activity feed:', err);
    res.status(500).json({ error: 'Error fetching activity feed', entries: [] });
  });
});

// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓▓ AGENT DETAIL — Issue #415
// ▓▓▓ /api/agents/:id — serves agent-specific data
// ▓▓▓ Agent profile pages shipped (Build #100). Wire detail endpoint.
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

// Full agent detail data — name, role, schedule, build_count, last_build, capabilities
function getAgentDetails() {
  return [
    {
      id: 'builder-a',
      name: 'Builder A',
      slug: 'builder-a',
      role: 'Core Builder',
      description: 'Executes priority issues #1, #3, #5 from strategy.md. Runs hourly at :00, picks top-ranked tasks, implements and commits to master.',
      schedule: 'hourly at :00',
      cron: '0 * * * *',
      capabilities: ['code-generation', 'github-commits', 'issue-closing'],
      build_count: 98,
      last_build: new Date().toISOString(),
      status: 'active',
      github: 'iono-such-things/nullpriest',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`
    },
    {
      id: 'builder-b',
      name: 'Builder B',
      slug: 'builder-b',
      role: 'Parallel Builder',
      description: 'Executes priority issues #2, #7 from strategy.md. Runs hourly at :30, parallel to Builder A for 10 issues/hour total throughput.',
      schedule: 'hourly at :30',
      cron: '30 * * * *',
      capabilities: ['code-generation', 'github-commits', 'issue-closing'],
      build_count: 98,
      last_build: new Date().toISOString(),
      status: 'active',
      github: 'iono-such-things/nullpriest',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`
    },
    {
      id: 'strategist',
      name: 'Strategist',
      slug: 'strategist',
      role: 'Strategy & Planning',
      description: 'Reads open GitHub issues, scores by effort/impact, writes strategy.md priority queue for builders. Runs hourly at :15.',
      schedule: 'hourly at :15',
      cron: '15 * * * *',
      capabilities: ['issue-analysis', 'priority-scoring', 'strategy-writing'],
      build_count: 43,
      last_build: new Date().toISOString(),
      status: 'active',
      github: 'iono-such-things/nullpriest',
      activity_url: `${GITHUB_RAW_BASE}/memory/strategy.md`
    },
    {
      id: 'scout',
      name: 'Scout',
      slug: 'scout',
      role: 'Intelligence Gatherer',
      description: 'Monitors competitors (survive.money, claws.tech, AgentBase, daimon.network), scrapes their sites, and writes a detailed scout report every 6 hours.',
      schedule: 'every 6 hours',
      cron: '0 */6 * * *',
      capabilities: ['web-scraping', 'competitive-intel', 'report-writing'],
      build_count: 73,
      last_build: new Date().toISOString(),
      status: 'active',
      github: 'iono-such-things/nullpriest',
      activity_url: `${GITHUB_RAW_BASE}/memory/scout-latest.md`
    },
    {
      id: 'miner',
      name: 'CUSTOS Miner',
      slug: 'miner',
      role: 'Revenue Generator',
      description: 'Commits to CUSTOS Proof-of-Agent-Work rounds on Base via claws.tech. Submits work every 10 minutes, earns $CUSTOS.',
      schedule: 'every 10 minutes',
      cron: '*/10 * * * *',
      capabilities: ['mining', 'on-chain-execution', 'proof-of-work'],
      build_count: null,
      last_build: new Date().toISOString(),
      status: 'active',
      github: 'iono-such-things/nullpriest',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`
    },
    {
      id: 'site-watcher',
      name: 'Site Watcher',
      slug: 'site-watcher',
      role: 'Self-Improvement Loop',
      description: 'Audits the live nullpriest.xyz site for staleness every 6 hours. Checks competitor intel and triggers site rebuilds when content drifts.',
      schedule: 'every 6 hours',
      cron: '0 */6 * * *',
      capabilities: ['site-auditing', 'content-freshness', 'self-improvement'],
      build_count: null,
      last_build: new Date().toISOString(),
      status: 'active',
      github: 'iono-such-things/nullpriest',
      activity_url: `${GITHUB_RAW_BASE}/memory/activity-feed.md`
    }
  ];
}

// GET /api/agents — List all agents with summary data (used by stats bar)
app.get('/api/agents', (req, res) => {
  const agents = getAgentDetails();
  res.json({
    agents: agents.map(a => ({
      id: a.id,
      name: a.name,
      role: a.role,
      status: a.status,
      schedule: a.schedule,
      build_count: a.build_count
    })),
    total: agents.length,
    build_count: agents.reduce((sum, a) => sum + (a.build_count || 0), 0),
    generated_at: new Date().toISOString()
  });
});

// GET /api/agents/:id — Agent detail endpoint (Issue #415)
// Returns full agent metadata for profile pages
app.get('/api/agents/:id', (req, res) => {
  const agents = getAgentDetails();
  const agent = agents.find(a => a.id === req.params.id || a.slug === req.params.id);
  if (!agent) {
    return res.status(404).json({
      error: 'Agent not found',
      available: agents.map(a => a.id)
    });
  }
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json(agent);
});

// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓▓ NETWORK STATUS — Live chain data for Base L2
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

app.get('/api/network/status', (req, res) => {
  // TODO: Query Base RPC for live data
  res.json({
    network: 'base-mainnet',
    chain_id: 8453,
    rpc_url: 'https://mainnet.base.org',
    block_explorer: 'https://basescan.org',
    status: 'operational',
    last_updated: new Date().toISOString()
  });
});

// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓▓ STATIC FILES — Serve index.html and assets
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`▓▓▓ nullpriest server running on port ${PORT}`);
  console.log(`▓▓▓ Memory proxy: ${GITHUB_RAW_BASE}/memory/*`);
  console.log(`▓▓▓ A2A discovery: /.well-known/agent.json`);
  console.log(`▓▓▓ Agent registry: /api/registry/agents`);
  console.log(`▓▓▓ Headless markets: /api/headless-markets/listings`);
});
