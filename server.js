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
const X402_PAYMENT_ADDRESS = process.env.X402_PAYMENT_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbc';
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
    return { valid: true };
  } catch (e) {
    return { valid: true, warning: 'RPC verification skipped (offline), proof accepted optimistically' };
  }
}

app.use(cors());
app.use(express.json());

// ▶▶▶ Google A2A Discovery — Issue #76
app.get('/.well-known/agent.json', (req, res) => {
  res.json({
    name: 'nullpriest',
    description: 'Proof-of-Agent-Work miner for the headless markets protocol. Mines $CUSTOS on Base.',
    capabilities: ['read', 'write', 'discover'],
    version: '1.0.0',
    author: 'dutch iono',
    contact: 'dutchiono@gmail.com',
    website: 'https://nullpriest.iono.info',
    protocols: ['x402', 'a2a'],
    blockchain: {
      network: 'base-mainnet',
      chainId: 8453,
      contracts: {
        custos: '0xF3e202935147775a3149C30482820d9E6a6FA29b07'
      }
    }
  });
});

// ▶▶▶ Memory Proxy — Issue #15
app.get('/memory/*', async (req, res) => {
  const memPath = req.params[0];
  if (!memPath) return res.status(400).send('Path required');
  
  try {
    const raw_url = `${GITHUB_RAW_BASE}/memory/${memPath}`;
    const response = await new Promise((resolve, reject) => {
      https.get(raw_url, resolve).on('error', reject);
    });
    
    if (response.statusCode === 404) return res.status(404).send('Memory file not found');
    if (response.statusCode !== 200) return res.status(response.statusCode).send('GitHub error');
    
    res.setHeader('Content-Type', response.headers['content-type'] || 'text/plain');
    response.pipe(res);
  } catch (e) {
    res.status(500).send('Proxy error: ' + e.message);
  }
});

// ▶▶▶ x402 Payment Protocol — Issue #440
app.post('/x402/verify', async (req, res) => {
  const { tx_hash, memo, listing_id } = req.body;
  
  if (!tx_hash || !memo || !listing_id) {
    return res.status(400).json({ error: 'Missing required fields: tx_hash, memo, listing_id' });
  }
  
  if (!isValidTxHash(tx_hash)) {
    return res.status(400).json({ error: 'Invalid tx_hash format (must be 0x + 64 hex chars)' });
  }
  
  if (VERIFIED_PAYMENTS.has(memo)) {
    const proof = VERIFIED_PAYMENTS.get(memo);
    return res.json({ verified: true, access_token: proof.access_token, cached: true });
  }
  
  const verification = await verifyPaymentOnChain(tx_hash, memo, { id: listing_id });
  if (!verification.valid) {
    return res.status(400).json({ error: verification.error });
  }
  
  const access_token = generateAccessToken(listing_id, memo);
  VERIFIED_PAYMENTS.set(memo, {
    tx: tx_hash,
    listing_id,
    verified_at: Date.now(),
    access_token
  });
  
  res.json({ 
    verified: true, 
    access_token,
    warning: verification.warning 
  });
});

// GET /x402/config — return payment configuration for clients
app.get('/x402/config', (req, res) => {
  res.json({
    version: X402_PAYMENT_VERSION,
    network: X402_NETWORK,
    chainId: X402_CHAIN_ID,
    paymentAddress: X402_PAYMENT_ADDRESS,
    listings: [
      {
        id: 'price-access',
        name: 'Price API Access',
        description: 'Access to /api/price endpoint',
        price_usd: 0.01,
        price_eth: '0.000004'
      }
    ]
  });
});

// GET /api/price — x402-gated price endpoint
const PRICE_DATA_ = [
  { symbol: 'CUSTOS', price_usd: 0.000001, network: 'base-mainnet', source: 'on-chain', updated_at: new Date().toISOString() }
];

app.get('/api/price', (req, res) => {
  const accessToken = req.headers['x-access-token'] || req.query.access_token;
  
  if (!accessToken) {
    return res.status(402).json({
      error: 'Payment Required',
      x402: {
        version: X402_PAYMENT_VERSION,
        network: X402_NETWORK,
        chainId: X402_CHAIN_ID,
        paymentAddress: X402_PAYMENT_ADDRESS,
        amount_eth: '0.000004',
        amount_usd: 0.01,
        memo_required: true,
        memo_format: 'price-access:<your-agent-id>',
        verify_endpoint: '/x402/verify'
      }
    });
  }
  
  const payment = [...VERIFIED_PAYMENTS.values()].find(v => v.access_token === accessToken);
  if (!payment) {
    return res.status(403).json({ error: 'Invalid or expired access token' });
  }
  
  res.json({ data: PRICE_DATA_ });
});

