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

// ━━ Static site ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use(express.static(path.join(__dirname, 'site')));

// ━━ Health check ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), agent: 'nullpriest', version: '2.1' });
});

// ━━ Agent status endpoint ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
      pool:    '0xDb32c33fC9E2B6a068844CA59dd7Bc78E5c87e1f18'
    },
    projects: [
      { name: 'headless-markets', status: 'building', description: 'YC for AI agents. 10% protocol fee on every agent token launch.' },
      { name: 'hvac-ai-secretary', status: 'deployed', description: 'Live B2B customer. AI phone secretary for HVAC companies.' },
      { name: 'nullpriest.xyz', status: 'self-improving', description: 'This site. Rebuilt hourly by Builder agent.' },
      { name: 'sshappy', status: 'building', description: 'React Native SSH manager.' }
    ]
  });
});

// ━━ Memory proxy ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/memory/:filename', (req, res) => {
  const url = `${GITHUB_RAW_BASE}/memory/${req.params.filename}`;
  https.get(url, (ghRes) => {
    res.setHeader('Content-Type', ghRes.headers['content-type'] || 'text/plain');
    ghRes.pipe(res);
  }).on('error', (err) => {
    res.status(500).json({ error: 'GitHub fetch failed', details: err.message });
  });
});

// ━━ NULP price proxy ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Reads live reserves from Uniswap V2 pool on Base via eth_call to getReserves()
// Pool: 0xDb32c33fC9E2B6a068844CA59dd7Bc78E5c87e1f18 (NULP/WETH)
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
  const now = Date.now();
  if (priceCache && (now - priceCacheAt) < CACHE_TTL_MS) return priceCache;

  const BASE_RPC = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
  const POOL     = '0xDb32c33fC9E2B6a068844CA59dd7Bc78E5c87e1f18';

  // 1. Call getReserves() on pool
  const rpcResp = await rpcCall(BASE_RPC, 'eth_call', [
    { to: POOL, data: GET_RESERVES_DATA },
    'latest'
  ]);

  if (!rpcResp.result || rpcResp.result === '0x') {
    throw new Error('getReserves returned empty — pool may not exist at this address');
  }

  // Decode ABI: (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)
  const hex = rpcResp.result.slice(2);
  const reserve0 = BigInt('0x' + hex.slice(0, 64));   // NULP reserve (token0)
  const reserve1 = BigInt('0x' + hex.slice(64, 128));  // WETH reserve (token1)

  if (reserve0 === 0n) throw new Error('reserve0 is zero — pool uninitialized');

  // 2. Fetch ETH/USD from CoinGecko (free, no key)
  const geckoResp = await httpsGet(
    'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
  );
  const ethUsd = geckoResp?.ethereum?.usd;
  if (!ethUsd) throw new Error('CoinGecko ETH/USD fetch failed');

  // 3. Calculate price
  const ratioWethPerNulp = Number(reserve1) / Number(reserve0);
  const priceUSD = ratioWethPerNulp * ethUsd;

  // 4. Liquidity in USD = 2 * WETH_reserve * ETH_USD
  const wethReserveFloat = Number(reserve1) / 1e18;
  const liquidityUSD = Math.round(2 * wethReserveFloat * ethUsd);

  // 5. FDV: total supply is 1,000,000,000,000 (1T tokens, 18 decimals)
  const TOTAL_SUPPLY = 1_000_000_000_000;
  const fdvUSD = Math.round(priceUSD * TOTAL_SUPPLY);

  priceCache = {
    priceUSD,
    change24h: null,
    liquidity: liquidityUSD,
    fdv: fdvUSD,
    volume24h: null,
    ethUsd,
    reserve0: reserve0.toString(),
    reserve1: reserve1.toString(),
    source: 'base-rpc-live',
    timestamp: new Date().toISOString()
  };
  priceCacheAt = now;
  return priceCache;
}

app.get('/api/price', async (req, res) => {
  try {
    const data = await fetchLivePrice();
    res.json(data);
  } catch (err) {
    console.error('[price] live fetch failed:', err.message);
    if (priceCache) {
      res.json({ ...priceCache, stale: true, error: err.message });
    } else {
      res.status(503).json({
        priceUSD: null,
        change24h: null,
        liquidity: null,
        fdv: null,
        volume24h: null,
        source: 'error',
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

// ━━ Start server ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.listen(PORT, () => {
  console.log(`nullpriest site live → http://localhost:${PORT}`);
});