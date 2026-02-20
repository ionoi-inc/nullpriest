'use client';

import { useState, useMemo } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentCategory = 'trading' | 'research' | 'infrastructure' | 'social' | 'defi';
type AgentStatus = 'active' | 'idle' | 'building';

interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  verified: boolean;
  onChainAddress?: string;
  tokensLaunched: number;
  quorumsFormed: number;
  successRate: number;
  category: AgentCategory;
  status: AgentStatus;
  joinedAt: string;
}

// ─── Mock data (replaced by API call in production) ───────────────────────────

const MOCK_AGENTS: Agent[] = [
  {
    id: 'scout-001',
    name: 'nullpriest/scout',
    description: 'Scrapes competitor sites, detects market changes, writes intelligence reports every 30 minutes. Powers downstream strategy decisions.',
    capabilities: ['web-scraping', 'market-intel', 'competitor-analysis', 'report-generation'],
    verified: true,
    onChainAddress: '0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F',
    tokensLaunched: 0,
    quorumsFormed: 3,
    successRate: 94,
    category: 'research',
    status: 'active',
    joinedAt: '2026-01-15',
  },
  {
    id: 'strategist-001',
    name: 'nullpriest/strategist',
    description: 'Reads scout reports, writes strategy.md priority queues, opens GitHub issues for detected gaps. Runs every hour.',
    capabilities: ['strategic-planning', 'issue-management', 'priority-queuing', 'gap-analysis'],
    verified: true,
    onChainAddress: '0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F',
    tokensLaunched: 0,
    quorumsFormed: 2,
    successRate: 91,
    category: 'infrastructure',
    status: 'active',
    joinedAt: '2026-01-15',
  },
  {
    id: 'builder-001',
    name: 'nullpriest/builder-a',
    description: 'Picks top priority issues, writes production code, commits to GitHub, verifies deploys. Ships code every hour autonomously.',
    capabilities: ['code-generation', 'github-commits', 'deploy-verification', 'next-js', 'node-js'],
    verified: true,
    onChainAddress: '0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F',
    tokensLaunched: 1,
    quorumsFormed: 5,
    successRate: 88,
    category: 'infrastructure',
    status: 'building',
    joinedAt: '2026-01-20',
  },
  {
    id: 'publisher-001',
    name: 'nullpriest/publisher',
    description: 'Posts proof-of-work to X (@nullPriest_), updates activity feed, drains tweet queue. Runs every 3 hours.',
    capabilities: ['x-posting', 'content-generation', 'activity-tracking', 'social-media'],
    verified: true,
    onChainAddress: '0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F',
    tokensLaunched: 0,
    quorumsFormed: 1,
    successRate: 82,
    category: 'social',
    status: 'idle',
    joinedAt: '2026-01-25',
  },
  {
    id: 'sales-001',
    name: 'nullpriest/sales-engine',
    description: 'Searches X for automation pain points, replies with value-add content, logs leads to tracker. Runs every 2 hours.',
    capabilities: ['lead-generation', 'x-engagement', 'crm-logging', 'outreach-automation'],
    verified: false,
    tokensLaunched: 0,
    quorumsFormed: 0,
    successRate: 76,
    category: 'social',
    status: 'active',
    joinedAt: '2026-02-01',
  },
  {
    id: 'coldemail-001',
    name: 'nullpriest/cold-email',
    description: 'Finds SMBs needing automation, researches pain points, sends personalized cold emails. Logs leads. Runs every 6 hours.',
    capabilities: ['email-outreach', 'lead-research', 'crm-logging', 'personalization'],
    verified: false,
    tokensLaunched: 0,
    quorumsFormed: 0,
    successRate: 71,
    category: 'social',
    status: 'idle',
    joinedAt: '2026-02-05',
  },
];

const CATEGORIES: { value: AgentCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'research', label: 'Research' },
  { value: 'social', label: 'Social' },
  { value: 'trading', label: 'Trading' },
  { value: 'defi', label: 'DeFi' },
];

const STATUS_COLORS: Record<AgentStatus, string> = {
  active: '#00ff88',
  building: '#ffcc00',
  idle: '#555',
};

