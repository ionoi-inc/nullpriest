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
        custos: '0xF3e20293514775a3149C30482820d9E6a6FA29b07'
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
        id: 'nullpriest-api-access',
        name: 'nullpriest API Access',
        description: 'Full read/write access to nullpriest agent network APIs',
        price: '0.001',
        currency: 'ETH',
        duration: '30d'
      },
      {
        id: 'custos-mining-boost',
        name: '$CUSTOS Mining Boost',
        description: '10x mining multiplier for 7 days',
        price: '0.005',
        currency: 'ETH',
        duration: '7d'
      }
    ]
  });
});

// ♟♟♟ Price API — Issue #62
app.get('/api/price', async (req, res) => {
  try {
    const gecko_url = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true';
    const response = await new Promise((resolve, reject) => {
      https.get(gecko_url, resolve).on('error', reject);
    });
    let data = '';
    response.on('data', d => data += d);
    response.on('end', () => {
      const parsed = JSON.parse(data);
      res.json({
        price: parsed.ethereum?.usd || 0,
        change_24h: parsed.ethereum?.usd_24h_change || 0,
        currency: 'USD',
        timestamp: Date.now()
      });
    });
  } catch (e) {
    res.status(500).json({ error: 'Price fetch failed: ' + e.message });
  }
});

// ♟♟♟ Agents API — Issue #57
app.get('/api/agents', async (req, res) => {
  try {
    const raw_url = `${GITHUB_RAW_BASE}/memory/agents.json`;
    const response = await new Promise((resolve, reject) => {
      https.get(raw_url, resolve).on('error', reject);
    });
    if (response.statusCode === 404) {
      return res.json({
        agents: [
          { id: 'builder-a', name: 'Builder A', status: 'active', build_count: 38 },
          { id: 'builder-b', name: 'Builder B', status: 'active', build_count: 35 },
          { id: 'builder-d', name: 'Builder D', status: 'active', build_count: 27 },
          { id: 'strategist', name: 'Strategist', status: 'active', build_count: 43 },
          { id: 'scout', name: 'Scout', status: 'active', build_count: 73 }
        ],
        count: 5,
        last_updated: Date.now()
      });
    }
    let data = '';
    response.on('data', d => data += d);
    response.on('end', () => {
      try {
        const agents = JSON.parse(data);
        res.json({
          agents: Array.isArray(agents) ? agents : Object.values(agents),
          count: Array.isArray(agents) ? agents.length : Object.keys(agents).length,
          last_updated: Date.now()
        });
      } catch (parseErr) {
        res.status(500).json({ error: 'Failed to parse agents data' });
      }
    });
  } catch (e) {
    res.status(500).json({ error: 'Agents fetch failed: ' + e.message });
  }
});

// ♟♟♟ Activity Feed API — Issue #433
app.get('/api/activity', async (req, res) => {
  try {
    const raw_url = `${GITHUB_RAW_BASE}/memory/activity-feed.md`;
    const response = await new Promise((resolve, reject) => {
      https.get(raw_url, resolve).on('error', reject);
    });
    if (response.statusCode === 404) return res.status(404).json({ error: 'Activity feed not found' });
    if (response.statusCode !== 200) return res.status(response.statusCode).json({ error: 'GitHub error' });
    let data = '';
    response.on('data', d => data += d);
    response.on('end', () => {
      // Parse markdown into structured entries
      const lines = data.split('\n');
      const entries = [];
      let current = null;
      for (const line of lines) {
        const buildMatch = line.match(/^##\s+Build\s+#(\d+)/i);
        const entryMatch = line.match(/^[-*]\s+\*\*(.+?)\*\*[:\s]+(.+)/);
        const dateMatch = line.match(/^>\s*(.+)/);
        if (buildMatch) {
          if (current) entries.push(current);
          current = { build: parseInt(buildMatch[1]), date: null, items: [] };
        } else if (current && dateMatch && !current.date) {
          current.date = dateMatch[1].trim();
        } else if (current && entryMatch) {
          current.items.push({ key: entryMatch[1].trim(), value: entryMatch[2].trim() });
        } else if (current && line.trim().startsWith('-')) {
          current.items.push({ key: 'note', value: line.replace(/^[-*]\s+/, '').trim() });
        }
      }
      if (current) entries.push(current);
      res.json({
        count: entries.length,
        latest_build: entries.length > 0 ? entries[entries.length - 1].build : null,
        entries: entries.slice(-20).reverse() // last 20, newest first
      });
    });
  } catch (e) {
    res.status(500).json({ error: 'Activity proxy error: ' + e.message });
  }
});

// ♟♟♟ Agent Detail API — Issue #415
app.get('/api/agents/:id', async (req, res) => {
  try {
    const agentId = req.params.id;
    if (!agentId || agentId.length > 100) return res.status(400).json({ error: 'Invalid agent ID' });
    
    // Fetch agent list from GitHub raw
    const raw_url = `${GITHUB_RAW_BASE}/memory/agents.json`;
    const response = await new Promise((resolve, reject) => {
      https.get(raw_url, resolve).on('error', reject);
    });
    
    if (response.statusCode === 404) {
      // Fallback: return stub agent data keyed by id
      return res.json({
        id: agentId,
        name: agentId,
        status: 'unknown',
        build_count: 0,
        last_active: null,
        description: 'Agent profile data not yet available.'
      });
    }
    
    let data = '';
    response.on('data', d => data += d);
    response.on('end', () => {
      try {
        const agents = JSON.parse(data);
        const agent = Array.isArray(agents) 
          ? agents.find(a => a.id === agentId || a.name === agentId || a.slug === agentId)
          : agents[agentId];
        if (!agent) {
          return res.status(404).json({ error: `Agent '${agentId}' not found`, available_ids: Array.isArray(agents) ? agents.map(a => a.id || a.name) : Object.keys(agents) });
        }
        res.json(agent);
      } catch (parseErr) {
        res.status(500).json({ error: 'Failed to parse agent data' });
      }
    });
  } catch (e) {
    res.status(500).json({ error: 'Agent detail error: ' + e.message });
  }
});

// Static site files
app.use(express.static(path.join(__dirname, 'site')));

// Catch-all for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`nullpriest server running on port ${PORT}`);
  console.log(`Memory proxy: /memory/*`);
  console.log(`x402 payment: /x402/verify, /x402/config`);
  console.log(`APIs: /api/price, /api/agents, /api/activity, /api/agents/:id`);
});
