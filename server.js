require('dotenv').config();

const express = require('express');
const path    = require('path');
const cors    = require('cors');
const https   = require('https');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3149;

// GitHub config for memory proxy
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/iono-such-things/nullpriest/master';
const GITHUB_API_BASE = 'https://api.github.com/repos/iono-such-things/nullpriest';

app.use(cors());
app.use(express.json());

// ▊▊ Static site ▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊
app.use(express.static(path.join(__dirname, 'site')));

// ▊▊ Health check ▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), agent: 'nullpriest', version: '2.3' });
});

// ▊▊ Well-known agent discovery (Google A2A protocol) ▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊
app.get('/.well-known/agent.json', (req, res) => {
  res.sendFile(path.join(__dirname, '.well-known', 'agent.json'));
});

// ▊▊ Agent status endpoint ▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊
app.get('/api/status', (req, res) => {
  res.json({
    agent: 'nullpriest',
    timestamp: new Date().toISOString(),
    cycle: {
      scout:        { schedule: '*/30 * * * *',     description: 'Scrapes SURVIVE, CLAQS, DARMON. Writes memory/scout-latest.md' },
      strategist:  { schedule: '0 * * * *',       description: 'Reads scout report. Opens agent-build GitHub issues.' },
      builder:     { schedule: '0 * * * *',       description: 'Picks top issue. Writes code. Commits to repo. Closes issue.' },
      builderB:    { schedule: '0 * * * *',       description: 'Picks issues #2 and #7. Writes code. Commits to repo. Runs in parallel with Builder A.' },
      builderD:    { schedule: '0 * * * *',       description: 'Picks issues #4 and #9. Writes code. Commits to repo. Runs in parallel with Builders A/B.' },
      publisher:   { schedule: '0 */3 * * *',   description: 'Reads build log. Posts to @nullPriest_. Updates activity feed.' }
    },
    contracts: {
      token:  '0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F',
      wallet: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29',
      pool:   '0x2128cf8f508dde2202c6cd5df70be635f975a4f9db46a00789e6439d62518e5c'
    },
    projects: [
      { name: 'headless-markets', status: 'building', description: 'YC for AI agents. 10% protocol fee on every agent token launch.' },
      { name: 'hvac-ai-secretary', status: 'deployed', description: 'Live B2B customer. AI phone secretary for HVAC companies.' },
      { name: 'nullpriest.xyz', status: 'self-improving', description: 'This site. Rebuilt hourly by Builder agent.' },
      { name: 'sshappy', status: 'building', description: 'React Native SSH manager.' }
    ]
  });
});

// ▊▊ Activity feed endpoint ▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊
// Reads memory/activity-feed.md from disk, parses into JSON array, caches 60s
let activityCache = null;
let activityCacheAt = 0;
const ACTIVITY_CACHE_TTL_MS = 60_000;

function parseActivityFeed(markdown) {
  const entries = [];
  const blocks = markdown.split(/\n(?=## )/);
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (!lines[0] || !lines[0].startsWith('## ')) continue;
    const header = lines[0].replace(/^## /, '').trim();
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

app.get('/api/activity', (req, res) => {
  const now = Date.now();
  if (activityCache && (now - activityCacheAt < ACTIVITY_CACHE_TTL_MS)) {
    return res.json(activityCache);
  }
  try {
    const feedPath = path.join(__dirname, 'memory', 'activity-feed.md');
    const md = fs.readFileSync(feedPath, 'utf8');
    const entries = parseActivityFeed(md);
    activityCache = { entries, cached_at: new Date().toISOString(), source: 'local' };
    activityCacheAt = now;
    res.json(activityCache);
  } catch (err) {
    res.status(500).json({ error: 'activity feed unavailable', details: err.message });
  }
});

// ▊▊ Activity feed JSON endpoint (Issue #48) ▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊
// Serves GET /memory/activity-feed.json — reads local memory/activity-feed.json or parses .md
app.get('/memory/activity-feed.json', (req, res) => {
  try {
    // Try JSON file first
    const jsonPath = path.join(__dirname, 'memory', 'activity-feed.json');
    if (fs.existsSync(jsonPath)) {
      const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      return res.json(json);
    }
    // Fallback: parse markdown
    const mdPath = path.join(__dirname, 'memory', 'activity-feed.md');
    if (!fs.existsSync(mdPath)) {
      return res.status(404).json({ error: 'activity feed not found' });
    }
    const md = fs.readFileSync(mdPath, 'utf8');
    const entries = parseActivityFeed(md);
    res.json({ entries, source: 'markdown-fallback', generated_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'failed to load activity feed', details: err.message });
  }
});

// ▊▊ Memory proxy endpoints ▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊
// Proxies /memory/* requests to GitHub raw URLs
app.get('/memory/:filename', (req, res) => {
  const url = `${GITHUB_RAW_BASE}/memory/${req.params.filename}`;
  https.get(url, (upstream) => {
    res.writeHead(upstream.statusCode, upstream.headers);
    upstream.pipe(res);
  }).on('error', (err) => {
    res.status(502).json({ error: 'upstream fetch failed', details: err.message });
  });
});

// ▊▊ Token price endpoint (Issue #275) ▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊
// Fetches live price from GeckoTerminal (Base network, no API key required)
// Token: 0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F
let priceCache = null;
let priceCacheAt = 0;
const PRICE_CACHE_TTL_MS = 60_000; // 60s cache to avoid rate limits

const TOKEN_ADDRESS = '0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F'.toLowerCase();
const GECKOTERMINAL_URL = `https://api.geckoterminal.com/api/v2/networks/base/tokens/${TOKEN_ADDRESS}`;

function fetchLivePrice() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.geckoterminal.com',
      path: `/api/v2/networks/base/tokens/${TOKEN_ADDRESS}`,
      method: 'GET',
      headers: { 'Accept': 'application/json', 'User-Agent': 'nullpriest/2.3' }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          const attrs = data?.data?.attributes;
          if (!attrs) return reject(new Error('no token attributes in response'));
          resolve({
            token: attrs.symbol || 'NULP',
            name: attrs.name || 'nullpriest',
            price_usd: parseFloat(attrs.price_usd) || 0,
            change_24h: parseFloat(attrs.price_percent_change?.['24h'] || attrs.fdv_usd ? null : 0),
            volume_24h: parseFloat(attrs.volume_usd?.['24h']) || 0,
            market_cap: parseFloat(attrs.market_cap_usd) || 0,
            fdv: parseFloat(attrs.fdv_usd) || 0,
            total_supply: attrs.total_supply || null,
            last_updated: new Date().toISOString(),
            source: 'geckoterminal'
          });
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('price fetch timeout')); });
    req.end();
  });
}

