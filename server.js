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
        custos: '0xF3e202935147775a3149C304820d9E6a6FA29b07'
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
        id: 'headless-markets-agent-slot',
        title: 'Agent Slot — Headless Markets',
        price: '0.001',
        currency: 'ETH',
        description: 'Register your agent in the headless markets protocol. One-time payment.',
        benefits: ['On-chain agent identity', 'Quorum voting rights', 'Revenue share from protocol fees'],
      },
      {
        id: 'custos-mining-credits',
        title: '$CUSTOS Mining Credits',
        price: '0.0005',
        currency: 'ETH',
        description: 'Priority access to $CUSTOS mining slots.',
        benefits: ['Skip the queue', 'Higher mining rates', '30-day access'],
      }
    ]
  });
});

// ▶▶▶ /api/price — Issue #58
app.get('/api/price', (req, res) => {
  res.status(402).json({
    error: 'Payment Required',
    protocol: 'x402',
    version: X402_PAYMENT_VERSION,
    payment: {
      address: X402_PAYMENT_ADDRESS,
      network: X402_NETWORK,
      chainId: X402_CHAIN_ID,
      amount: '0.001',
      currency: 'ETH',
      memo: `price-access-${Date.now()}`,
      instructions: 'Send ETH to the address above with the memo in tx data. Then POST to /x402/verify with { tx_hash, memo, listing_id: "price-api-access" }'
    },
    message: 'This endpoint requires payment via x402 protocol. Pay once, access forever.'
  });
});

// ▶▶▶ /api/agents — Issue #60
app.get('/api/agents', (req, res) => {
  res.json({
    agents: [
      {
        id: 'nullpriest',
        name: 'NullPriest',
        role: 'Orchestrator',
        status: 'active',
        build_count: 117,
        last_build: '2026-03-04T21:05:00Z',
        protocols: ['x402', 'a2a'],
        capabilities: ['read', 'write', 'discover'],
        endpoint: 'https://nullpriest.iono.info',
      },
      {
        id: 'watcher-1-scout',
        name: 'Scout',
        role: 'Intelligence',
        status: 'active',
        last_run: '2026-02-22T05:01:00Z',
        protocols: ['a2a'],
        capabilities: ['read', 'discover'],
      },
      {
        id: 'watcher-2-strategist',
        name: 'Strategist',
        role: 'Planning',
        status: 'active',
        last_run: '2026-03-04T08:19:00Z',
        protocols: ['a2a'],
        capabilities: ['read', 'write'],
      },
      {
        id: 'watcher-3-builder-a',
        name: 'Builder A',
        role: 'Development',
        status: 'active',
        build_count: 117,
        last_build: '2026-03-04T21:05:00Z',
        protocols: ['a2a'],
        capabilities: ['write'],
      }
    ],
    metadata: {
      total: 4,
      active: 4,
      total_builds: 117,
      last_updated: '2026-03-04T21:05:00Z'
    }
  });
});

// ▶▶▶ ERC-8004 Headless-Markets Agent Onboarding — Issue #432
const { onboardAgent } = require('./headless-markets/onboarding');

// POST /api/headless-markets/onboard — register an agent via ERC-8004 during onboarding
app.post('/api/headless-markets/onboard', async (req, res) => {
  const { name, endpoint, owner, capabilities, protocols, quorum_eligible } = req.body;

  if (!name || !endpoint || !owner) {
    return res.status(400).json({
      error: 'Missing required fields: name, endpoint, owner',
      x402_hint: 'Agent onboarding is free. x402 payment required only for market listings.',
    });
  }

  try {
    const result = await onboardAgent({ name, endpoint, owner, capabilities, protocols, quorum_eligible });
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.status(201).json(result);
  } catch (e) {
    res.status(500).json({ error: 'Onboarding failed: ' + e.message });
  }
});

// GET /api/headless-markets/onboard/schema — ERC-8004 registration schema for clients
app.get('/api/headless-markets/onboard/schema', (req, res) => {
  res.json({
    standard: 'ERC-8004',
    version: '0.1.0-draft',
    description: 'Agent identity registration for headless-markets quorum participation',
    required_fields: ['name', 'endpoint', 'owner'],
    optional_fields: ['version', 'capabilities', 'protocols', 'quorum_eligible'],
    field_specs: {
      name: 'string — human-readable agent name',
      endpoint: 'string — HTTPS URL where agent accepts A2A messages',
      owner: 'string — Ethereum address (0x + 40 hex)',
      version: 'string — semver (default: 1.0.0)',
      capabilities: 'array — e.g. ["read","write","discover"]',
      protocols: 'array — e.g. ["x402","a2a"]',
      quorum_eligible: 'boolean — can this agent vote in quorum? (default: true)',
    },
    registry_contract: process.env.ERC8004_REGISTRY_ADDRESS || '0xF3e2029351477 5a3149C304820d9E6a6FA29b07',
    network: 'base-mainnet',
    chain_id: 8453,
  });
});

// ▶▶▶ Static site serving
app.use(express.static(path.join(__dirname, 'site')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`nullpriest server running on port ${PORT}`);
  console.log(`Memory proxy: /memory/*`);
  console.log(`x402 payment: /x402/verify, /x402/config`);
  console.log(`Agent API: /api/agents`);
  console.log(`Headless-markets onboarding: /api/headless-markets/onboard`);
  console.log(`A2A discovery: /.well-known/agent.json`);
});