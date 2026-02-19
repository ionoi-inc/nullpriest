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

// ── Static site ──────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'site')));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), agent: 'nullpriest', version: '2.1' });
});

// ── Agent status endpoint ────────────────────────────────────────────────────
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
      wallet:  '0xe5e3A4828628E241A4b5Fb526cC050b830FBA29',
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

// ── Memory proxy ─────────────────────────────────────────────────────────────
app.get('/memory/:filename', (req, res) => {
  const url = `${GITHUB_RAW_BASE}/memory/${req.params.filename}`;
  https.get(url, (ghRes) => {
    res.setHeader('Content-Type', ghRes.headers['content-type'] || 'text/plain');
    ghRes.pipe(res);
  }).on('error', (err) => {
    res.status(500).json({ error: 'GitHub fetch failed', details: err.message });
  });
});

// ── Activity feed endpoint ───────────────────────────────────────────────────
// Reads memory/activity-feed.md from disk, parses into JSON, caches 60s
let activityCache = null;
let activityCacheAt = 0;
const ACTIVITY_CACHE_TTL_MS = 60_000;

function parseActivityFeed(markdown) {
  const entries = [];
  const blocks = markdown.split(/\n(?=##\s)/);
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (!lines[0] || !lines[0].startsWith('## ')) continue;
    const header = lines[0].replace(/^##\s+/, '').trim();
    // header format: "YYYY-MM-DD HH:MM UTC — Title" or just "Title"
    const dashIdx = header.indexOf(' — ');
    let date = null, title = header;
    if (dashIdx !== -1) {
      date = header.slice(0, dashIdx).trim();
      title = header.slice(dashIdx + 3).trim();
    }
    const bullets = [];
    for (let i = 1; i < lines.length; i++) {
      const m = lines[i].match(/^\s*[-*]\s+(.+)/);
      if (m) bullets.push(m[1].trim());
    }
    entries.push({ date, title, bullets });
  }
  return entries;
}

app.get('/api/activity', async (req, res) => {
  const now = Date.now();
  if (activityCache && now - activityCacheAt < ACTIVITY_CACHE_TTL_MS) {
    return res.json(activityCache);
  }
  try {
    const fs = require('fs');
    const p = require('path').join(__dirname, 'memory', 'activity-feed.md');
    const md = fs.readFileSync(p, 'utf8');
    const entries = parseActivityFeed(md);
    activityCache = { entries, cached_at: new Date().toISOString(), source: 'local' };
    activityCacheAt = now;
    res.json(activityCache);
  } catch (err) {
    res.status(500).json({ error: 'activity feed unavailable', details: err.message });
  }
});

// ── NULP price proxy ─────────────────────────────────────────────────────────
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
  const POOL = '0xDb32c33fC9E2B6a068844CA59dd7Bc78E5c87e1f';

  try {
    // 1. Fetch reserves from pool
    const reservesResp = await rpcCall(RPC, 'eth_call', [
      { to: POOL, data: GET_RESERVES_DATA },
      'latest'
    ]);

    if (!reservesResp.result || reservesResp.result === '0x') {
      throw new Error('getReserves returned empty — pool may not exist at this address');
    }

    const hex = reservesResp.result.slice(2);
    const reserve0Hex = hex.slice(0, 64);
    const reserve1Hex = hex.slice(64, 128);
    const reserve0 = BigInt('0x' + reserve0Hex);
    const reserve1 = BigInt('0x' + reserve1Hex);

    if (reserve0 === 0n || reserve1 === 0n) {
      throw new Error('reserves are zero — pool may be empty or migrated');
    }

    // 2. Fetch ETH/USD from CoinGecko
    const cgUrl = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd';
    const cgData = await httpsGet(cgUrl);
    const ethUsd = cgData?.ethereum?.usd;

    if (!ethUsd) {
      throw new Error('CoinGecko ETH price unavailable');
    }

    // 3. Calculate NULP price
    // price_usd = (reserve1 / reserve0) * ethUsd
    const reserve0Float = Number(reserve0) / 1e18;
    const reserve1Float = Number(reserve1) / 1e18;
    const priceInEth = reserve1Float / reserve0Float;
    const priceUsd = priceInEth * ethUsd;

    // 4. Calculate 24h change (mock for now — need historical data source)
    const change24h = 0; // TODO: implement via price history

    return {
      price_usd: priceUsd,
      price_eth: priceInEth,
      change_24h: change24h,
      reserve0: reserve0Float,
      reserve1: reserve1Float,
      pool: POOL,
      timestamp: new Date().toISOString()
    };

  } catch (err) {
    throw new Error(`Price fetch failed: ${err.message}`);
  }
}

app.get('/api/price', async (req, res) => {
  const now = Date.now();
  if (priceCache && now - priceCacheAt < CACHE_TTL_MS) {
    return res.json({ ...priceCache, cached: true });
  }

  try {
    const price = await fetchLivePrice();
    priceCache = price;
    priceCacheAt = now;
    res.json({ ...price, cached: false });
  } catch (err) {
    res.status(500).json({ error: 'price unavailable', details: err.message });
  }
});

// ── Agent thoughts proxy ─────────────────────────────────────────────────────
app.get('/api/thoughts', (req, res) => {
  const url = `${GITHUB_RAW_BASE}/memory/scout-latest.md`;
  https.get(url, (ghRes) => {
    let md = '';
    ghRes.on('data', chunk => md += chunk);
    ghRes.on('end', () => {
      res.json({ raw: md, source: 'github', timestamp: new Date().toISOString() });
    });
  }).on('error', (err) => {
    res.status(500).json({ error: 'thoughts unavailable', details: err.message });
  });
});

// ── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`nullpriest server v2.1 live on port ${PORT}`);
  console.log(`/api/health | /api/status | /api/price | /api/thoughts | /memory/:file`);
});