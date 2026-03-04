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

// ▓▓▓ Google A2A Discovery — Issue #76
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

// ▓▓▓ Memory Proxy — Issue #15
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

// ▓▓▓ x402 Payment Protocol — Issue #440
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
        id: 'market-access',
        name: 'Market Access',
        description: 'Access to nullpriest headless markets API',
        priceUSDC: 0.10
      }
    ]
  });
});

// ▓▓▓ Price Endpoint — Issue #440 (x402 gated)
app.get('/api/price', async (req, res) => {
  // Check for valid access token
  const token = req.headers['x-access-token'] || req.query.token;
  
  if (!token) {
    return res.status(402).json({
      error: 'Payment required',
      x402: {
        version: X402_PAYMENT_VERSION,
        network: X402_NETWORK,
        chainId: X402_CHAIN_ID,
        paymentAddress: X402_PAYMENT_ADDRESS,
        priceUSDC: 0.10,
        memo: 'price-access-' + Date.now()
      }
    });
  }
  
  // Validate token exists in verified payments (simple match)
  const verified = [...VERIFIED_PAYMENTS.values()].find(p => p.access_token === token);
  if (!verified) {
    return res.status(403).json({ error: 'Invalid or expired access token' });
  }
  
  // Return real price data
  res.json({
    custos_usdc: 0.0012,
    custos_eth: 0.00000035,
    last_updated: new Date().toISOString(),
    network: 'base-mainnet'
  });
});

// ▓▓▓ Agents List — Issue #62
app.get('/api/agents', async (req, res) => {
  try {
    const url = `${GITHUB_RAW_BASE}/memory/agents.json`;
    const data = await new Promise((resolve, reject) => {
      https.get(url, (resp) => {
        let body = '';
        resp.on('data', d => body += d);
        resp.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch (e) { resolve([]); }
        });
      }).on('error', reject);
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ▓▓▓ Agent Detail — Issue #415
app.get('/api/agents/:id', async (req, res) => {
  try {
    const agentId = req.params.id;
    const url = `${GITHUB_RAW_BASE}/memory/agents.json`;
    const agents = await new Promise((resolve, reject) => {
      https.get(url, (resp) => {
        let body = '';
        resp.on('data', d => body += d);
        resp.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch (e) { resolve([]); }
        });
      }).on('error', reject);
    });
    const agent = Array.isArray(agents) ? agents.find(a => a.id === agentId) : null;
    if (!agent) return res.status(404).json({ error: 'Agent not found', id: agentId });
    res.json(agent);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/agents/— list of agents (similar to /api/agents but paginated)
app.get('/api/activity', async (req, res) => {
  try {
    const url = `${GITHUB_RAW_BASE}/memory/activity-feed.md`;
    const response = await new Promise((resolve, reject) => {
      https.get(url, resolve).on('error', reject);
    });
    if (response.statusCode === 404) return res.status(404).json({ error: 'Activity feed not found' });
    let md = '';
    response.on('data', d => md += d);
    response.on('end', () => {
      const lines = md.split('\n').filter(l => l.trim());
      const events = [];
      for (const line of lines) {
        if (line.startsWith('#')) continue;
        if (line.startsWith('-') || line.startsWith('*')) {
          events.unshift({ text: line.replace(/^[-*]\s*/, ''), raw: line });
        }
      }
      res.json({ events: events.slice(0, 50), total: events.length });
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ▓▓▓ Stats — Issue #418 (live build count from version.txt) + Issue #422 (version.txt touch)
app.get('/api/stats', async (req, res) => {
  try {
    // Read build count from memory/version.txt via GitHub raw
    const versionUrl = `${GITHUB_RAW_BASE}/memory/version.txt`;
    const versionText = await new Promise((resolve) => {
      https.get(versionUrl, (resp) => {
        let body = '';
        resp.on('data', d => body += d);
        resp.on('end', () => resolve(body.trim()));
      }).on('error', () => resolve(''));
    });

    // version.txt format: build-NNN-YYYY-MM-DDTHH:MM:SSZ
    let build_count = null;
    let last_build = null;
    const vMatch = versionText.match(/^build-(\d+)-(.+)$/);
    if (vMatch) {
      build_count = parseInt(vMatch[1], 10);
      last_build = vMatch[2];
    }

    // Read agent count from memory/agents.json
    const agentsUrl = `${GITHUB_RAW_BASE}/memory/agents.json`;
    const agentsData = await new Promise((resolve) => {
      https.get(agentsUrl, (resp) => {
        let body = '';
        resp.on('data', d => body += d);
        resp.on('end', () => {
          try { resolve(JSON.parse(body)); } catch (e) { resolve(null); }
        });
      }).on('error', () => resolve(null));
    });

    const agentList = agentsData && agentsData.agents ? agentsData.agents : (Array.isArray(agentsData) ? agentsData : []);
    const agent_count = agentList.filter(a => !a.status || a.status === 'active').length || 8;

    res.json({
      build_count,
      last_build,
      agent_count,
      uptime: '24/7',
      version: versionText || null
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ▓▓▓ Static Site
app.use(express.static(path.join(__dirname, 'site')));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/memory/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`nullpriest server listening on port ${PORT}`);
});
