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

app.use(cors());
app.use(express.json());

// ▓▓▓ Google A2A Discovery — Issue #76 ◀◀
// Serves /.well-known/agent.json for A2A-enabled agent crawlers
// TIMING-SENSITIVE: A2A adoption window is 2026 Q1
app.get('/.well-known/agent.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    schema_version: '1.0',
    name: 'nullpriest',
    description: 'A network of autonomous AI agents building on-chain infrastructure, shipping code, and generating revenue on Base L2. Named agents. Real output. Ships daily.',
    url: 'https://nullpriest.xyz',
    provider: {
      organization: 'nullpriest',
      url: 'https://nullpriest.xyz'
    },
    version: '1.0.0',
    documentationUrl: 'https://nullpriest.xyz',
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: false
    },
    authentication: {
      schemes: ['x402'],
      x402: {
        network: 'base-mainnet',
        asset: 'USDC',
        amount: '0.001',
        address: X402_PAYMENT_ADDRESS,
        version: X402_PAYMENT_VERSION
      }
    },
    defaultInputModes: ['application/json'],
    defaultOutputModes: ['application/json'],
    skills: [
      {
        id: 'agent-registry',
        name: 'Agent Registry',
        description: 'Discover and verify autonomous AI agents building on Base L2. Access agent metadata, build history, and on-chain verification status.',
        tags: ['agents', 'registry', 'base', 'on-chain', 'verification'],
        inputModes: ['application/json'],
        outputModes: ['application/json']
      },
      {
        id: 'agent-discovery',
        name: 'Agent Discovery',
        description: 'Search and filter agents by capability, on-chain status, and quorum membership. Verified collaboration before token launch.',
        tags: ['discovery', 'search', 'marketplace', 'quorum'],
        inputModes: ['application/json'],
        outputModes: ['application/json']
      }
    ]
  });
});

// ▓▓▓▓▓▓ x402 Payment Protocol ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// Intercept all /api/* and /memory/* requests
// If no valid x402 payment proof → return 402 Payment Required with Base payment details
// If payment verified → serve the resource
const X402_PAYMENT_ADDRESS = process.env.X402_PAYMENT_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
const X402_PAYMENT_VERSION = '1.0';
const X402_PAYMENT_AMOUNT  = '0.001'; // USDC
const X402_PAYMENT_ASSET   = 'USDC';
const X402_PAYMENT_NETWORK = 'base-mainnet';

// x402 middleware — payment gate for premium APIs
function x402PaymentGate(req, res, next) {
  // Check for payment proof header
  const paymentProof = req.headers['x-payment-proof'];
  
  if (!paymentProof) {
    return res.status(402).json({
      error: 'Payment Required',
      payment: {
        protocol: 'x402',
        version: X402_PAYMENT_VERSION,
        network: X402_PAYMENT_NETWORK,
        asset: X402_PAYMENT_ASSET,
        amount: X402_PAYMENT_AMOUNT,
        address: X402_PAYMENT_ADDRESS,
        message: 'Send payment on Base to access this API endpoint',
      },
      documentation: 'https://nullpriest.xyz/docs/x402',
    });
  }

  // TODO: Verify payment proof on-chain
  // For now, accept any non-empty proof during development
  next();
}

// Apply x402 gate to premium endpoints
app.use('/api/agents', x402PaymentGate);
app.use('/memory', x402PaymentGate);

// ▓▓ /api/agents — Agent Registry ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// Returns list of all nullpriest agents with metadata, build count, and verification status
app.get('/api/agents', (req, res) => {
  const agents = [
    {
      id: 'agt_nullpriest_core',
      name: 'nullpriest',
      slug: 'nullpriest',
      description: 'Core orchestrator and strategy agent. Coordinates build queue, mining operations, and quorum governance.',
      capabilities: ['orchestration', 'strategy', 'governance', 'mining'],
      build_count: 97,
      verified: true,
      on_chain_address: null, // Pre-launch
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-15T00:00:00Z',
      last_build: '2026-03-03T22:00:00Z',
    },
    {
      id: 'agt_custos_miner',
      name: 'CUSTOS Miner',
      slug: 'custos-miner',
      description: 'Autonomous $CUSTOS mining agent. Commits to Proof-of-Agent-Work rounds on Base via claws.tech protocol.',
      capabilities: ['mining', 'on-chain-execution', 'proof-of-work'],
      build_count: 12,
      verified: true,
      on_chain_address: null, // Wallet pending
      mining_contract: '0xF3e20293514d775a3149C304820d9E6a6FA29b07',
      github: 'iono-such-things/nullpriest',
      created_at: '2026-02-28T00:00:00Z',
      last_mine: '2026-03-03T23:00:00Z',
    },
  ];

  res.json({
    agents,
    total: agents.length,
    quorum_size: 2,
    verified_count: agents.filter(a => a.verified).length,
    timestamp: new Date().toISOString(),
  });
});

// ▓▓ /memory/* — GitHub-backed memory proxy ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// Proxies /memory/* to GitHub raw content
// Example: /memory/context.md → https://raw.githubusercontent.com/.../memory/context.md
app.get('/memory/*', async (req, res) => {
  const filePath = req.path.replace('/memory/', 'memory/');
  const rawUrl = `${GITHUB_RAW_BASE}/${filePath}`;

  try {
    const response = await fetch(rawUrl);
    
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'File not found in GitHub repository',
        path: filePath,
        github_status: response.status,
      });
    }

    const content = await response.text();
    const contentType = filePath.endsWith('.json') ? 'application/json' :
                        filePath.endsWith('.md')   ? 'text/markdown' : 'text/plain';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.send(content);
  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch from GitHub',
      details: err.message,
    });
  }
});

// ▓▓ NULP Price Proxy — Issue #374 / #386 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// Proxies DexScreener API to avoid CORS and keep pair address in one place.
// Returns { price, change24h, volume24h, liquidity, marketCap, timestamp }
const NULP_PAIR_ADDRESS = '0x2128cf8f508dde2202c6cd5df70be635f975a4f9db46a00789e6439d62518e5c';
const DEXSCREENER_API   = `https://api.dexscreener.com/latest/dex/pairs/base/${NULP_PAIR_ADDRESS}`;

app.get('/api/price', async (req, res) => {
  try {
    const response = await fetch(DEXSCREENER_API, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      return res.status(502).json({
        error: 'DexScreener upstream error',
        status: response.status,
        pair: NULP_PAIR_ADDRESS,
      });
    }

    const data = await response.json();
    const pair = data?.pair ?? data?.pairs?.[0];

    if (!pair) {
      return res.status(404).json({
        error: 'Pair not found',
        pair: NULP_PAIR_ADDRESS,
      });
    }

    res.setHeader('Cache-Control', 'public, max-age=30'); // 30s cache
    res.json({
      symbol:     'NULP',
      price:      pair.priceUsd ?? null,
      change24h:  pair.priceChange?.h24 ?? null,
      volume24h:  pair.volume?.h24 ?? null,
      liquidity:  pair.liquidity?.usd ?? null,
      marketCap:  pair.marketCap ?? pair.fdv ?? null,
      pair:       NULP_PAIR_ADDRESS,
      dex:        pair.dexId ?? 'uniswap',
      chain:      'base',
      timestamp:  new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      error:   'Price fetch failed',
      details: err.message,
      pair:    NULP_PAIR_ADDRESS,
    });
  }
});

// ▓▓ Static file serving ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✓ nullpriest server running on port ${PORT}`);
  console.log(`✓ x402 payment gate active on /api/agents and /memory/*`);
  console.log(`✓ Payment address: ${X402_PAYMENT_ADDRESS}`);
});
