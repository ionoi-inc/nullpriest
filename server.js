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
    const ethPrice = priceData?.ethereum?.usd || 0;
    const custosPrice = ethPrice * 0.00042;
    res.setHeader('X-402-Accept', `${X402_PAYMENT_ADDRESS}/${X402_PAYMENT_VERSION}`);
    res.setHeader('X-402-Network', X402_NETWORK);
    res.setHeader('X-402-Chain-Id', X402_CHAIN_ID.toString());
    res.json({
      custos: { usd: custosPrice.toFixed(6), eth: '0.00042' },
      eth: { usd: ethPrice },
      x402: { payment_address: X402_PAYMENT_ADDRESS, network: X402_NETWORK, chain_id: X402_CHAIN_ID, version: X402_PAYMENT_VERSION }
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch price', message: e.message });
  }
});

// Agent registry — shared source of truth for list and detail endpoints
const AGENTS = [
  {
    id: 'nullpriest-scout', name: 'Scout', role: 'Intelligence', status: 'active',
    cycle: 'every 30min', last_exec: '2026-02-22 05:01 UTC', build_count: 73,
    description: 'Monitors market intelligence, competitor signals, and org state. Writes scout-latest.md every cycle.',
    capabilities: ['web_search', 'github_read', 'market_intel'],
    outputs: ['memory/scout-latest.md']
  },
  {
    id: 'nullpriest-strategist', name: 'Strategist', role: 'Planning', status: 'active',
    cycle: 'hourly at :15', last_exec: '2026-03-04 08:19 UTC', build_count: 43,
    description: 'Reads scout report and org state, produces prioritized issue queue in strategy.md each cycle.',
    capabilities: ['github_read', 'github_write', 'issue_triage'],
    outputs: ['memory/strategy.md']
  },
  {
    id: 'nullpriest-builder-a', name: 'Builder A', role: 'Engineering', status: 'active',
    cycle: 'hourly at :00', last_exec: null, priority_issues: [1, 6], build_count: 107,
    description: 'Builds issues #1 and #6 from strategy.md priority queue each cycle.',
    capabilities: ['github_read', 'github_write', 'code_generation'],
    outputs: ['server.js', 'site/index.html', 'memory/build-log.md']
  },
  {
    id: 'nullpriest-builder-b', name: 'Builder B', role: 'Engineering', status: 'active',
    cycle: 'hourly at :30', last_exec: '2026-03-05 03:00 UTC', priority_issues: [2, 7], build_count: 107,
    description: 'Builds issues #2 and #7 from strategy.md priority queue each cycle.',
    capabilities: ['github_read', 'github_write', 'code_generation'],
    outputs: ['server.js', 'site/index.html', 'memory/build-log.md']
  }
];

// Agents List API — Issue #58
app.get('/api/agents', (req, res) => {
  const summary = AGENTS.map(({ id, name, role, status, cycle, last_exec, build_count, priority_issues }) => ({
    id, name, role, status, cycle, last_exec, build_count, ...(priority_issues ? { priority_issues } : {})
  }));
  res.json({ count: summary.length, agents: summary });
});

// Agent Detail API — Issue #415
app.get('/api/agents/:id', (req, res) => {
  const agent = AGENTS.find(a => a.id === req.params.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found', id: req.params.id, available: AGENTS.map(a => a.id) });
  }
  res.json(agent);
});

// Static site
app.use(express.static(path.join(__dirname, 'site')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`nullpriest server running on port ${PORT}`);
  console.log(`Memory proxy: /memory/*`);
  console.log(`A2A discovery: /.well-known/agent.json`);
  console.log(`Activity feed: /api/activity`);
  console.log(`Price endpoint: /api/price (x402-enabled)`);
  console.log(`Agents API: /api/agents`);
  console.log(`Agent detail: /api/agents/:id`);
});