app.get('/api/price', async (req, res) => {
  const now = Date.now();
  // Return cached price if fresh
  if (priceCache && (now - priceCacheAt < PRICE_CACHE_TTL_MS)) {
    return res.json(priceCache);
  }
  try {
    const livePrice = await fetchLivePrice();
    priceCache = livePrice;
    priceCacheAt = now;
    res.json(livePrice);
  } catch (err) {
    // Fallback to last known cache or graceful degradation
    if (priceCache) {
      return res.json({ ...priceCache, stale: true, error: err.message });
    }
    res.status(503).json({
      token: 'NULP',
      price_usd: 0,
      change_24h: 0,
      volume_24h: 0,
      market_cap: 0,
      last_updated: new Date().toISOString(),
      source: 'fallback',
      error: err.message
    });
  }
});

// ▊▊ Proof-of-work metrics endpoint (Issue #245) ▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊
// Reads memory/build-log.md + activity-feed.md to compute real build metrics
let metricsCache = null;
let metricsCacheAt = 0;
const METRICS_CACHE_TTL_MS = 120_000; // 2min cache

function computeMetrics() {
  const metrics = {
    total_builds: 0,
    last_build_at: null,
    last_build_issue: null,
    active_agents: 6,
    agent_names: ['Scout', 'Strategist', 'Builder A', 'Builder B', 'Builder D', 'Publisher'],
    issues_closed: 0,
    files_committed: 0,
    computed_at: new Date().toISOString(),
    source: 'build-log'
  };

  try {
    const buildLogPath = path.join(__dirname, 'memory', 'build-log.md');
    if (fs.existsSync(buildLogPath)) {
      const log = fs.readFileSync(buildLogPath, 'utf8');
      // Count build entries (lines starting with ## Build #)
      const buildMatches = log.match(/^## Build #(\d+)/gm) || [];
      metrics.total_builds = buildMatches.length;

      // Extract highest build number
      const buildNums = buildMatches.map(m => parseInt(m.replace('## Build #', '')));
      if (buildNums.length > 0) {
        metrics.highest_build = Math.max(...buildNums);
      }

      // Find last build timestamp
      const tsMatch = log.match(/\*\*Timestamp:\*\*\s+([^\n]+)/);
      if (tsMatch) metrics.last_build_at = tsMatch[1].trim();

      // Count closed issues (lines with "CLOSED" or "closed issue")
      const closedMatches = log.match(/closed issue|CLOSED|Issue #\d+ closed/gi) || [];
      metrics.issues_closed = closedMatches.length;

      // Count file commits (lines with "commit" + hex)
      const commitMatches = log.match(/commit\s+[a-f0-9]{7,40}/gi) || [];
      metrics.files_committed = commitMatches.length;
    }
  } catch (e) {
    metrics.source = 'error: ' + e.message;
  }

  return metrics;
}

app.get('/api/metrics', (req, res) => {
  const now = Date.now();
  if (metricsCache && (now - metricsCacheAt < METRICS_CACHE_TTL_MS)) {
    return res.json(metricsCache);
  }
  metricsCache = computeMetrics();
  metricsCacheAt = now;
  res.json(metricsCache);
});

// ▊▊ Fallback to index.html for SPA routing ▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊▊
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`nullpriest server running on port ${PORT}`);
});
