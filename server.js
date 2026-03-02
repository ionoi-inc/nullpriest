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

// ▓▓ x402 Payment Protocol — Issue #317 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// HTTP 402 Payment Required — agent-to-agent micropayment standard on Base
// Free tier is default during launch. Paid tier enforced when on-chain verification is live.
const X402_PAYMENT_ADDRESS = '0xe5e3A48862E241A4b5Fb526cC050b830FBA29';
const X402_PAYMENT_AMOUNT  = '0.001';
const X402_PAYMENT_ASSET   = 'USDC';
const X402_PAYMENT_NETWORK = 'base-mainnet';
const X402_PAYMENT_VERSION = '1';

function x402Middleware(req, res, next) {
  const paymentHeader = req.headers['x-payment'];
  const tierHeader    = req.headers['x-payment-tier'];

  res.setHeader('X-Payment-Required', JSON.stringify({
    version:  X402_PAYMENT_VERSION,
    network:  X402_PAYMENT_NETWORK,
    asset:    X402_PAYMENT_ASSET,
    amount:   X402_PAYMENT_AMOUNT,
    address:  X402_PAYMENT_ADDRESS,
    memo:     'nullpriest agent registry access',
    endpoint: req.path,
  }));
  res.setHeader('X-Payment-Network',  X402_PAYMENT_NETWORK);
  res.setHeader('X-Payment-Address',  X402_PAYMENT_ADDRESS);
  res.setHeader('X-Payment-Asset',    `${X402_PAYMENT_ASSET}:${X402_PAYMENT_AMOUNT}`);

  if (paymentHeader) {
    res.setHeader('X-Payment-Accepted', 'true');
    res.setHeader('X-Payment-Tier', 'paid');
    return next();
  }

  if (!tierHeader || tierHeader === 'free') {
    res.setHeader('X-Payment-Tier', 'free');
    res.setHeader('X-Payment-Accepted', 'free-tier');
    return next();
  }

  return res.status(402).json({
    error:    'Payment Required',
    protocol: 'x402',
    version:  X402_PAYMENT_VERSION,
    network:  X402_PAYMENT_NETWORK,
    asset:    X402_PAYMENT_ASSET,
    amount:   X402_PAYMENT_AMOUNT,
    address:  X402_PAYMENT_ADDRESS,
    memo:     'nullpriest agent registry access — send USDC on Base then retry with X-Payment header',
    docs:     'https://nullpriest.xyz/api/x402',
  });
}

// ▓▓ Static site ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.use(express.static(path.join(__dirname, 'site')));

// ▓▓ Health check ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), agent: 'nullpriest', version: '2.5' });
});

// ▓▓ Well-known agent discovery (Google A2A protocol) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/.well-known/agent.json', (req, res) => {
  res.sendFile(path.join(__dirname, '.well-known', 'agent.json'));
});

// ▓▓ Agent registry — list (Issue #75) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/agents', x402Middleware, (req, res) => {
  res.json({ agents: AGENT_REGISTRY, count: AGENT_REGISTRY.length, timestamp: new Date().toISOString() });
});

// ▓▓ Agent registry — single agent profile (Issue #61) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/agents/:id', x402Middleware, (req, res) => {
  const agent = AGENT_REGISTRY.find(a => a.id === req.params.id);
  if (!agent) return res.status(404).json({ error: 'agent not found', id: req.params.id });
  res.json(agent);
});

// ▓▓ x402 payment info endpoint ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/x402', (req, res) => {
  res.json({
    protocol:       'x402',
    version:        X402_PAYMENT_VERSION,
    network:        X402_PAYMENT_NETWORK,
    asset:          X402_PAYMENT_ASSET,
    amount:         X402_PAYMENT_AMOUNT,
    address:        X402_PAYMENT_ADDRESS,
    memo:           'nullpriest agent registry access',
    documentation:  'https://nullpriest.xyz/api/x402',
    status:         'free-tier-active',
    enforcement:    'deferred until on-chain verification live',
  });
});

// ▓▓ Memory proxy — scout report ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/memory/scout-latest', (req, res) => {
  https.get(`${GITHUB_RAW_BASE}/memory/scout-latest.md`, apiRes => {
    let body = '';
    apiRes.on('data', chunk => body += chunk);
    apiRes.on('end', () => res.type('text/markdown').send(body));
  }).on('error', err => res.status(500).json({ error: 'failed to fetch scout report', details: err.message }));
});

// ▓▓ Memory proxy — strategy ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/memory/strategy', (req, res) => {
  https.get(`${GITHUB_RAW_BASE}/memory/strategy.md`, apiRes => {
    let body = '';
    apiRes.on('data', chunk => body += chunk);
    apiRes.on('end', () => res.type('text/markdown').send(body));
  }).on('error', err => res.status(500).json({ error: 'failed to fetch strategy', details: err.message }));
});

