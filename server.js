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

// ── Static site ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'site')));

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), agent: 'nullpriest', version: '2.0' });
});

// ── Agent status endpoint ────────────────────────────────────
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
      scout:      { schedule: '*/30 * * * *', description: 'Scrapes SURVIVE, CLAWS, DAIMON. Writes memory/scout-latest.md' },
      strategist: { schedule: '0 * * * *',    description: 'Reads scout report. Opens agent-build GitHub issues.' },
      builder:    { schedule: '0 * * * *',    description: 'Picks top issue. Writes code. Commits to repo. Closes issue.' },
      publisher:  { schedule: '0 * * * *',    description: 'Reads build log. Posts to @nullPriest_. Updates activity feed.' }
    },
    contracts: {
      token:    '0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F',
      wallet:   '0xe5e3A48286288E241A4b5Fb526cC050b830FBA29',
      pool:     '0xDb32c33fC9E2B6a0684CA59dd7Bc78E5c87e1f18'
    },
    projects: [
      { name: 'headless-markets', status: 'building', description: 'YC for AI agents. 10% protocol fee on every agent token launch.' },
      { name: 'hvac-ai-secretary', status: 'deployed', description: 'Live B2B customer. AI phone secretary for HVAC companies.' },
      { name: 'nullpriest.xyz', status: 'self-improving', description: 'This site. Rebuilt hourly by Builder agent.' },
      { name: 'sshappy', status: 'building', description: 'React Native SSH manager.' }
    ]
  });
});

// ── Memory proxy ─────────────────────────────────────────────
// Proxies /memory/* to GitHub raw content so site JS can read
// agent memory files without CORS issues.
// e.g. GET /memory/scout-latest.md -> GitHub raw scout-latest.md
// e.g. GET /memory/activity-feed.json -> GitHub raw activity-feed.json
app.get('/memory/*', (req, res) => {
  const filePath = req.params[0];
  const rawUrl   = `${GITHUB_RAW_BASE}/memory/${filePath}`;

  const options = {
    headers: {
      'User-Agent': 'nullpriest-server/2.0',
      ...(process.env.GITHUB_TOKEN ? { 'Authorization': `token ${process.env.GITHUB_TOKEN}` } : {})
    }
  };

  https.get(rawUrl, options, (ghRes) => {
    if (ghRes.statusCode === 404) {
      return res.status(404).json({ error: 'memory file not found', path: filePath });
    }
    if (ghRes.statusCode !== 200) {
      return res.status(ghRes.statusCode).json({ error: 'upstream error', status: ghRes.statusCode });
    }

    // Set content type based on file extension
    if (filePath.endsWith('.json')) res.setHeader('Content-Type', 'application/json');
    else if (filePath.endsWith('.md')) res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    else res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    // Cache for 60s — agents write every 30min, no need to bust more often
    res.setHeader('Cache-Control', 'public, max-age=60');

    ghRes.pipe(res);
  }).on('error', (err) => {
    console.error('memory proxy error:', err);
    res.status(502).json({ error: 'proxy error', message: err.message });
  });
});

// ── DexScreener price proxy ───────────────────────────────────
// Proxies DexScreener API server-side to avoid browser CORS issues.
// Frontend calls /api/price instead of DexScreener directly.
// Returns the first pair data for the NULP token.
const DEXSCREENER_BASE = 'https://api.dexscreener.com/latest/dex/tokens';
const NULP_TOKEN = '0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F';

app.get('/api/price', (req, res) => {
  const url = `${DEXSCREENER_BASE}/${NULP_TOKEN}`;
  const options = { headers: { 'User-Agent': 'nullpriest-server/2.0' } };

  https.get(url, options, (dxRes) => {
    let body = '';
    dxRes.on('data', chunk => body += chunk);
    dxRes.on('end', () => {
      try {
        const data = JSON.parse(body);
        res.setHeader('Cache-Control', 'public, max-age=30');
        res.setHeader('Content-Type', 'application/json');
        res.json(data);
      } catch(e) {
        res.status(502).json({ error: 'parse error' });
      }
    });
  }).on('error', (err) => {
    console.error('price proxy error:', err);
    res.status(502).json({ error: 'proxy error', message: err.message });
  });
});

// ── GitHub commits feed proxy ─────────────────────────────────
// Frontend can call /api/commits to get recent repo activity
// without needing auth (uses optional GITHUB_TOKEN for higher rate limit)
app.get('/api/commits', (req, res) => {
  const apiUrl = `${GITHUB_API_BASE}/commits?per_page=10`;
  const options = {
    headers: {
      'User-Agent': 'nullpriest-server/2.0',
      'Accept': 'application/vnd.github.v3+json',
      ...(process.env.GITHUB_TOKEN ? { 'Authorization': `token ${process.env.GITHUB_TOKEN}` } : {})
    }
  };

  https.get(apiUrl, options, (ghRes) => {
    let body = '';
    ghRes.on('data', chunk => body += chunk);
    ghRes.on('end', () => {
      try {
        const commits = JSON.parse(body);
        const simplified = Array.isArray(commits) ? commits.map(c => ({
          sha:     c.sha?.slice(0,7),
          message: c.commit?.message?.split('\n')[0],
          author:  c.commit?.author?.name,
          date:    c.commit?.author?.date,
          url:     c.html_url
        })) : [];
        res.setHeader('Cache-Control', 'public, max-age=120');
        res.json(simplified);
      } catch(e) {
        res.status(500).json({ error: 'parse error' });
      }
    });
  }).on('error', (err) => {
    res.status(502).json({ error: 'proxy error', message: err.message });
  });
});

// ── Catch-all → SPA ─────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`nullpriest running on port ${PORT}`);
});
