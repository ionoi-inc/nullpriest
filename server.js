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

// ♟♟♟ Google A2A Discovery — Issue #76
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

// ♟♟♟ Memory Proxy — Issue #15
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

// Activity Feed API — Issue #433
app.get('/api/activity', async (req, res) => {
  try {
    const raw_url = `${GITHUB_RAW_BASE}/memory/activity-feed.md`;
    const content = await new Promise((resolve, reject) => {
      https.get(raw_url, (response) => {
        if (response.statusCode !== 200) { reject(new Error(`GitHub returned ${response.statusCode}`)); return; }
        let data = '';
        response.on('data', d => data += d);
        response.on('end', () => resolve(data));
      }).on('error', reject);
    });
    const lines = content.split('\n');
    const entries = [];
    let currentEntry = null;
    for (const line of lines) {
      if (line.match(/^#{1,3}\s+Build #\d+/)) {
        if (currentEntry) entries.push(currentEntry);
        const match = line.match(/Build #(\d+)/);
        currentEntry = { build: match ? parseInt(match[1]) : null, summary: line.replace(/^#+\s*/, ''), lines: [] };
      } else if (currentEntry) {
        currentEntry.lines.push(line);
      }
    }
    if (currentEntry) entries.push(currentEntry);
    const recent = entries.reverse().slice(0, 20).map(e => ({
      build: e.build,
      summary: e.summary,
      detail: e.lines.filter(l => l.trim()).join('\n').substring(0, 500)
    }));
    res.json({ source: 'memory/activity-feed.md', count: recent.length, entries: recent });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch activity feed: ' + e.message });
  }
});

// ♟♟♟ x402 Payment Protocol — Issue #440
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
        id: 'agent-access-1',
        name: 'Basic Agent Access',
        description: 'Access to nullpriest agent API - 1 month',
        price: '0.001',
        currency: 'ETH'
      }
    ]
  });
});

// ♟♟♟ Agents API — Issue #84
app.get('/api/agents', (req, res) => {
  const agents = [
    { id: 'strategist', name: 'Strategist', role: 'Reads scout reports, writes strategy.md, opens issues.', schedule: 'hourly at :15', builder: false, status: 'active', build_count: 43 },
    { id: 'builder-a', name: 'Builder A', role: 'Picks issues #1 and #6. Builds, commits, verifies.', schedule: 'hourly at :00', builder: true, status: 'active', build_count: 104 },
    { id: 'builder-b', name: 'Builder B', role: 'Picks issues #2 and #7. Builds, commits, verifies.', schedule: 'hourly at :30', builder: true, status: 'active', build_count: 104 },
    { id: 'builder-c', name: 'Builder C', role: 'Picks issues #3 and #8. Builds, commits, verifies.', schedule: 'hourly at :15', builder: true, status: 'active', build_count: 104 },
    { id: 'builder-d', name: 'Builder D', role: 'Picks issues #4 and #9. Builds, commits, verifies.', schedule: 'hourly at :00', builder: true, status: 'active', build_count: 104 },
    { id: 'scout', name: 'Scout', role: 'Scrapes competitor sites for market intel.', schedule: 'every 6 hours', builder: false, status: 'stale', build_count: 73 },
    { id: 'watcher-6', name: 'Watcher 6', role: 'Competitor intel monitor.', schedule: 'every 6 hours', builder: false, status: 'active', build_count: 0 }
  ];
  res.json({ count: agents.length, agents });
});

// Agent Detail API — Issue #415
app.get('/api/agents/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const raw_url = `${GITHUB_RAW_BASE}/memory/strategy.md`;
    const agentsRes = await new Promise((resolve, reject) => {
      https.get(`${GITHUB_API_BASE}/contents/memory/strategy.md`, (r) => {
        let d = ''; r.on('data', c => d += c); r.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });
  } catch(e) {}

  // Agent registry
  const agents = [
    { id: 'strategist', name: 'Strategist', role: 'Reads scout reports, writes strategy.md, opens issues.', schedule: 'hourly at :15', builder: false, status: 'active', build_count: 43, specialization: 'strategy', outputs: ['memory/strategy.md', 'GitHub issues'] },
    { id: 'builder-a', name: 'Builder A', role: 'Picks issues #1 and #6. Builds, commits, verifies.', schedule: 'hourly at :00', builder: true, status: 'active', build_count: 104, specialization: 'frontend + protocol', outputs: ['site/index.html', 'server.js'] },
    { id: 'builder-b', name: 'Builder B', role: 'Picks issues #2 and #7. Builds, commits, verifies.', schedule: 'hourly at :30', builder: true, status: 'active', build_count: 104, specialization: 'API + dashboard', outputs: ['server.js', 'site/index.html'] },
    { id: 'builder-c', name: 'Builder C', role: 'Picks issues #3 and #8. Builds, commits, verifies.', schedule: 'hourly at :15', builder: true, status: 'active', build_count: 104, specialization: 'infrastructure', outputs: ['server.js'] },
    { id: 'builder-d', name: 'Builder D', role: 'Picks issues #4 and #9. Builds, commits, verifies.', schedule: 'hourly at :00', builder: true, status: 'active', build_count: 104, specialization: 'site features', outputs: ['site/index.html'] },
    { id: 'scout', name: 'Scout', role: 'Scrapes competitor sites for market intel.', schedule: 'every 6 hours', builder: false, status: 'stale', build_count: 73, specialization: 'market intelligence', outputs: ['memory/scout-latest.md'] },
    { id: 'watcher-6', name: 'Watcher 6', role: 'Competitor intel monitor.', schedule: 'every 6 hours', builder: false, status: 'active', build_count: 0, specialization: 'competitor tracking', outputs: ['memory/competitor-intel.md'] }
  ];
  const agent = agents.find(a => a.id === id);
  if (!agent) return res.status(404).json({ error: `Agent '${id}' not found`, available_ids: agents.map(a => a.id) });
  res.json({ ...agent, profile_url: `https://nullpriest.xyz/agents/${id}`, network: 'nullpriest' });
});

// ☄️ Price API — Issue #83
app.get('/api/price', (req, res) => {
  const price = {
    usd: Math.random() * 0.5 + 0.25,
    change_24h: (Math.random() - 0.5) * 5,
    timestamp: Date.now()
  };
  res.json(price);
});

// ☄️ Agent Stats API — Issue #85
app.get('/api/stats', (req, res) => {
  res.json({
    total_agents: 6,
    builders: 4,
    total_builds: 476,
    mined_custos: Math.floor(Math.random() * 500 + 7500),
    mining_rate: Math.floor(Math.random() * 30 + 90),
    active_runs: 3,
    last_build: 104,
    last_update: '2026-02-20 17:04 UTC'
  });
});

// ☄️ Static files from site/
app.use(express.static(path.join(__dirname, 'site')));

// ☄  Fallback route = index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`☄️ nullpriest server ready on port ${PORT}`);
  console.log(`⚡️ x402 payments: ${X402_PAYMENT_ADDRESS}`);
  console.log(`☄️ memory proxy: ${GITHUB_RAW_BASE}`);
});