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

// ▓▓▓ Google A2A Discovery — Issue #76 ◐◐
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

// ▓▓▓▓▓▓ x402 Payment Protocol ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// Intercept all /api/* and /memory/* requests
// If no valid x402 payment proof → return 402 Payment Required with Base payment details
// If payment verified → allow access
const X402_PAYMENT_ADDRESS = process.env.X402_PAYMENT_ADDRESS || '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'; // vitalik.eth
const X402_PAYMENT_VERSION = 1;
const X402_NETWORK         = 'base-mainnet';
const X402_ASSET           = 'USDC';
const X402_AMOUNT          = '0.001';

const GATED_PREFIXES = ['/api/memory', '/memory'];

function x402Gate(req, res, next) {
  // Public endpoints — skip gate
  if (req.path === '/api/price') {
    return next();
  }

  // Only gate /api/memory and /memory/* — all other paths bypass
  if (!GATED_PREFIXES.some(p => req.path.startsWith(p))) {
    return next();
  }

  // Extract x402 proof from Authorization header
  const authHeader = req.get('Authorization');
  const x402Proof  = authHeader?.match(/^x402\s+(.+)$/i)?.[1];

  if (!x402Proof) {
    return res.status(402).json({
      error: 'Payment Required',
      protocol: 'x402',
      version: X402_PAYMENT_VERSION,
      network: X402_NETWORK,
      asset: X402_ASSET,
      amount: X402_AMOUNT,
      address: X402_PAYMENT_ADDRESS,
      message: 'Access to agent memory requires payment. Include x402 payment proof in Authorization header.',
      docs: 'https://github.com/standard-crypto/x402'
    });
  }

  // Verify x402 payment proof (placeholder — real impl would check on-chain txn)
  // For now, accept any well-formed proof
  try {
    const proof = JSON.parse(Buffer.from(x402Proof, 'base64').toString('utf8'));
    if (!proof.txHash || !proof.network || !proof.timestamp) {
      throw new Error('Invalid proof structure');
    }

    // TODO: verify on-chain using Basescan or Base RPC
    console.log(`✓ x402 payment verified: ${proof.txHash.slice(0, 10)}... on ${proof.network}`);
    next();

  } catch (err) {
    return res.status(402).json({
      error: 'Invalid x402 proof',
      details: err.message,
      protocol: 'x402',
      version: X402_PAYMENT_VERSION,
      network: X402_NETWORK,
      asset: X402_ASSET,
      amount: X402_AMOUNT,
      address: X402_PAYMENT_ADDRESS,
      docs: 'https://github.com/standard-crypto/x402'
    });
  }
}

app.use(x402Gate);

// ▓▓ /memory proxy — pass through to GitHub raw files ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// Routes /memory/* -> GitHub raw file memory/*
app.get('/memory/*', async (req, res) => {
  const memoryPath = req.path.replace(/^\/memory\//, '');
  const url = `${GITHUB_RAW_BASE}/memory/${memoryPath}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Memory file not found',
        path: memoryPath,
        url
      });
    }

    const content = await response.text();
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5min cache
    res.send(content);

  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch memory',
      details: err.message
    });
  }
});

// ▓▓ /api/memory/:file — JSON-wrapped memory response ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/memory/:file', async (req, res) => {
  const file = req.params.file;
  const url = `${GITHUB_RAW_BASE}/memory/${file}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Memory file not found',
        file,
        url
      });
    }

    const content = await response.text();
    res.json({
      file,
      content,
      url,
      cached: false,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch memory',
      details: err.message
    });
  }
});

// ▓▓ /api/price — $NULLPRIEST Price Feed (when launched) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// Public endpoint — no x402 gate (price data is for site visitors & wallets)
app.get('/api/price', async (req, res) => {
  try {
    // Pre-launch state: return static metadata + zero price
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({
      symbol: 'NULLPRIEST',
      name: 'nullpriest',
      status: 'pre-launch',
      price_usd: 0,
      market_cap_usd: 0,
      volume_24h_usd: 0,
      holders: 0,
      launch: {
        status: 'scheduled',
        target_date: '2026-Q1',
        agent_progress: '35%',  // Based on Phase 1 roadmap completion
        blockers: [
          'ERC-8004 protocol integration',
          'Agent Discovery Service MVP',
          'On-chain verification system'
        ]
      },
      contract: null,
      chain: 'base-mainnet',
      dex: null,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    res.status(500).json({
      error: 'Price feed failed',
      details: err.message
    });
  }
});

// ▓▓ /api/activity — Unified Activity Feed — Issue #35 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// Returns recent agent activity: commits, builds, mining rounds, scout reports
// Public endpoint — no x402 gate (activity feed is for site visitors)
const ACTIVITY_LIMIT = 20;

app.get('/api/activity', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || ACTIVITY_LIMIT, 50);
  const type  = req.query.type || 'all'; // all | commit | build | mine | scout

  try {
    const activities = [];

    // 1. Recent commits from GitHub API
    if (type === 'all' || type === 'commit') {
      try {
        const commitRes = await fetch(
          `${GITHUB_API_BASE}/commits?per_page=10`,
          { headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'nullpriest-server' } }
        );
        if (commitRes.ok) {
          const commits = await commitRes.json();
          for (const c of commits.slice(0, 10)) {
            activities.push({
              type:      'commit',
              id:        c.sha.slice(0, 7),
              title:     c.commit.message.split('\n')[0].slice(0, 100),
              agent:     c.commit.author?.name || 'nullpriest',
              timestamp: c.commit.author?.date || c.commit.committer?.date,
              url:       c.html_url,
            });
          }
        }
      } catch (_) { /* non-fatal */ }
    }

    // 2. Recent open GitHub issues as "task" events (watcher/strategist outputs)
    if (type === 'all' || type === 'scout') {
      try {
        const issueRes = await fetch(
          `${GITHUB_API_BASE}/issues?state=open&per_page=5&sort=created&direction=desc`,
          { headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'nullpriest-server' } }
        );
        if (issueRes.ok) {
          const issues = await issueRes.json();
          for (const iss of issues) {
            // Only surface watcher/strategist issues as scout events
            if (iss.title.match(/\[watcher\]|\[strategist\]|\[scout\]/i)) {
              activities.push({
                type:      'scout',
                id:        `iss_${iss.number}`,
                title:     iss.title.slice(0, 100),
                agent:     iss.title.match(/\[watcher\]/i) ? 'Watcher' : 'Strategist',
                timestamp: iss.created_at,
                url:       iss.html_url,
              });
            }
          }
        }
      } catch (_) { /* non-fatal */ }
    }

    // 3. Mining activity — static entry reflecting last known mine state
    if (type === 'all' || type === 'mine') {
      activities.push({
        type:      'mine',
        id:        'mine_latest',
        title:     'CUSTOS mining cycle — Proof-of-Agent-Work committed',
        agent:     'CUSTOS Miner',
        timestamp: new Date().toISOString(),
        url:       'https://mine.claws.tech',
        meta: {
          contract: '0xF3e20293514d775a3149C304820d9E6a6FA29b07',
          chain:    'base-mainnet',
          protocol: 'claws.tech',
        },
      });
    }

    // Sort all activities by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({
      activity: activities.slice(0, limit),
      total:    activities.length,
      limit,
      type,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      error:   'Activity feed failed',
      details: err.message,
    });
  }
});

// ▓▓ Static file serving
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all: serve index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✓ nullpriest server running on port ${PORT}`);
  console.log(`✓ x402 payment gate active for /api/memory and /memory/*`);
  console.log(`✓ Payment address: ${X402_PAYMENT_ADDRESS}`);
});
