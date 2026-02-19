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

// ━━ Static site ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use(express.static(path.join(__dirname, 'site')));

// ━━ Health check ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), agent: 'nullpriest', version: '2.1' });
});

// ━━ Agent status endpoint ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

// ━━ Memory proxy ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/memory/:filename', (req, res) => {
  const url = `${GITHUB_RAW_BASE}/memory/${req.params.filename}`;
  https.get(url, (ghRes) => {
    res.setHeader('Content-Type', ghRes.headers['content-type'] || 'text/plain');
    ghRes.pipe(res);
  }).on('error', (err) => {
    res.status(500).json({ error: 'GitHub fetch failed', details: err.message });
  });
});

// ━━ NULP price proxy ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
    const callResult = await rpcCall(RPC, 'eth_call', [
      { to: POOL, data: GET_RESERVES_DATA },
      'latest'
    ]);

    if (!callResult.result || callResult.result === '0x') {
      return { error: 'Pool returned empty reserves' };
    }

    // Parse reserves: getReserves() returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)
    // Each uint112 = 28 bytes hex = 56 chars, but padded to 32 bytes = 64 chars in ABI encoding
    const hex = callResult.result.slice(2); // remove 0x
    const reserve0Hex = hex.slice(0, 64);
    const reserve1Hex = hex.slice(64, 128);

    const reserve0 = BigInt('0x' + reserve0Hex);
    const reserve1 = BigInt('0x' + reserve1Hex);

    if (reserve0 === 0n || reserve1 === 0n) {
      return { error: 'One or both reserves are zero' };
    }

    // 2. Fetch ETH/USD price from CoinGecko
    const cgData = await httpsGet('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    const ethUsd = cgData?.ethereum?.usd;

    if (!ethUsd) {
      return { error: 'Failed to fetch ETH/USD price' };
    }

    // 3. Calculate NULP/USD price
    // Price = (reserve1 / reserve0) * ETH_USD
    // Use floating point for display (reserves are in 18 decimals for both tokens, so they cancel out)
    const reserve0Float = Number(reserve0) / 1e18;
    const reserve1Float = Number(reserve1) / 1e18;
    const nulpPrice = (reserve1Float / reserve0Float) * ethUsd;

    // 4. Calculate market metrics
    const nulpLiquidity = reserve0Float * nulpPrice;
    const wethLiquidity = reserve1Float * ethUsd;
    const fdv = nulpPrice * 1_000_000_000; // 1B supply

    return {
      price: nulpPrice,
      fdv: fdv,
      liquidity: nulpLiquidity + wethLiquidity,
      reserves: {
        nulp: reserve0Float,
        weth: reserve1Float
      },
      ethPrice: ethUsd
    };
  } catch (err) {
    return { error: err.message };
  }
}

app.get('/api/price', async (req, res) => {
  const now = Date.now();

  // Return cache if fresh
  if (priceCache && (now - priceCacheAt) < CACHE_TTL_MS) {
    return res.json({ ...priceCache, cached: true, age: Math.floor((now - priceCacheAt) / 1000) });
  }

  // Fetch fresh price
  const result = await fetchLivePrice();

  if (result.error) {
    return res.status(500).json({ error: result.error, timestamp: new Date().toISOString() });
  }

  // Update cache
  priceCache = { ...result, timestamp: new Date().toISOString() };
  priceCacheAt = now;

  res.json({ ...priceCache, cached: false });
});

// ━━ Fallback ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`nullpriest server live on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
  console.log(`Status: http://localhost:${PORT}/api/status`);
  console.log(`Price:  http://localhost:${PORT}/api/price`);
});
