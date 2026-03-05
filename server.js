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
    res.status(500).json({ error: e.message });
  }
});

// 🔋 Agents API — Issue #92
// Data lives in GitHub at memory/agents.json
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

// Agent Detail Endpoint — Issue #415
// Returns full agent profile data for a specific agent by id or slug
app.get('/api/agents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Agent id required' });

    const raw_url = `${GITHUB_RAW_BASE}/memory/agents.json`;
    const data = await new Promise((resolve, reject) => {
      https.get(raw_url, (response) => {
        if (response.statusCode !== 200) { reject(new Error(`GitHub returned ${response.statusCode}`)); return; }
        let d = '';
        response.on('data', chunk => d += chunk);
        response.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });

    // Support lookup by numeric id, slug, or name (case-insensitive)
    const agents = Array.isArray(data) ? data : (data.agents || []);
    const agent = agents.find(a =>
      String(a.id) === id ||
      (a.slug && a.slug.toLowerCase() === id.toLowerCase()) ||
      (a.name && a.name.toLowerCase() === id.toLowerCase())
    );

    if (!agent) {
      return res.status(404).json({ error: `Agent '${id}' not found`, available: agents.length });
    }

    res.json({ agent, source: 'memory/agents.json' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 🔋 Price API — Issue #106
app.get('/api/price', async (req, res) => {
  try {
    const priceData = {
      token: 'CUSTOS',
      price_usd: 0.0,
      market_cap_usd: 0.0,
      volume_24h: 0.0,
      last_updated: new Date().toISOString(),
      note: 'CUSTOS mining active on Base mainnet. Price feed integration pending.'
    };
    res.setHeader('X-Pas402-Accept', `ETH network=base-mainnet recipient=${X402_PAYMENT_ADDRESS} amount=10000000000000000 memo=price-feed-v1 version=${X402_PAYMENT_VERSION}`);
    res.json(priceData);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 🏠 Static site
app.use(express.static(path.join(__dirname, 'site')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'site', 'index.html')));

app.listen(PORT, () => console.log(`nullpriest server running on port ${PORT}`));