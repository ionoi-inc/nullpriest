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

const X402_PAYMENT_ADDRESS = process.env.X402_PAYMENT_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc97595f0bEbc';
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
      contracts: { custos: '0xF3e202935147775a3149C3048220d9E6a6FA29b07' }
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
      if (line.match(/^#{2,3}\s+/)) {
        if (current) agents.push(current);
        const nameMatch = line.match(/^#+\s+(.+)$/);
        current = { name: nameMatch ? nameMatch[1].trim() : '', slug: '', id: '', build_count: 0, capabilities: [], status: 'active' };
      } else if (current) {
        const slugMatch = line.match(/^\*\*Slug:\*\*\s*(.+)$/i);
        const idMatch = line.match(/^\*\*ID:\*\*\s*(.+)$/i);
        const buildMatch = line.match(/^\*\*Build count:\*\*\s*(\d+)/i);
        const capMatch = line.match(/^\*\*Capabilities:\*\*\s*(.+)$/i);
        const statusMatch = line.match(/^\*\*Status:\*\*\s*(.+)$/i);
        if (slugMatch) current.slug = slugMatch[1].trim();
        if (idMatch) current.id = idMatch[1].trim();
        if (buildMatch) current.build_count = parseInt(buildMatch[1]);
        if (capMatch) current.capabilities = capMatch[1].split(',').map(c => c.trim());
        if (statusMatch) current.status = statusMatch[1].trim().toLowerCase();
      }
    }
    if (current) agents.push(current);
    res.json({ source: 'memory/agents.md', count: agents.length, agents });
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
    }).on('error', reject);
    });
    const lines = content.split('\n');
    const agents = [];
    let current = null;
    for (const line of lines) {
      if (line.match(/^#{2,3}\s+/)) {
        if (current) agents.push(current);
        const nameMatch = line.match(/^#+\s+(.+)$/);
        current = { name: nameMatch ? nameMatch[1].trim() : '', slug: '', id: '', build_count: 0, capabilities: [], status: 'active', description: '' };
      } else if (current) {
        const slugMatch = line.match(/^\*\*Slug:\*\*\s*(.+)$/i);
        const idMatch = line.match(/^\*\*ID:\*\*\s*(.+)$/i);
        const buildMatch = line.match(/^\*\*Build count:\*\*\s*(\d+)/i);
        const capMatch = line.match(/^\*\*Capabilities:\*\*\s*(.+)$/i);
        const statusMatch = line.match(/^\*\*Status:\*\*\s*(.+)$/i);
        const descMatch = line.match(/^\*\*Description:\*\*\s*(.+)$/i);
        if (slugMatch) current.slug = slugMatch[1].trim();
        if (idMatch) current.id = idMatch[1].trim();
        if (buildMatch) current.build_count = parseInt(buildMatch[1]);
        if (capMatch) current.capabilities = capMatch[1].split(',').map(c => c.trim());
        if (statusMatch) current.status = statusMatch[1].trim().toLowerCase();
        if (descMatch) current.description = descMatch[1].trim();
      }
    }
    if (current) agents.push(current);
    const agent = agents.find(a =>
      a.id === agentId ||
      a.slug === agentId ||
      a.name.toLowerCase().replace(/\s+/g, '-') === agentId.toLowerCase()
    );
    if (!agent) return res.status(404).json({ error: 'Agent not found', id: agentId });
    res.json({ source: 'memory/agents.md', agent });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch agent detail', message: e.message });
  }
});

// Static Site
app.use(express.static(path.join(__dirname, 'site')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`nullpriest server listening on port ${PORT}`);
});
