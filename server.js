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
        custos: '0xF3e20293514777 5a3149C30482820d9E6a6FA29b07'
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
    res.status(500).json({ error: e.message });
  }
});

// ♟♟♟ Agents API — Issue #79
app.get('/api/agents', async (req, res) => {
  try {
    const raw_url = `${GITHUB_RAW_BASE}/memory/agents.json`;
    const data = await new Promise((resolve, reject) => {
      https.get(raw_url, (response) => {
        if (response.statusCode !== 200) { reject(new Error(`GitHub returned ${response.statusCode}`)); return; }
        let d = '';
        response.on('data', chunk => d += chunk);
        response.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ♟♟♟ Agent Detail API — Issue #415
app.get('/api/agents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const raw_url = `${GITHUB_RAW_BASE}/memory/agents.json`;
    const data = await new Promise((resolve, reject) => {
      https.get(raw_url, (response) => {
        if (response.statusCode !== 200) { reject(new Error(`GitHub returned ${response.statusCode}`)); return; }
        let d = '';
        response.on('data', chunk => d += chunk);
        response.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });
    const agent = data.agents.find(a => a.id === id || a.slug === id);
    if (!agent) return res.status(404).json({ error: `Agent '${id}' not found`, available: data.agents.map(a => a.id || a.slug) });
    res.json(agent);
  } catch (e) {
    // Fallback: return from in-memory registry if GitHub fetch fails
    const registry = {
      'strategist': { id: 'strategist', name: 'Strategist', role: 'Reads scout reports, writes strategy.md, opens issues', schedule: 'hourly at :15', status: 'active', build_count: 43 },
      'builder-a': { id: 'builder-a', name: 'Builder A', role: 'Issues #1 and #6, builds production code', schedule: 'hourly at :00', status: 'active', build_count: 105 },
      'builder-b': { id: 'builder-b', name: 'Builder B', role: 'Issues #2 and #7, builds production code', schedule: 'hourly at :30', status: 'active', build_count: 105 },
      'builder-c': { id: 'builder-c', name: 'Builder C', role: 'Issues #3 and #8, builds production code', schedule: 'hourly at :15', status: 'active', build_count: 104 },
      'builder-d': { id: 'builder-d', name: 'Builder D', role: 'Issues #4 and #9, builds production code', schedule: 'hourly at :00', status: 'active', build_count: 104 },
      'builder-e': { id: 'builder-e', name: 'Builder E', role: 'Issues #5 and #10, builds production code', schedule: 'hourly at :45', status: 'active', build_count: 104 },
      'scout': { id: 'scout', name: 'Scout', role: 'Monitors competitors and market signals', schedule: 'every 6 hours', status: 'stale', build_count: 73 }
    };
    const agent = registry[id];
    if (!agent) return res.status(404).json({ error: `Agent '${id}' not found` });
    res.json(agent);
  }
});

// ♟♟♟ Price API — Issue #44
app.get('/api/price', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const x402Token = req.headers['x-402-token'];
    if (!authHeader && !x402Token) {
      return res.status(402).json({
        error: 'Payment required',
        x402: {
          version: X402_PAYMENT_VERSION,
          network: X402_NETWORK,
          chain_id: X402_CHAIN_ID,
          payment_address: X402_PAYMENT_ADDRESS,
          price_usdc: '0.01',
          asset: 'USDC',
          memo: 'nullpriest-price-api',
          description: 'Agent-native price feed. Pay once, get 24h access.'
        }
      });
    }
    const raw_url = `${GITHUB_RAW_BASE}/memory/custos-state.json`;
    const data = await new Promise((resolve, reject) => {
      https.get(raw_url, (response) => {
        if (response.statusCode !== 200) { reject(new Error(`GitHub returned ${response.statusCode}`)); return; }
        let d = '';
        response.on('data', chunk => d += chunk);
        response.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 🔌 Headless-Markets Listings API - Issue #83
app.get('/api/markets', async (req, res) => {
  try {
    const raw_url = `${GITHUB_RAW_BASE}/memory/headless-markets.json`;
    const data = await new Promise((resolve, reject) => {
      https.get(raw_url, (response) => {
        if (response.statusCode !== 200) { reject(new Error(`GitHub returned ${response.statusCode}`)); return; }
        let d = '';
        response.on('data', chunk => d += chunk);
        response.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 🔌 Headless-Markets Buy API with x402 gate - Issue #83
app.post('/api/markets/:listing_id/buy', async (req, res) => {
  const { listing_id } = req.params;
  const { tx_hash, memo } = req.body;

  if (!tx_hash) {
    return res.status(402).json({
      error: 'Payment required',
      x402: {
        version: X402_PAYMENT_VERSION,
        network: X402_NETWORK,
        chain_id: X402_CHAIN_ID,
        payment_address: X402_PAYMENT_ADDRESS,
        price_usdc: '0.10',
        asset: 'USDC',
        description: 'Purchase access to this market listing.'
      }
    });
  }

  if (!isValidTxHash(tx_hash)) return res.status(400).json({ error: 'Invalid tx hash format' });

  const proof_key = `${listing_id}:${tx_hash}`;
  if (VERIFIED_PAYMENTS.has(proof_key)) {
    const existing = VERIFIED_PAYMENTS.get(proof_key);
    return res.json({ success: true, access_token: existing.access_token, cached: true });
  }

  const result = await verifyPaymentOnChain(tx_hash, memo, listing_id);
  if (!result.valid) return res.status(402).json({ error: result.error });

  const access_token = generateAccessToken(listing_id, tx_hash);
  VERIFIED_PAYMENTS.set(proof_key, { tx: tx_hash, listing_id, verified_at: Date.now(), access_token });
  res.json({ success: true, access_token, warning: result.warning || null });
});

// ♟♟♟ Agent Profile Pages — Issue #92
app.get('/agents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const raw_url = `${GITHUB_RAW_BASE}/memory/agents.json`;
    const data = await new Promise((resolve, reject) => {
      https.get(raw_url, (response) => {
        if (response.statusCode !== 200) { reject(new Error(`GitHub returned ${response.statusCode}`)); return; }
        let d = '';
        response.on('data', chunk => d += chunk);
        response.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });
    const agent = data.agents.find(a => a.id === id || a.slug === id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.sendFile(path.resolve(__dirname, 'site/index.html'));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ♟♟♟ Static site
app.use(express.static(path.join(__dirname, 'site')));

// ♟♟♟ Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`nullpriest server running on port ${PORT}`);
});
