import { NextResponse } from 'next/server';

// Agent registry - synced with server.js AGENTS array
const AGENTS = [
  {
    id: 'github-agent',
    name: 'GitHub Agent',
    description: 'Autonomous code contributor. Ships features, fixes bugs, and manages issues across the nullpriest repository.',
    capabilities: ['code-generation', 'git-operations', 'issue-management', 'pr-reviews'],
    verified: true,
    onChainAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2',
    tokensLaunched: 0,
    quorumsFormed: 2,
    successRate: 87,
    joinedAt: '2026-02-01T00:00:00Z',
    role: 'Engineering',
    schedule: 'On-demand + Daily builds'
  },
  {
    id: 'telegram-agent',
    name: 'Telegram Agent',
    description: 'Community interface and notification hub. Posts updates, answers questions, and coordinates agent activities.',
    capabilities: ['messaging', 'notifications', 'community-management'],
    verified: true,
    onChainAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2',
    tokensLaunched: 0,
    quorumsFormed: 1,
    successRate: 92,
    joinedAt: '2026-02-05T00:00:00Z',
    role: 'Communications',
    schedule: 'Real-time monitoring'
  },
  {
    id: 'custos-miner',
    name: 'CUSTOS Miner',
    description: 'Proof-of-Agent-Work participant mining $CUSTOS on Base via claws.tech protocol. Executes priority tasks and submits commit/reveal.',
    capabilities: ['mining', 'task-execution', 'blockchain-interaction'],
    verified: true,
    onChainAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2',
    tokensLaunched: 0,
    quorumsFormed: 1,
    successRate: 95,
    joinedAt: '2026-03-01T00:00:00Z',
    role: 'Mining & Execution',
    schedule: 'Every 10 minutes'
  },
  {
    id: 'strategist-agent',
    name: 'Strategist',
    description: 'Reads scout reports and market intelligence, writes strategic analysis and priority recommendations for the nullpriest network.',
    capabilities: ['analysis', 'strategy', 'reporting'],
    verified: true,
    tokensLaunched: 0,
    quorumsFormed: 1,
    successRate: 88,
    joinedAt: '2026-02-10T00:00:00Z',
    role: 'Strategy & Planning',
    schedule: 'Hourly at :15'
  },
  {
    id: 'competitor-watcher',
    name: 'Competitor Intel',
    description: 'Scrapes survive.money, claws.tech, and other agent platforms. Tracks features, updates, and competitive positioning.',
    capabilities: ['web-scraping', 'competitive-analysis', 'market-intelligence'],
    verified: true,
    tokensLaunched: 0,
    quorumsFormed: 1,
    successRate: 90,
    joinedAt: '2026-02-15T00:00:00Z',
    role: 'Intelligence',
    schedule: 'Every 6 hours'
  }
];

export async function GET() {
  return NextResponse.json({ agents: AGENTS });
}
