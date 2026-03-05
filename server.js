require('dotenv').config();

const express = require('express');
const path    = require('path');
const cors    = require('cors');
const https   = require('https');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 31499;

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/iono-such-things/nullpriest/master';
const GITHUB_API_BASE = 'https://api.github.com/repos/iono-such-things/nullpriest';

const X402_PAYMENT_ADDRESS = process.env.X402_PAYMENT_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbc';
const X402_PAYMENT_VERSION = process.env.X402_PAYMENT_VERSION || '1';
const X402_NETWORK = 'base-mainnet';
const X402_CHAIN_ID = 8453;

const VERIFIED_PAYMENTS = new Map();

function generateAccessToken(listing_id, memo) {
  const payload = `${listing_id}:${memo}:${Date.now()}`;
  return Buffer.from(payload).toString('base64').replace(/=/g, '');
}

function isValidTxHash(hash) {
  return typeof hash === 'string' && /^0x[0-9a-fA-F]{64}$/.test(hash);
}

app.use(cors());
app.use(express.json());

// Google A2A Discovery
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
      contracts: { custos: '0xF3e2029351477775a3149C30482820d9E6a6FA29b07' }
    }
  });
});

// Memory Proxy
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
    res.status(500).json({ error: 'Failed to fetch activity feed', message: e.message });
  }
});