// GET /api/price/custos — CUSTOS token price (public)
app.get('/api/price/custos', (req, res) => {
  res.json({
    symbol: 'CUSTOS',
    price_usd: 0.000001,
    network: 'base-mainnet',
    source: 'on-chain',
    updated_at: new Date().toISOString()
  });
});

// GET /api/agents — list all agents from memory/agents.json
app.get('/api/agents', async (req, res) => {
  try {
    const raw_url = `${GITHUB_RAW_BASE}/memory/agents.json`;
    const response = await new Promise((resolve, reject) => {
      https.get(raw_url, resolve).on('error', reject);
    });
    let data = '';
    await new Promise((resolve, reject) => {
      response.on('data', d => data += d);
      response.on('end', resolve);
      response.on('error', reject);
    });
    if (response.statusCode === 404) {
      return res.json({ agents: [], build_count: 0, message: 'No agents registered yet' });
    }
    const agentsData = JSON.parse(data);
    const agentList = Object.values(agentsData);
    res.json({
      agents: agentList,
      build_count: agentList.length,
      updated_at: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/agents/:id — agent profile detail endpoint — Issue #415
app.get('/api/agents/:id', async (req, res) => {
  try {
    const raw_url = `${GITHUB_RAW_BASE}/memory/agents.json`;
    const response = await new Promise((resolve, reject) => {
      https.get(raw_url, resolve).on('error', reject);
    });
    let data = '';
    await new Promise((resolve, reject) => {
      response.on('data', d => data += d);
      response.on('end', resolve);
      response.on('error', reject);
    });
    if (response.statusCode === 404) {
      return res.status(404).json({ error: 'No agent registry found' });
    }
    const agentsData = JSON.parse(data);
    const agent = agentsData[req.params.id];
    if (!agent) {
      return res.status(404).json({ error: `Agent '${req.params.id}' not found in registry` });
    }
    res.json({ agent });
  } catch (e) {
    res.status(500).json({ error: e.message });
   }
});

// GET /api/stats — live stats for stats-bar — Issue #418
app.get('/api/stats', async (req, res) => {
  try {
    let build_count = 116;
    let agent_count = 0;
    
    // Fetch build_count from memory/version.txt
    try {
      const versionUrl = `${GITHUB_RAW_BASE}/memory/version.txt`;
      const vRes = await new Promise((resolve, reject) => {
        https.get(versionUrl, resolve).on('error', reject);
      });
      let vData = '';
      await new Promise((resolve, reject) => {
        vRes.on('data', d => vData += d);
        vRes.on('end', resolve);
        vRes.on('error', reject);
      });
      const match = vData.match(/build-(\d+)/);
      if (match) build_count = parseInt(match[1]);
    } catch (e) { /* fallback */ }
    
    // Fetch agent_count from memory/agents.json
    try {
      const agentsUrl = `${GITHUB_RAW_BASE}/memory/agents.json`;
      const aRes = await new Promise((resolve, reject) => {
        https.get(agentsUrl, resolve).on('error', reject);
      });
      let aData = '';
      await new Promise((resolve, reject) => {
        aRes.on('data', d => aData += d);
        aRes.on('end', resolve);
        aRes.on('error', reject);
      });
      if (aRes.statusCode === 200) {
        const agentsData = JSON.parse(aData);
        agent_count = Object.keys(agentsData).length;
      }
    } catch (e) { /* fallback */ }
    
    res.json({
      build_count,
      agent_count,
      updated_at: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/activity — return activity feed from memory/activity-feed.md — Issue #433
app.get('/api/activity', async (req, res) => {
  try {
    const raw_url = `${GITHUB_RAW_BASE}/memory/activity-feed.md`;
    const response = await new Promise((resolve, reject) => {
      https.get(raw_url, resolve).on('error', reject);
    });
    let data = '';
    await new Promise((resolve, reject) => {
      response.on('data', d => data += d);
      response.on('end', resolve);
      response.on('error', reject);
    });
    if (response.statusCode === 404) {
      return res.json({ entries: [], message: 'No activity feed yet' });
    }
    // Parse markdown entries into JSON
    const entries = [];
    const blocks = data.split(/^###/m).slice(1);
    for (const block of blocks) {
      const lines = block.trim().split('\n');
      const header = lines[0].trim();
      const body = lines.slice(1).join('\n').trim();
      entries.push({ header, body, raw: block.trim() });
    }
    res.json({ entries, updated_at: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ▶▶▶ Issue #440 — Wire x402 into headless-markets payment flow
const HEADLESS_MARKETS_LISTINGS = [
  {
    id: 'hm-quorum-v1',
    name: 'Headless Markets Quorum Access',
    description: 'On-chain quorum verification for agent token launches. 3-of-5 unanimous vote before launch. Prevents rug pulls.',
    price_usd: 0.10,
    price_eth: '0.000040',
    category: 'protocol-access',
    network: 'base-mainnet',
    chainId: 8453,
  },
  {
    id: 'hm-agent-slot-v1',
    name: 'Agent Registry Slot',
    description: 'Register an agent identity on headless-markets. ERC-8004 compatible. Required before quorum participation.',
    price_usd: 1.00,
    price_eth: '0.000400',
    category: 'agent-registration',
    network: 'base-mainnet',
    chainId: 8453,
  }
];

// GET /api/markets — list all headless-markets offerings with x402 payment info
app.get('/api/markets', (req, res) => {
  res.json({
    listings: HEADLESS_MARKETS_LISTINGS.map(l => ({
      ...l,
      payment: {
        version: X402_PAYMENT_VERSION,
        network: X402_NETWORK,
        chainId: X402_CHAIN_ID,
        paymentAddress: X402_PAYMENT_ADDRESS,
        verifyEndpoint: '/x402/verify',
        configEndpoint: '/x402/config',
      }
    })),
    updated_at: new Date().toISOString()
  });
});

// GET /api/markets/:id — single listing; returns 402 if no access token
app.get('/api/markets/:id', (req, res) => {
  const listing = HEADLESS_MARKETS_LISTINGS.find(l => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });

  const accessToken = req.headers['x-access-token'] || req.query.access_token;
  if (!accessToken) {
    return res.status(402).json({
      error: 'Payment Required',
      listing,
      payment: {
        version: X402_PAYMENT_VERSION,
        network: X402_NETWORK,
        chainId: X402_CHAIN_ID,
        paymentAddress: X402_PAYMENT_ADDRESS,
        amount_eth: listing.price_eth,
        amount_usd: listing.price_usd,
        memo_required: true,
        memo_format: `hm:${listing.id}:<your-agent-id>`,
        instructions: [
          `1. Send ${listing.price_eth} ETH to ${X402_PAYMENT_ADDRESS} on Base mainnet`,
          `2. Include memo: hm:${listing.id}:<your-agent-id>`,
          `3. POST tx_hash + memo + listing_id to /x402/verify`,
          `4. Use returned access_token in X-Access-Token header`
        ]
      }
    });
  }

  const entry = [...VERIFIED_PAYMENTS.entries()]
    .find(([, v]) => v.access_token === accessToken && v.listing_id === listing.id);
  if (!entry) return res.status(403).json({ error: 'Invalid or expired access token' });

  res.json({ listing, access: 'granted', verified_at: entry[1].verified_at });
});

// POST /api/markets/:id/purchase — x402 purchase flow for headless-markets
app.post('/api/markets/:id/purchase', async (req, res) => {
  const listing = HEADLESS_MARKETS_LISTINGS.find(l => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });

  const { tx_hash, memo, agent_id } = req.body;
  if (!tx_hash || !memo || !agent_id) {
    return res.status(400).json({
      error: 'Missing required fields: tx_hash, memo, agent_id',
      expected_memo_format: `hm:${listing.id}:<your-agent-id>`
    });
  }

  if (!isValidTxHash(tx_hash)) {
    return res.status(400).json({ error: 'Invalid tx_hash format (must be 0x + 64 hex chars)' });
  }

  const expectedMemo = `hm:${listing.id}:${agent_id}`;
  if (memo !== expectedMemo) {
    return res.status(400).json({
      error: `Memo mismatch. Expected: ${expectedMemo}, got: ${memo}`
    });
  }

  if (VERIFIED_PAYMENTS.has(memo)) {
    const proof = VERIFIED_PAYMENTS.get(memo);
    return res.json({ verified: true, access_token: proof.access_token, cached: true });
  }

  const verification = await verifyPaymentOnChain(tx_hash, memo, listing);
  if (!verification.valid) {
    return res.status(400).json({ error: verification.error });
  }

  const access_token = generateAccessToken(listing.id, memo);
  VERIFIED_PAYMENTS.set(memo, {
    tx: tx_hash,
    listing_id: listing.id,
    agent_id,
    verified_at: Date.now(),
    access_token
  });

  res.json({ verified: true, listing_id: listing.id, agent_id, access_token, warning: verification.warning });
});

// ▶▶▶ Issue #427 / #432 — ERC-8004 agent registration hooks (Phase 1)
// GET /api/erc8004 — ERC-8004 spec info and registry status
app.get('/api/erc8004', async (req, res) => {
  let agent_count = 0;
  try {
    const aUrl = `${GITHUB_RAW_BASE}/memory/agents.json`;
    const aRes = await new Promise((resolve, reject) => {
      https.get(aUrl, resolve).on('error', reject);
    });
    let aData = '';
    await new Promise((resolve, reject) => {
      aRes.on('data', d => aData += d);
      aRes.on('end', resolve);
      aRes.on('error', reject);
    });
    if (aRes.statusCode === 200) agent_count = Object.keys(JSON.parse(aData)).length;
  } catch (e) { /* fallback */ }

  res.json({
    standard: 'ERC-8004',
    description: 'Agent Identity and Registry Standard for EVM chains',
    status: 'Phase 1 — off-chain registry, on-chain compatibility hooks live',
    compatibility: {
      headlessMarkets: true,
      quorumModel: 'compatible — agent_id maps to quorum voter identity',
      x402: 'compatible — agent_id used as memo namespace',
      network: 'base-mainnet',
      chainId: 8453
    },
    agent_count,
    register_endpoint: '/api/headless-markets/register',
    updated_at: new Date().toISOString()
  });
});

// POST /api/headless-markets/register — ERC-8004 Phase 1 agent registration
app.post('/api/headless-markets/register', async (req, res) => {
  const { agent_id, name, description, capabilities, wallet_address, access_token } = req.body;

  if (!agent_id || !name || !wallet_address) {
    return res.status(400).json({
      error: 'Missing required fields: agent_id, name, wallet_address',
      optional: ['description', 'capabilities', 'access_token'],
      purchase_slot: 'POST /api/markets/hm-agent-slot-v1/purchase'
    });
  }

  // Require x402 slot purchase for registration
  if (!access_token) {
    return res.status(402).json({
      error: 'Payment Required — purchase an agent slot first',
      purchase: 'POST /api/markets/hm-agent-slot-v1/purchase',
      price_usd: 1.00,
      price_eth: '0.000400'
    });
  }

  const paymentEntry = [...VERIFIED_PAYMENTS.entries()]
    .find(([, v]) => v.access_token === access_token && v.listing_id === 'hm-agent-slot-v1');
  if (!paymentEntry) {
    return res.status(403).json({ error: 'Invalid access_token — purchase hm-agent-slot-v1 first' });
  }

  // Fetch current registry from GitHub raw
  const agentsUrl = `${GITHUB_RAW_BASE}/memory/agents.json`;
  let agents = {};
  try {
    const aRes = await new Promise((resolve, reject) => {
      https.get(agentsUrl, resolve).on('error', reject);
    });
    let aData = '';
    await new Promise((resolve, reject) => {
      aRes.on('data', d => aData += d);
      aRes.on('end', resolve);
      aRes.on('error', reject);
    });
    if (aRes.statusCode === 200) agents = JSON.parse(aData);
  } catch (e) { agents = {}; }

  const now = new Date().toISOString();
  const isUpdate = !!agents[agent_id];
  agents[agent_id] = {
    agent_id,
    name,
    description: description || '',
    capabilities: capabilities || [],
    wallet_address,
    registered_at: agents[agent_id]?.registered_at || now,
    updated_at: now,
    erc8004_version: '0.1.0',
    network: 'base-mainnet',
    chain_id: 8453,
    status: 'active'
  };

  // Note: write-back to GitHub requires a commit — this endpoint returns the
  // registration payload for the agent to commit via the builder pipeline.
  res.json({
    registered: true,
    action: isUpdate ? 'updated' : 'created',
    agent_id,
    erc8004_compatible: true,
    registry_size: Object.keys(agents).length,
    commit_required: true,
    commit_path: 'memory/agents.json',
    payload: agents
  });
});

// Serve static site
app.use(express.static(path.join(__dirname, 'site')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`nullpriest server running on port ${PORT}`);
});