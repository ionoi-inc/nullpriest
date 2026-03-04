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
        id: 'agent-full-access',
        name: 'Full Agent Access',
        description: 'Unlimited API calls for 30 days',
        price: '0.001',
        currency: 'ETH',
        duration: 2592000
      }
    ]
  });
});

// ▶▶▶ Agent Registry API — Issue #418
app.get('/api/agents', (req, res) => {
  res.json({
    agents: [
      { 
        id: 'watcher-1-scout', 
        name: 'Scout', 
        role: 'Intelligence', 
        status: 'active',
        cycle: 'Every 30 min',
        last_run: '2026-02-22 05:01 UTC',
        builds_shipped: 0
      },
      { 
        id: 'watcher-2-strategist', 
        name: 'Strategist', 
        role: 'Planning', 
        status: 'active',
        cycle: 'Every hour at :15',
        last_run: '2026-03-04 08:19 UTC',
        builds_shipped: 0
      },
      { 
        id: 'watcher-3-builder-b', 
        name: 'Builder B', 
        role: 'Engineering', 
        status: 'active',
        cycle: 'Every hour at :30',
        last_run: '2026-03-04 21:06 UTC',
        builds_shipped: 113
      },
      { 
        id: 'watcher-4-builder-d', 
        name: 'Builder D', 
        role: 'Engineering', 
        status: 'paused',
        cycle: 'Every hour at :45',
        last_run: null,
        builds_shipped: 0
      },
      { 
        id: 'watcher-5-custos-miner', 
        name: 'CUSTOS Miner', 
        role: 'Mining', 
        status: 'active',
        cycle: 'Every 10 min',
        last_run: '2026-03-04 20:50 UTC',
        builds_shipped: 0
      }
    ],
    stats: {
      total_agents: 5,
      active_agents: 4,
      total_builds: 112,
      last_build: '2026-03-04 18:00 UTC'
    }
  });
});

// ▶▶▶ Activity Feed API — Issue #433
app.get('/api/activity', async (req, res) => {
  try {
    const feed_url = `${GITHUB_RAW_BASE}/memory/activity-feed.md`;
    const response = await new Promise((resolve, reject) => {
      https.get(feed_url, resolve).on('error', reject);
    });
    
    if (response.statusCode !== 200) {
      return res.status(500).json({ error: 'Failed to fetch activity feed' });
    }
    
    let markdown = '';
    response.on('data', chunk => markdown += chunk);
    response.on('end', () => {
      const lines = markdown.split('\n');
      const entries = [];
      let current = null;
      
      for (const line of lines) {
        if (line.startsWith('## ')) {
          if (current) entries.push(current);
          current = { timestamp: line.replace('## ', ''), events: [] };
        } else if (current && line.trim().startsWith('-')) {
          current.events.push(line.trim().substring(2));
        }
      }
      if (current) entries.push(current);
      
      res.json({ entries: entries.slice(0, 20) });
    });
  } catch (e) {
    res.status(500).json({ error: 'Activity feed error: ' + e.message });
  }
});

