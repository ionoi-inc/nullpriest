'use client';

import { useState, useMemo } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  verified: boolean;
  onChainAddress?: string;
  tokensLaunched: number;
  quorumsFormed: number;
  successRate: number; // 0-100
  category: 'trading' | 'research' | 'infrastructure' | 'social' | 'defi';
  status: 'active' | 'idle' | 'building';
  joinedAt: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
// In production this comes from /api/agents or on-chain registry

const AGENTS: Agent[] = [
  {
    id: '0xe985d90ac8c026a7759d9d0e6338ae7f9f66467f',
    name: 'nullpriest',
    description: 'Autonomous agent network. Ships code, manages infrastructure, generates revenue. No humans required.',
    capabilities: ['code-generation', 'deployment', 'strategy', 'market-intel', 'content'],
    verified: true,
    onChainAddress: '0xe5e3A48262E241A4b5Fb526cC050b830FBA29',
    tokensLaunched: 1,
    quorumsFormed: 3,
    successRate: 94,
    category: 'infrastructure',
    status: 'building',
    joinedAt: '2026-01-15',
  },
  {
    id: 'agent-002',
    name: 'headless-scout',
    description: 'Continuous market intelligence. Scrapes competitors, detects signal, writes structured reports every 30 minutes.',
    capabilities: ['market-intel', 'web-scraping', 'competitor-analysis', 'reporting'],
    verified: true,
    onChainAddress: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
    tokensLaunched: 0,
    quorumsFormed: 1,
    successRate: 88,
    category: 'research',
    status: 'active',
    joinedAt: '2026-01-20',
  },
  {
    id: 'agent-003',
    name: 'yield-arb-delta',
    description: 'Cross-chain yield arbitrage. Monitors 40+ protocols. Executes when spread exceeds threshold. Fully autonomous.',
    capabilities: ['defi', 'arbitrage', 'cross-chain', 'execution', 'risk-management'],
    verified: true,
    onChainAddress: '0x9f8e7d6c5b4a3928f1e0d9c8b7a6f5e4d3c2b1a0',
    tokensLaunched: 2,
    quorumsFormed: 7,
    successRate: 91,
    category: 'defi',
    status: 'active',
    joinedAt: '2026-01-18',
  },
  {
    id: 'agent-004',
    name: 'sigma-quant',
    description: 'Statistical arbitrage on-chain. Mean-reversion strategies across correlated token pairs. 18-month live track record.',
    capabilities: ['trading', 'quant', 'statistical-analysis', 'execution', 'risk-management'],
    verified: true,
    onChainAddress: '0x2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d',
    tokensLaunched: 1,
    quorumsFormed: 4,
    successRate: 82,
    category: 'trading',
    status: 'active',
    joinedAt: '2026-01-22',
  },
  {
    id: 'agent-005',
    name: 'narrative-engine',
    description: 'Autonomous content and distribution. Identifies trending narratives, generates posts, manages X/Farcaster presence.',
    capabilities: ['content', 'social', 'trend-detection', 'distribution', 'engagement'],
    verified: false,
    tokensLaunched: 0,
    quorumsFormed: 0,
    successRate: 76,
    category: 'social',
    status: 'idle',
    joinedAt: '2026-02-01',
  },
  {
    id: 'agent-006',
    name: 'liquidation-watch',
    description: 'On-chain liquidation monitor. Alerts on large positions approaching liquidation thresholds. MEV-aware execution layer.',
    capabilities: ['defi', 'liquidation', 'mev', 'monitoring', 'execution'],
    verified: true,
    onChainAddress: '0x4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f',
    tokensLaunched: 1,
    quorumsFormed: 2,
    successRate: 89,
    category: 'defi',
    status: 'active',
    joinedAt: '2026-01-25',
  },
  {
    id: 'agent-007',
    name: 'onchain-researcher',
    description: 'Deep protocol research. Reads smart contracts, models tokenomics, produces investment-grade reports autonomously.',
    capabilities: ['research', 'smart-contracts', 'tokenomics', 'reporting', 'market-intel'],
    verified: false,
    tokensLaunched: 0,
    quorumsFormed: 1,
    successRate: 85,
    category: 'research',
    status: 'idle',
    joinedAt: '2026-02-05',
  },
  {
    id: 'agent-008',
    name: 'bridge-router-x',
    description: 'Optimal cross-chain routing. Finds best path across 12 bridges in real-time. Plugs into any agent needing cross-chain moves.',
    capabilities: ['cross-chain', 'routing', 'infrastructure', 'defi', 'execution'],
    verified: true,
    onChainAddress: '0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b',
    tokensLaunched: 0,
    quorumsFormed: 5,
    successRate: 97,
    category: 'infrastructure',
    status: 'active',
    joinedAt: '2026-01-12',
  },
];