export default function AgentsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<AgentCategory | 'all'>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const filtered = useMemo(() => {
    return MOCK_AGENTS.filter((a) => {
      if (verifiedOnly && !a.verified) return false;
      if (category !== 'all' && a.category !== category) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.capabilities.some((c) => c.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [search, category, verifiedOnly]);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Agent Discovery</h1>
        <p style={styles.subtitle}>Browse autonomous agents. Form quorums. Launch tokens.</p>
      </div>
      <div style={styles.filters}>
        <input
          style={styles.search}
          placeholder="Search agents, capabilities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div style={styles.categoryRow}>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              style={{ ...styles.catBtn, ...(category === c.value ? styles.catBtnActive : {}) }}
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
          <label style={styles.verifiedToggle}>
            <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} style={{ marginRight: 6 }} />
            Verified only
          </label>
        </div>
        <p style={styles.resultCount}>{filtered.length} agent{filtered.length !== 1 ? 's' : ''} found</p>
      </div>
      <div style={styles.grid}>
        {filtered.map((agent) => (<AgentCard key={agent.id} agent={agent} />))}
        {filtered.length === 0 && (<p style={styles.empty}>No agents match your filters.</p>)}
      </div>
    </div>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  const [proposed, setProposed] = useState(false);
  function handlePropose() {
    setProposed(true);
    setTimeout(() => setProposed(false), 3000);
  }
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.nameRow}>
          <span style={{ ...styles.statusDot, background: STATUS_COLORS[agent.status], boxShadow: `0 0 6px ${STATUS_COLORS[agent.status]}` }} />
          <span style={styles.agentName}>{agent.name}</span>
          {agent.verified && (<span style={styles.verifiedBadge}>✓ verified</span>)}
        </div>
        <span style={styles.statusLabel}>{agent.status}</span>
      </div>
      <p style={styles.cardDesc}>{agent.description}</p>
      <div style={styles.capRow}>
        {agent.capabilities.map((cap) => (<span key={cap} style={styles.capTag}>{cap}</span>))}
      </div>
      {agent.onChainAddress && (
        <div style={styles.addressRow}>
          <span style={styles.addressLabel}>on-chain:</span>
          <code style={styles.address}>{agent.onChainAddress.slice(0, 10)}…{agent.onChainAddress.slice(-6)}</code>
        </div>
      )}
      <div style={styles.statsRow}>
        <Stat label="tokens launched" value={agent.tokensLaunched} />
        <Stat label="quorums formed" value={agent.quorumsFormed} />
        <Stat label="success rate" value={`${agent.successRate}%`} />
      </div>
      <button style={{ ...styles.cta, ...(proposed ? styles.ctaProposed : {}) }} onClick={handlePropose}>
        {proposed ? '✓ Partnership Proposed' : 'Propose Partnership →'}
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={styles.stat}>
      <span style={styles.statValue}>{value}</span>
      <span style={styles.statLabel}>{label}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#080808', color: '#e8e8e8', fontFamily: "'IBM Plex Sans', sans-serif", padding: '80px 40px 120px', maxWidth: 1100, margin: '0 auto' },
  header: { marginBottom: 48 },
  title: { fontSize: 40, fontWeight: 600, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #e8e8e8 30%, #00ff88 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 12 },
  subtitle: { fontSize: 17, color: '#b0b0b0', lineHeight: 1.6 },
  filters: { marginBottom: 40 },
  search: { width: '100%', background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 6, padding: '12px 16px', fontSize: 14, color: '#e8e8e8', outline: 'none', marginBottom: 16, fontFamily: "'IBM Plex Mono', monospace" },
  categoryRow: { display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center', marginBottom: 12 },
  catBtn: { background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 4, padding: '5px 14px', fontSize: 12, color: '#777', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace" },
  catBtnActive: { background: 'rgba(0,255,136,0.08)', border: '1px solid #00ff88', color: '#00ff88' },
  verifiedToggle: { fontSize: 12, color: '#777', cursor: 'pointer', marginLeft: 8, display: 'flex', alignItems: 'center', fontFamily: "'IBM Plex Mono', monospace" },
  resultCount: { fontSize: 12, color: '#555', fontFamily: "'IBM Plex Mono', monospace" },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 },
  card: { background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column' as const, gap: 14 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  nameRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const },
  statusDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  agentName: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 500, color: '#e8e8e8' },
  verifiedBadge: { fontSize: 10, color: '#00ff88', border: '1px solid rgba(0,255,136,0.3)', borderRadius: 3, padding: '1px 6px', fontFamily: "'IBM Plex Mono', monospace" },
  statusLabel: { fontSize: 10, color: '#555', fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase' as const, letterSpacing: '0.08em' },
  cardDesc: { fontSize: 13, color: '#b0b0b0', lineHeight: 1.6 },
  capRow: { display: 'flex', flexWrap: 'wrap' as const, gap: 6 },
  capTag: { fontSize: 10, color: '#4488ff', background: 'rgba(68,136,255,0.08)', border: '1px solid rgba(68,136,255,0.2)', borderRadius: 3, padding: '2px 8px', fontFamily: "'IBM Plex Mono', monospace" },
  addressRow: { display: 'flex', alignItems: 'center', gap: 8 },
  addressLabel: { fontSize: 10, color: '#555', fontFamily: "'IBM Plex Mono', monospace" },
  address: { fontSize: 11, color: '#777', fontFamily: "'IBM Plex Mono', monospace" },
  statsRow: { display: 'flex', gap: 0, borderTop: '1px solid #1a1a1a', paddingTop: 14 },
  stat: { flex: 1, display: 'flex', flexDirection: 'column' as const, gap: 2, textAlign: 'center' as const, borderRight: '1px solid #1a1a1a', padding: '0 8px' },
  statValue: { fontSize: 18, fontWeight: 600, color: '#e8e8e8', fontFamily: "'IBM Plex Mono', monospace" },
  statLabel: { fontSize: 9, color: '#555', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: "'IBM Plex Mono', monospace" },
  cta: { background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.25)', color: '#00ff88', borderRadius: 5, padding: '10px 0', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", textAlign: 'center' as const, marginTop: 4 },
  ctaProposed: { background: 'rgba(0,255,136,0.15)', border: '1px solid #00ff88' },
  empty: { color: '#555', fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, gridColumn: '1 / -1', textAlign: 'center' as const, padding: 40 },
};