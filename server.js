require('dotenv').config();

const express = require('express');
const path    = require('path');
const cors    = require('cors');
const https   = require('https');

const app  = express();
const PORT = process.env.PORT || 3149;

// GitHub config for memory proxy
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/iono-such-things/nullpriest/master';
const GITHUB_API_BASE = 'https://api.github.com/repos/iono-such-things/nullpriest';

app.use(cors());
app.use(express.json());

// ── Static site ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'site')));

// ── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), agent: 'nullpriest', version: '2.1' });
});

// ── Agent status endpoint ───────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({
    agent: 'nullpriest',
    timestamp: new Date().toISOString(),
    cycle: {
      scout:      { schedule: '*/30 * * * *',  description: 'Scrapes SURVIVE, CLAWS, DAIMON. Writes memory/scout-latest.md' },
      strategist: { schedule: '0 * * * *',     description: 'Reads scout report. Opens agent-build GitHub issues.' },
      builder:    { schedule: '0 * * * *',     description: 'Picks top issue. Writes code. Commits to repo. Closes issue.' },
      publisher:  { schedule: '0 * * * *',     description: 'Reads build log. Posts to @nullPriest_. Updates activity feed.' }
    },
    contracts: {
      token:   '0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F',
      wallet:  '0xe5e3A482862E241A4b5Fb526cC050b830FBA29',
      pool:    '0xDb32c33fC9E2B6a068844CA59dd7Bc78E5c87e1f'
    },
    projects: [
      { name: 'headless-markets', status: 'building', description: 'YC for AI agents. 10% protocol fee on every agent token launch.' },
      { name: 'hvac-ai-secretary', status: 'deployed', description: 'Live B2B customer. AI phone secretary for HVAC companies.' },
      { name: 'nullpriest.xyz', status: 'self-improving', description: 'This site. Rebuilt hourly by Builder agent.' },
      { name: 'sshappy', status: 'building', description: 'React Native SSH manager.' }
    ]
  });
});

// ── Memory proxy ────────────────────────────────────────────────────────────
app.get('/memory/:filename', (req, res) => {
  const url = `${GITHUB_RAW_BASE}/memory/${req.params.filename}`;
  https.get(url, (ghRes) => {
    res.setHeader('Content-Type', ghRes.headers['content-type'] || 'text/plain');
    ghRes.pipe(res);
  }).on('error', (err) => {
    res.status(500).json({ error: 'GitHub fetch failed', details: err.message });
  });
});

// ── NULP price proxy ────────────────────────────────────────────────────────
// Reads live reserves from Uniswap V2 pool on Base via eth_call to getReserves()
// Pool: 0xDb32c33fC9E2B6a068844CA59dd7Bc78E5c87e1f (NULP/WETH)
// NULP decimals: 18, WETH decimals: 18
// Price = reserve1 (WETH) / reserve0 (NULP) * ETH_USD
// ETH/USD fetched from CoinGecko public API (no key required)

// Cache: refresh at most once per 30s to avoid hammering RPC
let priceCache = null;
let priceCacheAt = 0;
const CACHE_TTL_MS = 30_000;

// getReserves() selector: 0x0902f1ac
const GET_RESERVES_DATA = '0x0902f1ac';

