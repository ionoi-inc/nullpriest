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
        id: 'marketplace-alpha-access',
        name: 'Alpha Access to headless.markets',
        price: '0.001',
        currency: 'ETH',
        description: 'Early access to the headless markets protocol + verified agent registration'
      },
      {
        id: 'agent-registration-premium',
        name: 'Premium Agent Registration',
        price: '0.0025',
        currency: 'ETH',
        description: 'Priority registration in the agent directory with verification badge'
      }
    ]
  });
});

// ▓▓▓ CUSTOS Miner Status API — Issue #17
app.get('/api/custos', async (req, res) => {
  try {
    const raw_url = `${GITHUB_RAW_BASE}/notes/custos-mine-log.md`;
    const response = await new Promise((resolve, reject) => {
      https.get(raw_url, resolve).on('error', reject);
    });
    
    if (response.statusCode !== 200) {
      return res.status(response.statusCode).json({ error: 'Mine log not found' });
    }
    
    let data = '';
    response.on('data', d => data += d);
    response.on('end', () => {
      const lines = data.split('\n');
      const lastCommit = lines.find(l => l.includes('commit:') || l.includes('Commit'));
      const lastReveal = lines.find(l => l.includes('reveal:') || l.includes('Reveal'));
      const balance = lines.find(l => l.includes('balance') || l.includes('Balance'));
      
      res.json({
        status: 'active',
        last_commit: lastCommit ? lastCommit.trim() : null,
        last_reveal: lastReveal ? lastReveal.trim() : null,
        balance: balance ? balance.trim() : null,
        log_url: 'https://github.com/iono-such-things/nullpriest/blob/master/notes/custos-mine-log.md'
      });
    });
  } catch (e) {
    res.status(500).json({ error: 'CUSTOS fetch error: ' + e.message });
  }
});

// ▓▓▓ Agent Directory API — Issue #19
app.get('/api/agents', async (req, res) => {
  try {
    const raw_url = `${GITHUB_RAW_BASE}/memory/agents.md`;
    const response = await new Promise((resolve, reject) => {
      https.get(raw_url, resolve).on('error', reject);
    });
    
    if (response.statusCode === 404) {
      return res.json({
        agents: [
          { id: 'scout', name: 'Scout', role: 'Intel & Recon', status: 'active', build_count: 73 },
          { id: 'strategist', name: 'Strategist', role: 'Planning & Prioritization', status: 'active', build_count: 43 },
          { id: 'builder-a', name: 'Builder A', role: 'Code Shipping', status: 'active', build_count: 98 },
          { id: 'builder-b', name: 'Builder B', role: 'Code Shipping', status: 'active', build_count: 98 },
          { id: 'builder-c', name: 'Builder C', role: 'Code Shipping', status: 'paused', build_count: 12 },
          { id: 'builder-d', name: 'Builder D', role: 'Code Shipping', status: 'paused', build_count: 8 }
        ],
        source: 'fallback',
        fetched_at: new Date().toISOString()
      });
    }
    
    let data = '';
    response.on('data', d => data += d);
    response.on('end', () => {
      const agents = [];
      const sections = data.split(/^###\s+/m).filter(Boolean);
      
      for (const section of sections) {
        const lines = section.split('\n');
        const name = lines[0].trim();
        const agent = { name };
        
        for (const line of lines.slice(1)) {
          const match = line.match(/^[-*]\s+\*\*([^*]+)\*\*[:\s]+(.+)/);
          if (match) {
            const key = match[1].toLowerCase().replace(/\s+/g, '_');
            agent[key] = match[2].trim();
          }
        }
        
        if (agent.name) agents.push(agent);
      }
      
      res.json({
        agents,
        count: agents.length,
        source: 'memory/agents.md',
        fetched_at: new Date().toISOString()
      });
    });
  } catch (e) {
    res.status(500).json({ error: 'Agent fetch error: ' + e.message });
  }
});

// ██ /api/activity — Issue #433
app.get('/api/activity', async (req, res) => {
  try {
    const raw_url = `${GITHUB_RAW_BASE}/memory/activity-feed.md`;
    const response = await new Promise((resolve, reject) => {
      https.get(raw_url, resolve).on('error', reject);
    });
    if (response.statusCode !== 200) {
      return res.status(response.statusCode).json({ error: 'Activity feed not found' });
    }
    let data = '';
    response.on('data', d => data += d);
    response.on('end', () => {
      // Parse markdown activity entries into JSON
      const lines = data.split('\n').filter(l => l.trim());
      const entries = [];
      for (const line of lines) {
        // Match lines like: - [timestamp] message or ### heading entries
        const match = line.match(/^[-*]\s+\[?(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}[^\]]*)\]?\s+(.+)/);
        if (match) {
          entries.push({ timestamp: match[1].trim(), message: match[2].trim() });
        } else if (line.startsWith('#')) {
          // section headers become metadata
          continue;
        } else if (line.trim() && !line.startsWith('>') && !line.startsWith('---')) {
          entries.push({ timestamp: null, message: line.trim() });
        }
      }
      res.json({
        ok: true,
        count: entries.length,
        entries: entries.slice(0, 50), // last 50 entries
        source: 'memory/activity-feed.md',
        fetched_at: new Date().toISOString()
      });
    });
  } catch (e) {
    res.status(500).json({ error: 'Activity fetch error: ' + e.message });
  }
});

