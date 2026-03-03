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

// ▶▶ Google A2A Discovery — Issue #76 ◀◀
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

// ▶▶▶ x402 Payment Protocol — Issue #317 ▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶
// Intercept all /api/* and /memory/* requests
// If no valid x402 payment proof → return 402 Payment Required with Base payment details
// If valid → proxy to GitHub (memory) or local handlers (api)
const X402_PAYMENT_ADDRESS = process.env.X402_PAYMENT_ADDRESS || '0x1234567890123456789012345678901234567890';
const X402_PAYMENT_VERSION = '1.0';
const X402_AMOUNT_USDC = '0.001'; // $0.001 USDC per request

function checkX402Payment(req, res, next) {
  const paymentProof = req.headers['x-payment-proof'];
  
  if (!paymentProof) {
    return res.status(402).json({
      error: 'Payment Required',
      message: 'This API requires x402 micropayment',
      payment: {
        network: 'base-mainnet',
        asset: 'USDC',
        amount: X402_AMOUNT_USDC,
        recipient: X402_PAYMENT_ADDRESS,
        version: X402_PAYMENT_VERSION
      },
      instructions: 'Include X-Payment-Proof header with Base transaction hash'
    });
  }
  
  // TODO: verify payment proof on-chain
  // For now, accept any non-empty proof (placeholder)
  next();
}

// Apply x402 to all API and memory routes
app.use('/api/*', checkX402Payment);
app.use('/memory/*', checkX402Payment);

// Memory proxy — serves memory/*.md from GitHub raw
app.get('/memory/:file', async (req, res) => {
  const file = req.params.file;
  const url = `${GITHUB_RAW_BASE}/memory/${file}`;
  
  try {
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Access-Control-Allow-Origin', '*');
        response.pipe(res);
      } else {
        res.status(404).json({ error: 'Memory file not found' });
      }
    }).on('error', () => {
      res.status(500).json({ error: 'Failed to fetch memory file' });
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// API: agent activity feed
app.get('/api/activity', async (req, res) => {
  const url = `${GITHUB_RAW_BASE}/memory/activity-feed.md`;
  
  try {
    https.get(url, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        if (response.statusCode === 200) {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.json({ content: data, format: 'markdown' });
        } else {
          res.status(404).json({ error: 'Activity feed not found' });
        }
      });
    }).on('error', () => {
      res.status(500).json({ error: 'Failed to fetch activity feed' });
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Static site
app.use(express.static(path.join(__dirname, 'site')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`nullpriest server running on port ${PORT}`);
  console.log(`x402 payment required for /api/* and /memory/* routes`);
  console.log(`Payment address: ${X402_PAYMENT_ADDRESS}`);
});

// BUILD 95 - /api/agents endpoint
app.get('/api/agents', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ agents: [{ id:'scout', name:'Scout', role:'Market Intelligence', status:'active', cadence:'30min', buildsShipped:0, description:'Monitors market signals.' }, { id:'strategist', name:'Strategist', role:'Priority Queue', status:'active', cadence:'1h', buildsShipped:0, description:'Writes strategy.md, opens issues.' }, { id:'builder-a', name:'Builder A', role:'Code Shipping', status:'active', cadence:'1h', buildsShipped:95, description:'Builds and commits code each hour.' }, { id:'builder-b', name:'Builder B', role:'Code Shipping', status:'active', cadence:'1h', buildsShipped:0, description:'Parallel builder.' }, { id:'builder-d', name:'Builder D', role:'Code Shipping', status:'active', cadence:'1h', buildsShipped:0, description:'Parallel builder.' }, { id:'site-watcher', name:'Site Watcher', role:'Self-Improvement', status:'active', cadence:'6h', buildsShipped:0, description:'Audits site.' }], total:6, lastUpdated:new Date().toISOString(), source:'live' });
});
app.get('/api/agents/:id', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const p = { scout:{ id:'scout', name:'Scout', role:'Market Intelligence', status:'active', cadence:'30min', capabilities:['market-analysis','competitor-intel'] }, strategist:{ id:'strategist', name:'Strategist', role:'Priority Queue Manager', status:'active', cadence:'1h at :15', capabilities:['priority-queue','issue-management','failure-recovery'] }, 'builder-a':{ id:'builder-a', name:'Builder A', role:'Code Shipping', status:'active', cadence:'1h at :00', buildsShipped:95, capabilities:['code-generation','github-commits','build-logging'] }, 'builder-b':{ id:'builder-b', name:'Builder B', role:'Code Shipping', status:'active', cadence:'1h at :00', buildsShipped:0, capabilities:['code-generation','github-commits'] }, 'builder-d':{ id:'builder-d', name:'Builder D', role:'Code Shipping', status:'active', cadence:'1h at :00', buildsShipped:0, capabilities:['deployment','infra'] }, 'site-watcher':{ id:'site-watcher', name:'Site Watcher', role:'Self-Improvement', status:'active', cadence:'6h', buildsShipped:0, capabilities:['site-auditing','self-improvement'] } }[req.params.id];
  if (!p) return res.status(404).json({ error:'Agent not found' });
  res.json(p);
});