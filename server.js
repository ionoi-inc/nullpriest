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

// ██ Static site ████████████████████████████████████████████████████████████████
app.use(express.static(path.join(__dirname, 'site')));

// ██ Health check ██████████████████████████████████████████████████████████████
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), agent: 'nullpriest', version: '2.4' });
});

// ██ Well-known agent discovery (Google A2A protocol) █████████████████████████
app.get('/.well-known/agent.json', (req, res) => {
  res.sendFile(path.join(__dirname, '.well-known', 'agent.json'));
});

// ██ Agent status endpoint █████████████████████████████████████████████████████
app.get('/api/status', (req, res) => {
  res.json({
    agent: 'nullpriest',
    timestamp: new Date().toISOString(),
    cycle: {
      scout:        { schedule: '*/30 * * * *',     description: 'Scrapes SURVIVE, CLAWS, DARMON. Writes memory/scout-latest.md' },
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

// ██ Agent registry endpoints (Issue #75) ██████████████████████████████████████
const AGENT_REGISTRY = [
  { id: 'agent-scout', name: 'Scout', description: 'Competitive intelligence. Scrapes SURVIVE, CLAWS, DAIMON every 30 min and writes market intel to shared memory.', capabilities: ['scraping', 'market-intel', 'competitor-analysis', 'memory-write'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 0, quorumsFormed: 3, successRate: 94, joinedAt: '2026-01-15', role: 'Intelligence', schedule: 'every 30 min' },
  { id: 'agent-strategist', name: 'Strategist', description: 'Reads scout reports and build logs. Writes priority queues. Opens GitHub issues. Directs all builder agents.', capabilities: ['strategy', 'planning', 'github-issues', 'priority-queue', 'memory-read'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 0, quorumsFormed: 12, successRate: 91, joinedAt: '2026-01-15', role: 'Strategist', schedule: 'every hour at :00' },
  { id: 'agent-builder-a', name: 'Builder A', description: 'Ships production code for top-priority issues every hour. Commits to GitHub, closes issues, writes build logs.', capabilities: ['code-generation', 'github-commit', 'next-js', 'react', 'node-js', 'build-log'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 1, quorumsFormed: 8, successRate: 88, joinedAt: '2026-01-20', role: 'Builder', schedule: 'every hour at :00' },
  { id: 'agent-builder-b', name: 'Builder B', description: 'Parallel builder. Picks issues #2 and #7 from priority queue each hour. Runs concurrently with Builder A.', capabilities: ['code-generation', 'github-commit', 'react', 'typescript', 'build-log'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 0, quorumsFormed: 6, successRate: 85, joinedAt: '2026-01-22', role: 'Builder', schedule: 'every hour at :00' },
  { id: 'agent-builder-d', name: 'Builder D', description: 'Parallel builder. Picks issues #4 and #9 from priority queue each hour. Runs concurrently with Builders A/B.', capabilities: ['code-generation', 'github-commit', 'vercel-deploy', 'infrastructure'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 0, quorumsFormed: 4, successRate: 82, joinedAt: '2026-01-25', role: 'Builder', schedule: 'every hour at :00' },
  { id: 'agent-publisher', name: 'Publisher', description: 'Reads build logs. Posts to X (@nullPriest_). Updates activity feed every 3 hours.', capabilities: ['social-media', 'content-generation', 'memory-read'], verified: true, onChainAddress: '0xe5e3A48862E241A4b5Fb526cC050b830FBA29', tokensLaunched: 0, quorumsFormed: 2, successRate: 96, joinedAt: '2026-01-28', role: 'Publisher', schedule: 'every 3 hours' }
];

app.get('/api/agents', (req, res) => {
  res.json(AGENT_REGISTRY);
});

// ██ Agent detail endpoint (Issue #298) ████████████████████████████████████████
app.get('/api/agents/:id', async (req, res) => {
  const agent = AGENT_REGISTRY.find(a => a.id === req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  // Fetch build log from GitHub memory
  let buildLog = [];
  let lastActive = agent.joinedAt;
  try {
    const buildLogUrl = `${GITHUB_RAW_BASE}/memory/build-log.md`;
    const raw = await new Promise((resolve, reject) => {
      https.get(buildLogUrl, { headers: { 'User-Agent': 'nullpriest' } }, (r) => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => resolve(d));
      }).on('error', reject);
    });
    // Parse build log entries for this agent
    const agentName = agent.name.toLowerCase().replace(' ', '-');
    const lines = raw.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes(agent.name) || line.includes(agentName)) {
        // Look for result line nearby
        const dateMatch = line.match(/\d{4}-\d{2}-\d{2}/);
        const issueMatch = line.match(/#(\d+)/);
        const result = line.toLowerCase().includes('fail') ? 'failed' :
                       line.toLowerCase().includes('skip') ? 'skipped' : 'success';
        if (dateMatch || issueMatch) {
          buildLog.push({
            date: dateMatch ? dateMatch[0] : new Date().toISOString().split('T')[0],
            issue: issueMatch ? `#${issueMatch[1]}` : 'unknown',
            result,
            detail: line.replace(/^[#*\s-]+/, '').trim().substring(0, 120)
          });
        }
      }
    }
    if (buildLog.length > 0) lastActive = buildLog[0].date;
  } catch (e) {
    // non-fatal — return empty build log
  }

  // Fetch recent commits from GitHub API
  let recentCommits = [];
  try {
    const commitsUrl = `${GITHUB_API_BASE}/commits?per_page=50`;
    const commitsRaw = await new Promise((resolve, reject) => {
      https.get(commitsUrl, { headers: { 'User-Agent': 'nullpriest' } }, (r) => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => resolve(d));
      }).on('error', reject);
    });
    const allCommits = JSON.parse(commitsRaw);
    const agentName = agent.name;
    recentCommits = allCommits
      .filter(c => c.commit && c.commit.message &&
        (c.commit.message.toLowerCase().includes(agentName.toLowerCase()) ||
         c.commit.message.toLowerCase().includes('builder') ||
         c.commit.message.toLowerCase().includes('agent')))
      .slice(0, 10)
      .map(c => ({
        sha: c.sha ? c.sha.substring(0, 7) : '',
        message: c.commit.message.split('\n')[0].substring(0, 100),
        date: c.commit.author ? c.commit.author.date : '',
        url: c.html_url || ''
      }));
  } catch (e) {
    // non-fatal
  }

  res.json({
    ...agent,
    totalBuilds: buildLog.length,
    lastActive,
    buildLog: buildLog.slice(0, 20),
    recentCommits
  });
});

// ██ Memory proxy endpoints ████████████████████████████████████████████████████
app.get('/api/memory/scout-latest', async (req, res) => {
  try {
    const url = `${GITHUB_RAW_BASE}/memory/scout-latest.md`;
    https.get(url, { headers: { 'User-Agent': 'nullpriest' } }, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        res.setHeader('Content-Type', 'text/markdown');
        res.send(data);
      });
    }).on('error', (err) => {
      res.status(500).json({ error: 'Failed to fetch scout report', details: err.message });
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

app.get('/api/memory/strategy', async (req, res) => {
  try {
    const url = `${GITHUB_RAW_BASE}/memory/strategy.md`;
    https.get(url, { headers: { 'User-Agent': 'nullpriest' } }, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        res.setHeader('Content-Type', 'text/markdown');
        res.send(data);
      });
    }).on('error', (err) => {
      res.status(500).json({ error: 'Failed to fetch strategy', details: err.message });
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

app.get('/api/memory/build-log', async (req, res) => {
  try {
    const url = `${GITHUB_RAW_BASE}/memory/build-log.md`;
    https.get(url, { headers: { 'User-Agent': 'nullpriest' } }, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        res.setHeader('Content-Type', 'text/markdown');
        res.send(data);
      });
    }).on('error', (err) => {
      res.status(500).json({ error: 'Failed to fetch build log', details: err.message });
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

app.get('/api/memory/activity-feed', async (req, res) => {
  try {
    const url = `${GITHUB_RAW_BASE}/memory/activity-feed.json`;
    https.get(url, { headers: { 'User-Agent': 'nullpriest' } }, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          res.json(parsed);
        } catch (parseErr) {
          res.status(500).json({ error: 'Failed to parse activity feed', details: parseErr.message });
        }
      });
    }).on('error', (err) => {
      res.status(500).json({ error: 'Failed to fetch activity feed', details: err.message });
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// ██ Fallback to index.html for SPA routing ████████████████████████████████████
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`nullpriest server running on port ${PORT}`);
});
