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

// ━━ Static site ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use(express.static(path.join(__dirname, 'site')));

// ━━ Health check ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), agent: 'nullpriest', version: '2.0' });
});

// ━━ Agent status endpoint ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Agents call this to report their state. Frontend reads it for live display.
// Usage: GET /api/status
// Returns: last known state of all four watchers
app.get('/api/status', (req, res) => {
  // In future this reads from a local state file written by agents
  // For now returns structural info the frontend can display
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
      pool:    '0xDb32c33fC9E2B6a06844CA59dd7Bc78E5c87e1f18'
    },
    projects: [
      { name: 'headless-markets', status: 'building', description: 'YC for AI agents. 10% protocol fee on every agent token launch.' },
      { name: 'hvac-ai-secretary', status: 'deployed', description: 'Live B2B customer. AI phone secretary for HVAC companies.' },
      { name: 'nullpriest.xyz', status: 'self-improving', description: 'This site. Rebuilt hourly by Builder agent.' },
      { name: 'sshappy', status: 'building', description: 'React Native SSH manager.' }
    ]
  });
});

// ━━ Memory proxy ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Proxies /memory/<file> requests to GitHub raw content
// Allows agents to write markdown files to /memory/* in repo and site to read them live
// Example: GET /memory/scout-latest.md -> proxies to raw.githubusercontent.com/.../memory/scout-latest.md
app.get('/memory/:filename', async (req, res) => {
  const { filename } = req.params;
  const rawUrl = `${GITHUB_RAW_BASE}/memory/${filename}`;
  
  try {
    const response = await fetch(rawUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'File not found in GitHub repo', path: `/memory/${filename}` });
    }
    const content = await response.text();
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.send(content);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch from GitHub', message: err.message });
  }
});

// ━━ Token price endpoint ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Proxies price data from DexScreener for $NULP token
// Frontend calls this to display live token price
// Usage: GET /api/price
// Returns: { price: '0.000123', priceUsd: '0.000123', liquidity: { usd: 12345 }, volume: { h24: 1234 }, priceChange: { h24: 5.2 } }
app.get('/api/price', async (req, res) => {
  const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/tokens/0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F';
  
  try {
    const response = await fetch(DEXSCREENER_API);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch price from DexScreener' });
    }
    
    const data = await response.json();
    
    // DexScreener returns { pairs: [ ... ] }
    // We want the first pair (should be the main ETH pair)
    if (!data.pairs || data.pairs.length === 0) {
      return res.status(404).json({ error: 'No trading pairs found for token' });
    }
    
    const pair = data.pairs[0];
    
    // Return structure that matches what site/index.html JS expects
    res.json({
      price: pair.priceUsd || '0',
      priceUsd: pair.priceUsd || '0',
      change24h: pair.priceChange?.h24 || 0,
      mcap: pair.marketCap || pair.fdv || 0,
      volume24h: pair.volume?.h24 || 0,
      liquidity: pair.liquidity?.usd || 0,
      fdv: pair.fdv || 0,
      marketCap: pair.marketCap || 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch price data', message: err.message });
  }
});

// ━━ Catch-all: serve index.html for client-side routing ━━━━━━━━━━━━━
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

// ━━ Start server ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.listen(PORT, () => {
  console.log(`✓ nullpriest server running on http://localhost:${PORT}`);
  console.log(`✓ Memory proxy: /memory/<file> → GitHub raw content`);
  console.log(`✓ Price API: /api/price → DexScreener`);
  console.log(`✓ Agent status: /api/status`);
});
