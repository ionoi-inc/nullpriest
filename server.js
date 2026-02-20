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

// ━━ Static site ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use(express.static(path.join(__dirname, 'site')));

// ━━ Health check ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), agent: 'nullpriest', version: '2.2' });
});

// ━━ Agent status endpoint ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/status', (req, res) => {
  res.json({
    agent: 'nullpriest',
    timestamp: new Date().toISOString(),
    cycle: {
      scout:       { schedule: '*/30 * * * *',  description: 'Scrapes SURVIVE, CLAQS, DARMON. Writes memory/scout-latest.md' },
      strategist:  { schedule: '0 * * * *',     description: 'Reads scout report. Opens agent-build GitHub issues.' },
      builder:     { schedule: '0 * * * *',     description: 'Picks top issue. Writes code. Commits to repo. Closes issue.' },
      builderB:    { schedule: '0 * * * *',     description: 'Picks issues #2 and #7. Writes code. Commits to repo. Runs in parallel with Builder A.' },
      builderD:    { schedule: '0 * * * *',     description: 'Picks issues #4 and #9. Writes code. Commits to repo. Runs in parallel with Builders A/B.' },
      publisher:   { schedule: '0 */3 * * *',   description: 'Reads build log. Posts to @nullPriest_. Updates activity feed.' }
    },
    contracts: {
      token:  '0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F',
      wallet: '0xe5e3A482862E241A4b5Fb526cC050b830FBA29',
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

// ━━ Activity feed endpoint ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

// ━━ Activity feed JSON endpoint (Issue #48) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Reads memory/activity-feed.json from local disk and returns the parsed JSON array.
// The site fetches GET /memory/activity-feed.json — this explicit route handles it
// before the generic /memory/:filename proxy (which would fetch from GitHub raw).
let activityJsonCache = null;
let activityJsonCacheAt = 0;

app.get('/memory/activity-feed.json', (req, res) => {
  const now = Date.now();
  if (activityJsonCache && (now - activityJsonCacheAt < ACTIVITY_CACHE_TTL_MS)) {
    return res.json(activityJsonCache);
  }
  try {
    const feedPath = path.join(__dirname, 'memory', 'activity-feed.json');
    const raw = fs.readFileSync(feedPath, 'utf8');
    const parsed = JSON.parse(raw);
    activityJsonCache = parsed;
    activityJsonCacheAt = now;
    res.json(parsed);
  } catch (err) {
    // Fallback: parse the markdown feed and return it in the same shape
    try {
      const feedPath = path.join(__dirname, 'memory', 'activity-feed.md');
      const md = fs.readFileSync(feedPath, 'utf8');
      const entries = parseActivityFeed(md);
      activityJsonCache = entries;
      activityJsonCacheAt = now;
      res.json(entries);
    } catch (err2) {
      res.status(500).json({ error: 'activity-feed.json unavailable', details: err2.message });
    }
  }
});

// ━━ Build log endpoint ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/build-log', (req, res) => {
  const url = `${GITHUB_RAW_BASE}/memory/build-log.md`;
  https.get(url, (ghRes) => {
    let data = '';
    ghRes.on('data', chunk => data += chunk);
    ghRes.on('end', () => res.json({ content: data, fetched_at: new Date().toISOString() }));
  }).on('error', (err) => {
    res.status(500).json({ error: 'build log fetch failed', details: err.message });
  });
});

// ━━ Price endpoint ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let priceCache = null;
let priceCacheAt = 0;
const PRICE_CACHE_TTL_MS = 60_000;

app.get('/api/price', (req, res) => {
  const now = Date.now();
  if (priceCache && (now - priceCacheAt < PRICE_CACHE_TTL_MS)) {
    return res.json(priceCache);
  }
  const POOL = '0x2128cf8f508dde2202c6cd5df70be635f975a4f9db46a00789e6439d62518e5c';
  const url = `https://api.dexscreener.com/latest/dex/pairs/base/${POOL}`;
  https.get(url, (dexRes) => {
    let data = '';
    dexRes.on('data', chunk => data += chunk);
    dexRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        const pair = parsed.pairs?.[0];
        if (!pair) return res.status(404).json({ error: 'pair not found' });
        priceCache = {
          price: parseFloat(pair.priceUsd) || 0,
          change24h: parseFloat(pair.priceChange?.h24) || 0,
          liquidity: parseFloat(pair.liquidity?.usd) || 0,
          volume24h: parseFloat(pair.volume?.h24) || 0,
          pairAddress: pair.pairAddress,
          chainId: pair.chainId,
          cached_at: new Date().toISOString()
        };
        priceCacheAt = now;
        res.json(priceCache);
      } catch (err) {
        res.status(500).json({ error: 'price parse failed', details: err.message });
      }
    });
  }).on('error', (err) => {
    res.status(500).json({ error: 'DexScreener API failed', details: err.message });
  });
});

// ━━ Tweet queue endpoints ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Implements tweet-queue-spec.md protocol for rate limit recovery
const TWEET_QUEUE_PATH = path.join(__dirname, 'memory', 'tweet-queue.json');

function readTweetQueue() {
  try {
    const raw = fs.readFileSync(TWEET_QUEUE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeTweetQueue(queue) {
  fs.writeFileSync(TWEET_QUEUE_PATH, JSON.stringify(queue, null, 2), 'utf8');
}

// GET /api/tweet-queue — return current queue
app.get('/api/tweet-queue', (req, res) => {
  const queue = readTweetQueue();
  res.json({ queue, length: queue.length, fetched_at: new Date().toISOString() });
});

// POST /api/tweet-queue/enqueue — add a failed tweet to the queue
// Body: { text: string, reason?: string }
app.post('/api/tweet-queue/enqueue', (req, res) => {
  const { text, reason } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  const queue = readTweetQueue();
  const entry = {
    text,
    queued_at: new Date().toISOString(),
    reason: reason || '429 rate limit',
    retry_count: 0
  };
  queue.push(entry);
  writeTweetQueue(queue);
  res.json({ ok: true, queued: entry, queue_length: queue.length });
});

// POST /api/tweet-queue/drain — pop oldest item from queue, return it for posting
// Publisher calls this at cycle start; if item returned, post it, then skip new post
app.post('/api/tweet-queue/drain', (req, res) => {
  const queue = readTweetQueue();
  if (queue.length === 0) {
    return res.json({ ok: true, drained: null, queue_length: 0, message: 'queue empty' });
  }
  const item = queue.shift();
  item.retry_count = (item.retry_count || 0) + 1;
  writeTweetQueue(queue);
  res.json({ ok: true, drained: item, queue_length: queue.length });
});

app.listen(PORT, () => console.log(`nullpriest live on port ${PORT}`));