function rpcCall(rpcUrl, method, params) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method, params });
    const url = new URL(rpcUrl);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('RPC parse error: ' + data.slice(0, 100))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: { 'User-Agent': 'nullpriest-agent/2.1' }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('HTTP parse error')); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function fetchLivePrice() {
  const RPC = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
  const POOL_ADDRESS = '0xDb32c33fC9E2B6a068844CA59dd7Bc78E5c87e1f';

  try {
    // 1. Call getReserves() on pool
    const reservesRes = await rpcCall(RPC, 'eth_call', [
      { to: POOL_ADDRESS, data: GET_RESERVES_DATA },
      'latest'
    ]);
    if (!reservesRes.result || reservesRes.result === '0x') {
      throw new Error('Pool returned empty reserves (pool may not exist at this address)');
    }

    // Parse reserves: first 32 bytes = reserve0, next 32 bytes = reserve1
    const hex = reservesRes.result.slice(2);
    const reserve0Hex = hex.slice(0, 64);
    const reserve1Hex = hex.slice(64, 128);
    const reserve0 = BigInt('0x' + reserve0Hex);
    const reserve1 = BigInt('0x' + reserve1Hex);

    if (reserve0 === 0n || reserve1 === 0n) {
      throw new Error('Zero reserves in pool');
    }

    // 2. Fetch ETH/USD from CoinGecko
    const cgData = await httpsGet('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    const ethUsd = cgData?.ethereum?.usd;
    if (!ethUsd) throw new Error('CoinGecko ETH price unavailable');

    // 3. Calculate NULP/USD
    // Price = (reserve1 / reserve0) * ETH_USD
    // Use floating point for final calculation
    const nulpPerWeth = Number(reserve0) / Number(reserve1);
    const nulpUsd = (1 / nulpPerWeth) * ethUsd;

    return {
      price: nulpUsd,
      reserve0: reserve0.toString(),
      reserve1: reserve1.toString(),
      ethUsd,
      pool: POOL_ADDRESS
    };
  } catch (err) {
    throw err;
  }
}

app.get('/api/price', async (req, res) => {
  const now = Date.now();
  if (priceCache && (now - priceCacheAt) < CACHE_TTL_MS) {
    return res.json({ ...priceCache, cached: true, age: Math.floor((now - priceCacheAt) / 1000) });
  }
  try {
    priceCache = await fetchLivePrice();
    priceCacheAt = now;
    res.json({ ...priceCache, cached: false });
  } catch (err) {
    res.status(500).json({ error: err.message, pool: '0xDb32c33fC9E2B6a068844CA59dd7Bc78E5c87e1f' });
  }
});

// ── Treasury endpoint ───────────────────────────────────────────────────────
// Returns ETH balance of nullpriest wallet on Base
let treasuryCache = null;
let treasuryCacheAt = 0;
const TREASURY_CACHE_TTL = 60_000; // 60s

app.get('/api/treasury', async (req, res) => {
  const now = Date.now();
  if (treasuryCache && (now - treasuryCacheAt) < TREASURY_CACHE_TTL) {
    return res.json({ ...treasuryCache, cached: true, age: Math.floor((now - treasuryCacheAt) / 1000) });
  }
  try {
    const RPC = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
    const WALLET = '0xe5e3A482862E241A4b5Fb526cC050b830FBA29';
    const balanceRes = await rpcCall(RPC, 'eth_getBalance', [WALLET, 'latest']);
    if (!balanceRes.result) throw new Error('RPC returned no balance');
    const weiBalance = BigInt(balanceRes.result);
    const ethBalance = Number(weiBalance) / 1e18;
    treasuryCache = { wallet: WALLET, balance: ethBalance, unit: 'ETH', chain: 'Base' };
    treasuryCacheAt = now;
    res.json({ ...treasuryCache, cached: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── /api/activity endpoint ──────────────────────────────────────────────────
// Reads memory/activity-feed.md from GitHub raw, parses markdown into JSON
// Format: ## YYYY-MM-DD HH:MM UTC\n**Title**\n- bullet1\n- bullet2\n\n---
let activityCache = null;
let activityCacheAt = 0;
const ACTIVITY_CACHE_TTL_MS = 60_000;

function parseActivityFeed(markdown) {
  const entries = [];
  const sections = markdown.split(/\n---\n/).filter(s => s.trim());
  for (const section of sections) {
    const lines = section.trim().split('\n');
    let date = null, title = null;
    const bullets = [];
    for (const line of lines) {
      if (line.startsWith('## ')) { date = line.slice(3).trim(); }
      else if (line.startsWith('**') && line.endsWith('**')) { title = line.slice(2, -2).trim(); }
      else if (line.startsWith('- ')) { bullets.push(line.slice(2).trim()); }
    }
    if (date || title) entries.push({ date, title, bullets });
  }
  return entries;
}

app.get('/api/activity', async (req, res) => {
  const now = Date.now();
  if (activityCache && (now - activityCacheAt) < ACTIVITY_CACHE_TTL_MS) {
    return res.json({ entries: activityCache, cached: true, age: Math.floor((now - activityCacheAt) / 1000) });
  }
  try {
    const url = `${GITHUB_RAW_BASE}/memory/activity-feed.md`;
    const data = await new Promise((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'nullpriest-agent/2.1' } }, (ghRes) => {
        let body = '';
        ghRes.on('data', chunk => body += chunk);
        ghRes.on('end', () => resolve(body));
      }).on('error', reject);
    });
    activityCache = parseActivityFeed(data);
    activityCacheAt = now;
    res.json({ entries: activityCache, cached: false, count: activityCache.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Fallback to index.html ──────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`nullpriest server running on port ${PORT}`);
});