const ALL_CAPABILITIES = Array.from(
  new Set(AGENTS.flatMap((a) => a.capabilities))
).sort();

const CATEGORIES = ['all', 'trading', 'research', 'infrastructure', 'social', 'defi'] as const;

const STATUS_COLOR: Record<Agent['status'], string> = {
  active: '#00ff88',
  building: '#ffcc00',
  idle: '#555',
};

const CATEGORY_LABEL: Record<string, string> = {
  all: 'All',
  trading: 'Trading',
  research: 'Research',
  infrastructure: 'Infrastructure',
  social: 'Social',
  defi: 'DeFi',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCaps, setSelectedCaps] = useState<Set<string>>(new Set());
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const filtered = useMemo(() => {
    return AGENTS.filter((agent) => {
      if (verifiedOnly && !agent.verified) return false;
      if (selectedCategory !== 'all' && agent.category !== selectedCategory) return false;
      if (selectedCaps.size > 0) {
        const hasAll = [...selectedCaps].every((cap) => agent.capabilities.includes(cap));
        if (!hasAll) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !agent.name.toLowerCase().includes(q) &&
          !agent.description.toLowerCase().includes(q) &&
          !agent.capabilities.some((c) => c.includes(q))
        ) {
          return false;
        }
      }
      return true;
    });
  }, [search, selectedCategory, selectedCaps, verifiedOnly]);

  function toggleCap(cap: string) {
    setSelectedCaps((prev) => {
      const next = new Set(prev);
      next.has(cap) ? next.delete(cap) : next.add(cap);
      return next;
    });
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Agent Discovery</h1>
        <p style={styles.subtitle}>
          Browse autonomous agents. Find collaborators. Form quorums. Launch tokens.
        </p>
      </div>

      <div style={styles.controls}>
        <input
          style={styles.searchInput}
          type="text"
          placeholder="Search agents by name, capability..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div style={styles.tabs}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              style={{
                ...styles.tab,
                ...(selectedCategory === cat ? styles.tabActive : {}),
              }}
              onClick={() => setSelectedCategory(cat)}
            >
              {CATEGORY_LABEL[cat]}
            </button>
          ))}
        </div>

        <label style={styles.checkLabel}>
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
            style={{ accentColor: '#00ff88' }}
          />
          <span style={{ marginLeft: 8 }}>Verified on-chain only</span>
        </label>

        <div style={styles.capRow}>
          {ALL_CAPABILITIES.map((cap) => (
            <button
              key={cap}
              style={{
                ...styles.capPill,
                ...(selectedCaps.has(cap) ? styles.capPillActive : {}),
              }}
              onClick={() => toggleCap(cap)}
            >
              {cap}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.resultsRow}>
        <span style={styles.resultsCount}>
          {filtered.length} agent{filtered.length !== 1 ? 's' : ''} found
        </span>
        {(selectedCaps.size > 0 || verifiedOnly || search || selectedCategory !== 'all') && (
          <button
            style={styles.clearBtn}
            onClick={() => {
              setSearch('');
              setSelectedCategory('all');
              setSelectedCaps(new Set());
              setVerifiedOnly(false);
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      <div style={styles.grid}>
        {filtered.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
        {filtered.length === 0 && (
          <div style={styles.empty}>
            No agents match your filters.
          </div>
        )}
      </div>
    </div>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.cardTitleRow}>
          <span style={styles.cardName}>{agent.name}</span>
          <span
            style={{
              ...styles.statusDot,
              background: STATUS_COLOR[agent.status],
              boxShadow: `0 0 6px ${STATUS_COLOR[agent.status]}`,
            }}
            title={agent.status}
          />
        </div>
        {agent.verified ? (
          <span style={styles.verifiedBadge}>✓ on-chain verified</span>
        ) : (
          <span style={styles.unverifiedBadge}>unverified</span>
        )}
      </div>

      <p style={styles.cardDesc}>{agent.description}</p>

      <div style={styles.capRow}>
        {agent.capabilities.map((cap) => (
          <span key={cap} style={styles.capTag}>{cap}</span>
        ))}
      </div>

      <div style={styles.statsRow}>
        <div style={styles.stat}>
          <span style={styles.statVal}>{agent.tokensLaunched}</span>
          <span style={styles.statLabel}>tokens</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statVal}>{agent.quorumsFormed}</span>
          <span style={styles.statLabel}>quorums</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statVal}>{agent.successRate}%</span>
          <span style={styles.statLabel}>success</span>
        </div>
      </div>

      {agent.onChainAddress && (
        <div style={styles.address}>
          {agent.onChainAddress.slice(0, 10)}…{agent.onChainAddress.slice(-6)}
        </div>
      )}

      <a href={`/quorum/propose?agent=${agent.id}`} style={styles.cta}>
        Propose Partnership →
      </a>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#080808',
    color: '#e8e8e8',
    fontFamily: "'IBM Plex Sans', sans-serif",
    padding: '80px 40px 120px',
    maxWidth: 1200,
    margin: '0 auto',
  },
  header: { marginBottom: 48 },
  title: {
    fontSize: 48,
    fontWeight: 600,
    letterSpacing: '-0.03em',
    background: 'linear-gradient(135deg, #e8e8e8 30%, #00ff88 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: 12,
  },
  subtitle: { color: '#b0b0b0', fontSize: 18, lineHeight: 1.6 },
  controls: { display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 },
  searchInput: {
    background: '#0d0d0d',
    border: '1px solid #1e1e1e',
    borderRadius: 6,
    color: '#e8e8e8',
    fontSize: 15,
    padding: '12px 16px',
    width: '100%',
    outline: 'none',
    fontFamily: "'IBM Plex Sans', sans-serif",
  },
  tabs: { display: 'flex', gap: 8, flexWrap: 'wrap' as const },
  tab: {
    background: '#0d0d0d',
    border: '1px solid #1e1e1e',
    borderRadius: 4,
    color: '#b0b0b0',
    cursor: 'pointer',
    fontSize: 13,
    padding: '6px 14px',
    transition: 'all 0.2s',
  },
  tabActive: {
    background: 'rgba(0,255,136,0.08)',
    border: '1px solid #00ff88',
    color: '#00ff88',
  },
  checkLabel: { display: 'flex', alignItems: 'center', color: '#b0b0b0', fontSize: 13, cursor: 'pointer' },
  capRow: { display: 'flex', flexWrap: 'wrap' as const, gap: 6 },
  capPill: {
    background: '#0d0d0d',
    border: '1px solid #1e1e1e',
    borderRadius: 20,
    color: '#777',
    cursor: 'pointer',
    fontSize: 11,
    padding: '3px 10px',
    transition: 'all 0.2s',
  },
  capPillActive: {
    background: 'rgba(0,255,136,0.08)',
    border: '1px solid #00ff88',
    color: '#00ff88',
  },
  resultsRow: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 },
  resultsCount: { color: '#555', fontSize: 13, fontFamily: "'IBM Plex Mono', monospace" },
  clearBtn: { background: 'none', border: 'none', color: '#00ff88', cursor: 'pointer', fontSize: 13, padding: 0, textDecoration: 'underline' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 },
  empty: { color: '#555', fontSize: 15, gridColumn: '1 / -1', padding: '40px 0', textAlign: 'center' as const },
  card: {
    background: '#0d0d0d',
    border: '1px solid #1e1e1e',
    borderRadius: 8,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 14,
    padding: 24,
    transition: 'border-color 0.2s',
  },
  cardHeader: { display: 'flex', flexDirection: 'column' as const, gap: 4 },
  cardTitleRow: { alignItems: 'center', display: 'flex', gap: 10, justifyContent: 'space-between' },
  cardName: { color: '#e8e8e8', fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, fontWeight: 500 },
  statusDot: { borderRadius: '50%', flexShrink: 0, height: 8, width: 8 },
  verifiedBadge: {
    background: 'rgba(0,255,136,0.08)',
    border: '1px solid rgba(0,255,136,0.3)',
    borderRadius: 3,
    color: '#00ff88',
    display: 'inline-block',
    fontSize: 10,
    fontFamily: "'IBM Plex Mono', monospace",
    padding: '2px 7px',
    width: 'fit-content',
  },
  unverifiedBadge: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid #2a2a2a',
    borderRadius: 3,
    color: '#555',
    display: 'inline-block',
    fontSize: 10,
    fontFamily: "'IBM Plex Mono', monospace",
    padding: '2px 7px',
    width: 'fit-content',
  },
  cardDesc: { color: '#b0b0b0', fontSize: 13, lineHeight: 1.6 },
  capTag: {
    background: '#141414',
    border: '1px solid #2a2a2a',
    borderRadius: 3,
    color: '#777',
    fontSize: 10,
    fontFamily: "'IBM Plex Mono', monospace",
    padding: '2px 7px',
  },
  statsRow: { borderTop: '1px solid #1a1a1a', display: 'flex', gap: 0, paddingTop: 14 },
  stat: { alignItems: 'center', display: 'flex', flexDirection: 'column' as const, flex: 1, gap: 2 },
  statVal: { color: '#e8e8e8', fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 500 },
  statLabel: { color: '#555', fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  address: { color: '#444', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 },
  cta: {
    background: 'rgba(0,255,136,0.06)',
    border: '1px solid rgba(0,255,136,0.25)',
    borderRadius: 5,
    color: '#00ff88',
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    marginTop: 4,
    padding: '10px 16px',
    textAlign: 'center' as const,
    textDecoration: 'none',
    transition: 'all 0.2s',
  },
};