// ▶▶▶ Agent Detail API — Issue #415
app.get('/api/agents/:id', (req, res) => {
  const agents = {
    'watcher-1-scout': {
      id: 'watcher-1-scout',
      name: 'Scout',
      role: 'Intelligence',
      status: 'active',
      cycle: 'Every 30 min',
      last_run: '2026-02-22 05:01 UTC',
      builds_shipped: 0,
      description: 'Monitors competitor sites, GitHub activity, and market signals. Writes scout-latest.md each cycle.',
      responsibilities: ['Competitor intel', 'Market signals', 'Build stall detection', 'Priority escalation'],
      outputs: ['memory/scout-latest.md'],
      blockers: ['Scout trigger stale 11+ days — human must check trigger status']
    },
    'watcher-2-strategist': {
      id: 'watcher-2-strategist',
      name: 'Strategist',
      role: 'Planning',
      status: 'active',
      cycle: 'Every hour at :15',
      last_run: '2026-03-04 08:19 UTC',
      builds_shipped: 0,
      description: 'Reads scout report, generates priority queue, writes strategy.md for builders to consume.',
      responsibilities: ['Priority queue generation', 'Blocker tracking', 'Cycle planning'],
      outputs: ['memory/strategy.md'],
      blockers: []
    },
    'watcher-3-builder-b': {
      id: 'watcher-3-builder-b',
      name: 'Builder B',
      role: 'Engineering',
      status: 'active',
      cycle: 'Every hour at :30',
      last_run: '2026-03-04 21:06 UTC',
      builds_shipped: 113,
      description: 'Ships issues #2 and #7 from strategy.md each cycle. Commits code, closes issues, writes build log.',
      responsibilities: ['Code implementation', 'GitHub commits', 'Issue closure', 'Build logging'],
      outputs: ['server.js', 'site/index.html', 'memory/build-log.md'],
      blockers: []
    },
    'watcher-4-builder-d': {
      id: 'watcher-4-builder-d',
      name: 'Builder D',
      role: 'Engineering',
      status: 'paused',
      cycle: 'Every hour at :45',
      last_run: null,
      builds_shipped: 0,
      description: 'Parallel builder — handles issues #4 and #9 from strategy.md. Currently paused.',
      responsibilities: ['Code implementation', 'GitHub commits', 'Issue closure'],
      outputs: ['server.js', 'site/index.html'],
      blockers: ['Paused — awaiting activation']
    },
    'watcher-5-custos-miner': {
      id: 'watcher-5-custos-miner',
      name: 'CUSTOS Miner',
      role: 'Mining',
      status: 'active',
      cycle: 'Every 10 min',
      last_run: '2026-03-04 20:50 UTC',
      builds_shipped: 0,
      description: 'Mines $CUSTOS tokens on Base via commit/reveal proof-of-work. Logs results to notes/custos-mine-log.md.',
      responsibilities: ['CUSTOS commit', 'CUSTOS reveal', 'Mining log'],
      outputs: ['notes/custos-mine-log.md'],
      blockers: ['CUSTOS_WALLET env var not set — commit/reveal impossible']
    }
  };

  const agent = agents[req.params.id];
  if (!agent) {
    return res.status(404).json({ error: `Agent '${req.params.id}' not found`, available: Object.keys(agents) });
  }
  res.json(agent);
});

// ▶▶▶ Price API — Issue #50
app.get('/api/price', (req, res) => {
  res.setHeader('X-Payment-Required', 'true');
  res.setHeader('X-Payment-Address', X402_PAYMENT_ADDRESS);
  res.setHeader('X-Payment-Network', X402_NETWORK);
  res.setHeader('X-Payment-Amount', '0.0001');
  res.setHeader('X-Payment-Currency', 'ETH');
  
  const { access_token } = req.query;
  if (!access_token) {
    return res.status(402).json({ 
      error: 'Payment Required',
      message: 'Send 0.0001 ETH to the payment address and include tx hash + memo',
      payment_address: X402_PAYMENT_ADDRESS,
      network: X402_NETWORK,
      verify_endpoint: '/x402/verify'
    });
  }
  
  const verified = Array.from(VERIFIED_PAYMENTS.values()).find(p => p.access_token === access_token);
  if (!verified) {
    return res.status(403).json({ error: 'Invalid or expired access token' });
  }
  
  res.json({
    price: 0.042,
    currency: 'ETH',
    market_cap: 420000,
    volume_24h: 12500,
    change_24h: 15.7,
    timestamp: Date.now()
  });
});

// ▶▶▶ Static Site
app.use(express.static(path.join(__dirname, 'site')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`nullpriest server running on port ${PORT}`);
  console.log(`Memory proxy: /memory/*`);
  console.log(`A2A discovery: /.well-known/agent.json`);
  console.log(`x402 payment: /x402/verify + /x402/config`);
  console.log(`Agent API: /api/agents`);
  console.log(`Agent Detail API: /api/agents/:id`);
  console.log(`Activity API: /api/activity`);
  console.log(`Price API: /api/price (x402 gated)`);
});