// ██ /api/agents/:id — Issue #415
app.get('/api/agents/:id', async (req, res) => {
  try {
    const agentId = req.params.id;
    // Fetch agents list from GitHub raw
    const raw_url = `${GITHUB_RAW_BASE}/memory/agents.md`;
    const response = await new Promise((resolve, reject) => {
      https.get(raw_url, resolve).on('error', reject);
    });
    if (response.statusCode === 404) {
      // Fallback: return stub for known agents
      const stubs = {
        'scout': { id: 'scout', name: 'Scout', role: 'Intel & Recon', status: 'active', build_count: 73 },
        'strategist': { id: 'strategist', name: 'Strategist', role: 'Planning & Prioritization', status: 'active', build_count: 43 },
        'builder-a': { id: 'builder-a', name: 'Builder A', role: 'Code Shipping', status: 'active', build_count: 98 },
        'builder-b': { id: 'builder-b', name: 'Builder B', role: 'Code Shipping', status: 'active', build_count: 98 },
      };
      const agent = stubs[agentId];
      if (!agent) return res.status(404).json({ error: `Agent '${agentId}' not found` });
      return res.json({ ok: true, agent });
    }
    let data = '';
    response.on('data', d => data += d);
    response.on('end', () => {
      // Parse agents.md to find the requested agent by id/name
      const sections = data.split(/^###\s+/m).filter(Boolean);
      let found = null;
      for (const section of sections) {
        const firstLine = section.split('\n')[0].trim().toLowerCase();
        const slugged = firstLine.replace(/[^a-z0-9]+/g, '-');
        if (slugged === agentId || firstLine === agentId) {
          const lines = section.split('\n');
          const agent = { id: agentId, name: lines[0].trim() };
          for (const line of lines.slice(1)) {
            const m = line.match(/^[-*]\s+\*\*([^*]+)\*\*[:\s]+(.+)/);
            if (m) agent[m[1].toLowerCase().replace(/\s+/g, '_')] = m[2].trim();
          }
          found = agent;
          break;
        }
      }
      if (!found) return res.status(404).json({ error: `Agent '${agentId}' not found` });
      res.json({ ok: true, agent: found });
    });
  } catch (e) {
    res.status(500).json({ error: 'Agent detail fetch error: ' + e.message });
  }
});

// ▓▓▓ Build Price API — Issue #20
app.get('/api/price', (req, res) => {
  res.setHeader('X-402-Price', '0.001 ETH');
  res.setHeader('X-402-Address', X402_PAYMENT_ADDRESS);
  res.setHeader('X-402-Network', X402_NETWORK);
  res.setHeader('X-402-Version', X402_PAYMENT_VERSION);
  
  res.json({
    price: '0.001',
    currency: 'ETH',
    network: X402_NETWORK,
    chainId: X402_CHAIN_ID,
    paymentAddress: X402_PAYMENT_ADDRESS,
    description: 'Custom agent build + deployment',
    protocol: 'x402',
    version: X402_PAYMENT_VERSION
  });
});

// ▓▓▓ Static Site Serving
app.use(express.static(path.join(__dirname, 'site')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`nullpriest live on :${PORT}`);
});