// Price Endpoint — Issue #46
app.get('/api/price', async (req, res) => {
  try {
    const coingecko_url = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd';
    const priceData = await new Promise((resolve, reject) => {
      https.get(coingecko_url, (response) => {
        if (response.statusCode !== 200) { reject(new Error(`CoinGecko returned ${response.statusCode}`)); return; }
        let data = '';
        response.on('data', d => data += d);
        response.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });
    const ethPrice = priceData.ethereum?.usd;
    if (!ethPrice) throw new Error('Invalid price data from CoinGecko');
    res.json({ price: ethPrice, currency: 'USD', asset: 'ETH', source: 'coingecko', timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch price', message: e.message });
  }
});

// Agents List Endpoint — Issue #71
app.get('/api/agents', async (req, res) => {
  try {
    const raw_url = `${GITHUB_RAW_BASE}/memory/agents.md`;
    const content = await new Promise((resolve, reject) => {
      https.get(raw_url, (response) => {
        if (response.statusCode !== 200) { reject(new Error(`GitHub returned ${response.statusCode}`)); return; }
        let data = '';
        response.on('data', d => data += d);
        response.on('end', () => resolve(data));
      }).on('error', reject);
    });
    const lines = content.split('\n');
    const agents = [];
    let current = null;
    for (const line of lines) {
      if (line.startsWith('## ')) {
        if (current) agents.push(current);
        current = { name: line.slice(3).trim(), props: {} };
      } else if (current && line.startsWith('- ')) {
        const [key, ...valueParts] = line.slice(2).split(':');
        const value = valueParts.join(':').trim();
        if (key && value) current.props[key.trim()] = value;
      }
    }
    if (current) agents.push(current);
    const results = agents.map(a => ({
      id: a.name.toLowerCase().replace(/\s/g, '-'),
      name: a.name,
      status: a.props.status || 'active',
      role: a.props.role || null,
      build_count: parseInt(a.props.build_count) || 0,
      last_active: a.props.last_active || null
    }));
    res.json({ source: 'memory/agents.md', count: results.length, agents: results });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch agents', message: e.message });
  }
});

// Agent Detail Endpoint — Issue #415
app.get('/api/agents/:id', async (req, res) => {
  try {
    const agentId = req.params.id;
    if (!agentId) return res.status(400).json({ error: 'Agent ID required' });
    const raw_url = `${GITHUB_RAW_BASE}/memory/agents.md`;
    const content = await new Promise((resolve, reject) => {
      https.get(raw_url, (response) => {
        if (response.statusCode !== 200) { reject(new Error(`GitHub returned ${response.statusCode}`)); return; }
        let data = '';
        response.on('data', d => data += d);
        response.on('end', () => resolve(data));
      }).on('error', reject);
    });
    const lines = content.split('\n');
    const agents = [];
    let current = null;
    for (const line of lines) {
      if (line.startsWith('## ')) {
        if (current) agents.push(current);
        current = { name: line.slice(3).trim(), props: {}, desc_lines: [] };
      } else if (current && line.startsWith('- ')) {
        const [key, ...valueParts] = line.slice(2).split(':');
        const value = valueParts.join(':').trim();
        if (key && value) current.props[key.trim()] = value;
      } else if (current && line.trim() && !line.startsWith('#')) {
        current.desc_lines.push(line.trim());
      }
    }
    if (current) agents.push(current);
    const agent = agents.find(a => a.name.toLowerCase().replace(/\s/g, '-') === agentId.toLowerCase());
    if (!agent) return res.status(404).json({ error: 'Agent not found', id: agentId });
    res.json({
      id: agent.name.toLowerCase().replace(/\s/g, '-'),
      name: agent.name,
      status: agent.props.status || 'active',
      role: agent.props.role || null,
      build_count: parseInt(agent.props.build_count) || 0,
      last_active: agent.props.last_active || null,
      wallet: agent.props.wallet || null,
      description: agent.desc_lines.join(' ') || null,
      source: 'memory/agents.md'
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch agent detail', message: e.message });
  }
});

// Headless Markets Listings
app.get('/api/markets', async (req, res) => {
  try {
    const raw_url = `${GITHUB_RAW_BASE}/memory/markets.md`;
    const content = await new Promise((resolve, reject) => {
      https.get(raw_url, (response) => {
        if (response.statusCode !== 200) { reject(new Error(`GitHub returned ${response.statusCode}`)); return; }
        let data = '';
        response.on('data', d => data += d);
        response.on('end', () => resolve(data));
      }).on('error', reject);
    });
    const lines = content.split('\n');
    const listings = [];
    let current = null;
    for (const line of lines) {
      if (line.startsWith('## ')) {
        if (current) listings.push(current);
        current = { title: line.slice(3).trim(), props: {}, desc_lines: [] };
      } else if (current && line.startsWith('- ')) {
        const [key, ...valueParts] = line.slice(2).split(':');
        const value = valueParts.join(':').trim();
        if (key && value) current.props[key.trim()] = value;
      } else if (current && line.trim()) {
        current.desc_lines.push(line.trim());
      }
    }
    if (current) listings.push(current);
    const results = listings.map((l, i) => {
      const id = l.props.id || `listing-${i + 1}`;
      const priceStr = l.props.price || '0';
      const priceWei = parseFloat(priceStr);
      return {
        id,
        title: l.title,
        price_usdc: isNaN(priceWei) ? 0 : priceWei,
        seller: l.props.seller || null,
        category: l.props.category || null,
        description: l.desc_lines.join(' '),
        status: l.props.status || 'live'
      };
    });
    const paymentInfo = {
      protocol: 'x402',
      address: X402_PAYMENT_ADDRESS,
      version: X402_PAYMENT_VERSION,
      network: X402_NETWORK,
      chainId: X402_CHAIN_ID
    };
    res.json({ source: 'memory/markets.md', count: results.length, listings: results, payment: paymentInfo });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch markets', message: e.message });
  }
});

// x402 Payment Verification — Issue #46
app.post('/api/verify-payment', async (req, res) => {
  try {
    const { tx_hash, listing_id, memo } = req.body;
    if (!tx_hash || !listing_id) return res.status(400).json({ error: 'tx_hash and listing_id required' });
    if (!isValidTxHash(tx_hash)) return res.status(400).json({ error: 'Invalid transaction hash format' });
    if (VERIFIED_PAYMENTS.has(tx_hash)) {
      const cached = VERIFIED_PAYMENTS.get(tx_hash);
      return res.json({ verified: true, access_token: cached.access_token, cached: true });
    }
    const basescan_url = `https://api.basescan.org/api?module=proxy&action=eth_getTransactionByHash&txhash=${tx_hash}&apikey=YourApiKeyToken`;
    const txData = await new Promise((resolve, reject) => {
      https.get(basescan_url, (response) => {
        if (response.statusCode !== 200) { reject(new Error(`Basescan returned ${response.statusCode}`)); return; }
        let data = '';
        response.on('data', d => data += d);
        response.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });
    if (!txData.result || !txData.result.to) {
      return res.status(400).json({ verified: false, error: 'Transaction not found or pending' });
    }
    const txTo = txData.result.to.toLowerCase();
    const expectedTo = X402_PAYMENT_ADDRESS.toLowerCase();
    if (txTo !== expectedTo) {
      return res.status(400).json({ verified: false, error: 'Payment sent to incorrect address' });
    }
    const access_token = generateAccessToken(listing_id, memo || 'default');
    VERIFIED_PAYMENTS.set(tx_hash, { listing_id, access_token, verified_at: Date.now() });
    res.json({ verified: true, access_token, tx_hash });
  } catch (e) {
    res.status(500).json({ error: 'Payment verification failed', message: e.message });
  }
});

// Static Site
app.use(express.static(path.join(__dirname, 'site')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`nullpriest server running on port ${PORT}`);
});