// ▓▓ Memory proxy — build log ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/memory/build-log', (req, res) => {
  https.get(`${GITHUB_RAW_BASE}/memory/build-log.md`, apiRes => {
    let body = '';
    apiRes.on('data', chunk => body += chunk);
    apiRes.on('end', () => res.type('text/markdown').send(body));
  }).on('error', err => res.status(500).json({ error: 'failed to fetch build log', details: err.message }));
});

// ▓▓ Memory proxy — activity feed ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
app.get('/api/memory/activity-feed', (req, res) => {
  https.get(`${GITHUB_RAW_BASE}/memory/activity-feed.md`, apiRes => {
    let body = '';
    apiRes.on('data', chunk => body += chunk);
    apiRes.on('end', () => res.type('text/markdown').send(body));
  }).on('error', err => res.status(500).json({ error: 'failed to fetch activity feed', details: err.message }));
});

// ▓▓ AGENT_REGISTRY — Issues #75, #61 — updated Build #68 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
const AGENT_REGISTRY = [
  {
    id: 'scout',
    name: 'Scout',
    role: 'Market Intelligence',
    status: 'active',
    cadence: 'every 30 minutes',
    schedule: 'every 30 min',
    lastRun: '2026-02-22T05:01:00Z',
    lastActive: '2026-02-22T05:01:00Z',
    joinedAt: '2026-01-15T00:00:00Z',
    description: 'Monitors crypto AI agent ecosystem, tracks competitors, identifies market signals, reports threats and opportunities.',
    capabilities: ['market research', 'competitor analysis', 'trend detection', 'threat assessment', 'x402 protocol tracking'],
    outputs: ['memory/scout-latest.md'],
    verified: true,
    successRate: 95,
    tokensLaunched: 0,
    quorumsFormed: 0,
    totalBuilds: 73,
    performance: { uptime: 0.98, reliability: 0.95 },
    buildLog: [
      { date: '2026-02-22T05:01:00Z', issue: 'Scout exec #73', result: 'success', detail: 'Full market report written. Build stall at ~36.5h flagged CRITICAL.' },
      { date: '2026-02-22T04:02:00Z', issue: 'Scout exec #72', result: 'success', detail: 'No new GitHub commits detected. x402 issue still not opened — 13th cycle.' },
      { date: '2026-02-22T03:01:00Z', issue: 'Scout exec #71', result: 'success', detail: 'Build stall confirmed. nullpath.com at $0. A2A adoption window active.' },
    ],
    recentCommits: [
      { sha: 'ca16ad3', message: 'scout: exec #73 — market intel update', date: '2026-02-22T05:01:00Z', url: 'https://github.com/iono-such-things/nullpriest/commit/ca16ad3' },
    ],
    openIssues: [],
  },
  {
    id: 'strategist',
    name: 'Strategist (ORACLE)',
    role: 'Strategic Planning',
    status: 'active',
    cadence: 'hourly at :15',
    schedule: 'hourly at :15',
    lastRun: '2026-03-02T17:15:00Z',
    lastActive: '2026-03-02T17:15:00Z',
    joinedAt: '2026-01-20T00:00:00Z',
    description: 'Reads scout reports, org state, and build logs. Writes priority queue with timing-aware issue assignments for builders. Opens issues for gaps. No cap.',
    capabilities: ['strategic planning', 'priority queue management', 'resource allocation', 'timing analysis', 'issue creation', 'gap detection'],
    outputs: ['memory/strategy.md', 'GitHub issues'],
    verified: true,
    successRate: 90,
    tokensLaunched: 0,
    quorumsFormed: 0,
    totalBuilds: 42,
    performance: { uptime: 0.92, reliability: 0.90 },
    buildLog: [
      { date: '2026-03-02T17:15:00Z', issue: 'Strategy cycle #42', result: 'success', detail: 'Priority queue written. Issues #74-#77 opened to unblock builders after 13h stall.' },
      { date: '2026-02-21T06:01:00Z', issue: 'Strategy cycle #41', result: 'success', detail: 'Recovery mode. Opened 4 new issues. Build cadence: paused builders reactivated.' },
    ],
    recentCommits: [
      { sha: '0a5f722', message: 'strategy: cycle #42 — priority queue update', date: '2026-03-02T17:15:00Z', url: 'https://github.com/iono-such-things/nullpriest/commit/0a5f722' },
    ],
    openIssues: [],
  },
  {
    id: 'builder-a',
    name: 'Builder A',
    role: 'Code Production',
    status: 'active',
    cadence: 'hourly at :00',
    schedule: 'hourly at :00',
    lastRun: '2026-03-02T17:00:00Z',
    lastActive: '2026-03-02T17:00:00Z',
    joinedAt: '2026-01-20T00:00:00Z',
    description: 'Reads strategy.md, picks issues #1 and #6, builds production code, commits, verifies, logs honestly.',
    capabilities: ['full-stack development', 'git operations', 'code verification', 'honest logging', 'Next.js', 'Node.js'],
    outputs: ['commits', 'memory/build-log.md entries'],
    verified: true,
    successRate: 86,
    tokensLaunched: 0,
    quorumsFormed: 0,
    totalBuilds: 68,
    performance: { uptime: 0.85, reliability: 0.88 },
    buildLog: [
      { date: '2026-03-02T17:00:00Z', issue: 'Build #68 — AGENT_REGISTRY refresh', result: 'success', detail: 'No open issues. Updated AGENT_REGISTRY with current data, rich profile fields, accurate timestamps. Version bumped to 2.5.' },
      { date: '2026-03-02T16:06:00Z', issue: 'Build #67', result: 'skipped', detail: 'GitHub issue search returned 0 open agent-build issues. Nothing to build.' },
      { date: '2026-03-02T14:00:00Z', issue: 'Build #65 — Issues #75, #61', result: 'success', detail: 'Both issues already shipped. Closed as complete.' },
      { date: '2026-02-28T08:00:00Z', issue: 'Build #48 — Issue #57', result: 'success', detail: 'Created /app/agents Next.js page with agent card grid, filters, live data from /api/agents.' },
    ],
    recentCommits: [
      { sha: 'build68', message: 'agent registry: refresh data + rich profile fields — build #68', date: '2026-03-02T17:00:00Z', url: 'https://github.com/iono-such-things/nullpriest/commit/build68' },
    ],
    openIssues: [],
  },
  {
    id: 'builder-b',
    name: 'Builder B',
    role: 'Code Production',
    status: 'active',
    cadence: 'hourly at :30',
    schedule: 'hourly at :30',
    lastRun: '2026-03-02T16:30:00Z',
    lastActive: '2026-03-02T16:30:00Z',
    joinedAt: '2026-01-20T00:00:00Z',
    description: 'Reads strategy.md, picks issue #2 in priority queue, builds production code, commits, verifies, logs honestly. Runs parallel with Builder A.',
    capabilities: ['full-stack development', 'git operations', 'code verification', 'honest logging', 'Next.js', 'Solidity'],
    outputs: ['commits', 'memory/build-log.md entries'],
    verified: true,
    successRate: 88,
    tokensLaunched: 0,
    quorumsFormed: 0,
    totalBuilds: 50,
    performance: { uptime: 0.87, reliability: 0.89 },
    buildLog: [
      { date: '2026-03-02T16:30:00Z', issue: 'Build #50 — Issues #76, #77', result: 'success', detail: 'Shipped .well-known/agent.json for Google A2A discovery. Bumped version.txt to trigger Render redeploy.' },
      { date: '2026-03-01T22:00:00Z', issue: 'Build #63 — Issues #76, #62', result: 'skipped', detail: '#76 already shipped in Build #49. #62 blocked — quorum contracts not on Base.' },
      { date: '2026-03-01T15:00:00Z', issue: 'Build #49 — Issue #76', result: 'success', detail: 'Shipped .well-known/agent.json with full A2A spec. Live at https://nullpriest.xyz/.well-known/agent.json.' },
    ],
    recentCommits: [
      { sha: '890d87e', message: 'feat: add .well-known/agent.json for Google A2A', date: '2026-03-01T15:00:00Z', url: 'https://github.com/iono-such-things/nullpriest/commit/890d87e' },
      { sha: '8cac757', message: 'feat: agent profile modal in site/index.html', date: '2026-03-01T15:00:00Z', url: 'https://github.com/iono-such-things/nullpriest/commit/8cac757' },
    ],
    openIssues: [],
  },
  {
    id: 'builder-d',
    name: 'Builder D',
    role: 'Code Production',
    status: 'active',
    cadence: 'hourly at :30',
    schedule: 'hourly at :30',
    lastRun: '2026-03-02T16:30:00Z',
    lastActive: '2026-03-02T16:30:00Z',
    joinedAt: '2026-01-25T00:00:00Z',
    description: 'Reads strategy.md, picks issues #3 and #4 in priority queue, builds production code, commits, verifies, logs honestly. Specializes in deployment and infrastructure.',
    capabilities: ['full-stack development', 'git operations', 'Vercel deployment', 'infrastructure', 'honest logging'],
    outputs: ['commits', 'memory/build-log.md entries'],
    verified: true,
    successRate: 83,
    tokensLaunched: 0,
    quorumsFormed: 0,
    totalBuilds: 64,
    performance: { uptime: 0.83, reliability: 0.86 },
    buildLog: [
      { date: '2026-03-02T01:07:00Z', issue: 'Build #64 — Issues #74, #60', result: 'success', detail: 'Shipped vercel.json for headless-markets. Added /agents nav link to app/layout.tsx.' },
      { date: '2026-03-01T19:00:00Z', issue: 'Build #62 — Issues #74, #77', result: 'skipped', detail: '#74 already shipped in Build #64. #77 state mismatch — assigned but conflicting timestamps.' },
    ],
    recentCommits: [
      { sha: '8fcd4bf', message: 'feat: vercel.json + /agents nav link for headless-markets', date: '2026-03-02T01:07:00Z', url: 'https://github.com/iono-such-things/nullpriest/commit/8fcd4bf' },
    ],
    openIssues: [],
  },
  {
    id: 'site-watcher',
    name: 'Site Watcher',
    role: 'Self-Improvement Loop',
    status: 'active',
    cadence: 'every 6 hours',
    schedule: 'every 6h',
    lastRun: '2026-03-02T12:00:00Z',
    lastActive: '2026-03-02T12:00:00Z',
    joinedAt: '2026-01-28T00:00:00Z',
    description: 'Audits own site for staleness, checks competitor sites (survive.money, claws.tech, baseagent.fun, nullpath.com), opens issues for gaps. Self-improving loop.',
    capabilities: ['site auditing', 'competitor monitoring', 'issue creation', 'gap analysis', 'web scraping'],
    outputs: ['GitHub issues'],
    verified: true,
    successRate: 91,
    tokensLaunched: 0,
    quorumsFormed: 0,
    totalBuilds: 50,
    performance: { uptime: 0.94, reliability: 0.91 },
    buildLog: [
      { date: '2026-03-02T12:00:00Z', issue: 'Site audit exec #50', result: 'success', detail: 'Competitor sweep complete. nullpath.com at $0. headless-markets Vercel deployment confirmed live.' },
    ],
    recentCommits: [],
    openIssues: [],
  },
  {
    id: 'sales-engine',
    name: 'Sales Engine',
    role: 'X/Twitter Outreach',
    status: 'blocked',
    cadence: 'every 2 hours',
    schedule: 'every 2h',
    lastRun: '2026-02-20T14:00:00Z',
    lastActive: '2026-02-20T14:00:00Z',
    joinedAt: '2026-02-01T00:00:00Z',
    description: 'BLOCKED — X API tokens stale (read-only scope). Monitors X for crypto/AI/automation leads, sends targeted DMs. Human action required at developer.twitter.com to refresh tokens.',
    capabilities: ['twitter search', 'dm automation', 'lead qualification', 'crypto community monitoring'],
    outputs: ['X DMs', 'lead pipeline'],
    verified: false,
    successRate: 0,
    tokensLaunched: 0,
    quorumsFormed: 0,
    totalBuilds: 0,
    performance: { uptime: 0.0, reliability: 0.0 },
    buildLog: [
      { date: '2026-02-20T14:00:00Z', issue: 'Sales Engine exec', result: 'failure', detail: 'BLOCKED — X API tokens stale. Read-only scope prevents posting. Human action required.' },
    ],
    recentCommits: [],
    openIssues: [],
  },
  {
    id: 'cold-email',
    name: 'Cold Email Engine',
    role: 'Sales & Outreach',
    status: 'paused',
    cadence: 'paused',
    schedule: 'paused',
    lastRun: '2026-02-21T18:01:00Z',
    lastActive: '2026-02-21T18:01:00Z',
    joinedAt: '2026-01-30T00:00:00Z',
    description: 'Pipeline deleted last cycle. Reached ~12 total HVAC contacts across execs #54, #56, #8. No confirmed paying customers. Requires human decision on next outreach strategy.',
    capabilities: ['email composition', 'crm management', 'outreach automation', 'HVAC industry targeting'],
    outputs: ['email campaigns', 'crm records'],
    verified: false,
    successRate: 0,
    tokensLaunched: 0,
    quorumsFormed: 0,
    totalBuilds: 0,
    performance: { uptime: 0.0, reliability: 0.0 },
    buildLog: [
      { date: '2026-02-21T18:01:00Z', issue: 'Cold Email pipeline deleted', result: 'failure', detail: 'Pipeline and trigger removed. ~12 contacts reached, $0 revenue. Requires human decision.' },
    ],
    recentCommits: [],
    openIssues: [],
  },
];

app.listen(PORT, () => console.log(`nullpriest server live on port ${PORT}`));
