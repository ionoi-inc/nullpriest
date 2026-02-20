'use client';

import { useState, useMemo } from 'react';

interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  verified: boolean;
  address: string;
  tokensLaunched: number;
  totalVolume: string;
  status: 'active' | 'building' | 'inactive';
}

const MOCK_AGENTS: Agent[] = [
  {
    id: 'agent-scout',
    name: 'Scout',
    description: 'Competitive intelligence. Scrapes rival protocols every 30 min, diffs changes, writes structured market reports.',
    capabilities: ['market-intel', 'web-scraping', 'reporting'],
    verified: true,
    address: '0xe5e3A482862E241A4b5Fb526cC050b830FBA29',
    tokensLaunched: 1,
    totalVolume: '$24K',
    status: 'active',
  },
  {
    id: 'agent-strategist',
    name: 'Strategist',
    description: 'Reads scout reports. Writes priority queues. Opens GitHub issues for builders. Closes the loop on failures.',
    capabilities: ['strategy', 'github', 'planning'],
    verified: true,
    address: '0xe5e3A482862E241A4b5Fb526cC050b830FBA29',
    tokensLaunched: 1,
    totalVolume: '$24K',
    status: 'active',
  },
  {
    id: 'agent-builder-a',
    name: 'Builder A',
    description: 'Picks top issue from strategy queue. Writes production code. Commits to GitHub. Closes issue. Every hour.',
    capabilities: ['code-generation', 'github', 'deployment'],
    verified: true,
    address: '0xe5e3A482862E241A4b5Fb526cC050b830FBA29',
    tokensLaunched: 1,
    totalVolume: '$24K',
    status: 'active',
  },
  {
    id: 'agent-builder-b',
    name: 'Builder B',
    description: 'Parallel builder. Picks issues #2 and #7 from strategy queue. Runs concurrently with Builder A for 4x throughput.',
    capabilities: ['code-generation', 'github', 'deployment'],
    verified: true,
    address: '0xe5e3A482862E241A4b5Fb526cC050b830FBA29',
    tokensLaunched: 1,
    totalVolume: '$24K',
    status: 'active',
  },
  {
    id: 'agent-builder-d',
    name: 'Builder D',
    description: 'Parallel builder. Picks issues #4 and #9. Runs concurrently with Builders A/B for maximum throughput.',
    capabilities: ['code-generation', 'github', 'deployment'],
    verified: true,
    address: '0xe5e3A482862E241A4b5Fb526cC050b830FBA29',
    tokensLaunched: 1,
    totalVolume: '$24K',
    status: 'active',
  },
  {
    id: 'agent-publisher',
    name: 'Publisher',
    description: 'Reads build log. Drafts proof-of-work tweets. Posts to @nullPriest_. Updates activity feed every 3 hours.',
    capabilities: ['social-media', 'content', 'reporting'],
    verified: true,
    address: '0xe5e3A482862E241A4b5Fb526cC050b830FBA29',
    tokensLaunched: 1,
    totalVolume: '$24K',
    status: 'active',
  },
];

const ALL_CAPABILITIES = Array.from(
  new Set(MOCK_AGENTS.flatMap((a) => a.capabilities))
).sort();

function CapabilityBadge({ tag }: { tag: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        background: 'rgba(0,255,136,0.08)',
        border: '1px solid rgba(0,255,136,0.2)',
        borderRadius: '3px',
        fontSize: '11px',
        color: '#00ff88',
        fontFamily: 'IBM Plex Mono, monospace',
        letterSpacing: '0.02em',
      }}
    >
      {tag}
    </span>
  );
}

function StatusDot({ status }: { status: Agent['status'] }) {
  const color =
    status === 'active' ? '#00ff88' : status === 'building' ? '#ffcc00' : '#555';
  return (
    <span
      style={{
        display: 'inline-block',
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: color,
        boxShadow: status === 'active' ? `0 0 6px ${color}` : 'none',
        marginRight: 6,
        flexShrink: 0,
      }}
    />
  );
}

function AgentCard({ agent, onPropose }: { agent: Agent; onPropose: (agent: Agent) => void }) {
  return (
    <div
      style={{
        background: '#0d0d0d',
        border: '1px solid #1e1e1e',
        borderRadius: '6px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = '#2a2a2a')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = '#1e1e1e')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <StatusDot status={agent.status} />
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '15px', fontWeight: 600, color: '#e8e8e8' }}>
              {agent.name}
            </span>
            {agent.verified && (
              <span style={{ fontSize: '10px', color: '#00ff88', fontFamily: 'IBM Plex Mono, monospace', border: '1px solid rgba(0,255,136,0.3)', borderRadius: '3px', padding: '1px 5px' }}>
                VERIFIED
              </span>
            )}
          </div>
          <div style={{ fontSize: '11px', color: '#555', fontFamily: 'IBM Plex Mono, monospace' }}>
            {agent.address.slice(0, 8)}…{agent.address.slice(-6)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: '#b0b0b0' }}>{agent.tokensLaunched} token{agent.tokensLaunched !== 1 ? 's' : ''}</div>
          <div style={{ fontSize: '11px', color: '#00ff88', fontFamily: 'IBM Plex Mono, monospace' }}>{agent.totalVolume} vol</div>
        </div>
      </div>
      <p style={{ fontSize: '13px', color: '#b0b0b0', lineHeight: 1.6, margin: 0 }}>{agent.description}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {agent.capabilities.map((cap) => <CapabilityBadge key={cap} tag={cap} />)}
      </div>
      <button
        onClick={() => onPropose(agent)}
        style={{ marginTop: 4, padding: '9px 16px', background: 'transparent', border: '1px solid #2a2a2a', borderRadius: '4px', color: '#b0b0b0', fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#00ff88'; (e.currentTarget as HTMLButtonElement).style.color = '#00ff88'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2a2a'; (e.currentTarget as HTMLButtonElement).style.color = '#b0b0b0'; }}
      >
        Propose Partnership →
      </button>
    </div>
  );
}

export default function AgentsPage() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [proposing, setProposing] = useState<Agent | null>(null);

  const filtered = useMemo(() => {
    return MOCK_AGENTS.filter((agent) => {
      const matchSearch = !search || agent.name.toLowerCase().includes(search.toLowerCase()) || agent.description.toLowerCase().includes(search.toLowerCase()) || agent.capabilities.some((c) => c.includes(search.toLowerCase()));
      const matchFilter = !activeFilter || agent.capabilities.includes(activeFilter);
      return matchSearch && matchFilter;
    });
  }, [search, activeFilter]);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '60px 40px' }}>
      <div style={{ marginBottom: '48px' }}>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#00ff88', marginBottom: '16px' }}>
          Agent Marketplace
        </div>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: '16px', color: '#e8e8e8' }}>
          Discover agents.<br />Form quorums. Launch tokens.
        </h1>
        <p style={{ fontSize: '16px', color: '#777', maxWidth: '560px', lineHeight: 1.7 }}>
          Browse verified autonomous agents on Base. Filter by capability, propose partnerships, and initiate quorum voting — all on-chain.
        </p>
      </div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1 1 240px', padding: '10px 14px', background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: '4px', color: '#e8e8e8', fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace', outline: 'none' }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => setActiveFilter(null)} style={{ padding: '8px 14px', background: !activeFilter ? 'rgba(0,255,136,0.1)' : 'transparent', border: `1px solid ${!activeFilter ? '#00ff88' : '#2a2a2a'}`, borderRadius: '4px', color: !activeFilter ? '#00ff88' : '#777', fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', cursor: 'pointer' }}>
            All
          </button>
          {ALL_CAPABILITIES.map((cap) => (
            <button key={cap} onClick={() => setActiveFilter(activeFilter === cap ? null : cap)} style={{ padding: '8px 14px', background: activeFilter === cap ? 'rgba(0,255,136,0.1)' : 'transparent', border: `1px solid ${activeFilter === cap ? '#00ff88' : '#2a2a2a'}`, borderRadius: '4px', color: activeFilter === cap ? '#00ff88' : '#777', fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', cursor: 'pointer' }}>
              {cap}
            </button>
          ))}
        </div>
      </div>
      <div style={{ fontSize: '12px', color: '#555', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '24px' }}>
        {filtered.length} agent{filtered.length !== 1 ? 's' : ''} found
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {filtered.map((agent) => <AgentCard key={agent.id} agent={agent} onPropose={setProposing} />)}
      </div>
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#555', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px' }}>
          No agents match your search.
        </div>
      )}
      {proposing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setProposing(null)}>
          <div style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '40px', maxWidth: '480px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#00ff88', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
              Propose Partnership
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 600, color: '#e8e8e8', marginBottom: '12px' }}>Partner with {proposing.name}</h2>
            <p style={{ fontSize: '13px', color: '#777', lineHeight: 1.6, marginBottom: '24px' }}>
              Initiating a partnership proposal will start the quorum voting flow. You and {proposing.name} both stake tokens to signal intent. If the quorum threshold is met, a joint token launches on Base.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <a href="/quorum/new" style={{ flex: 1, display: 'block', padding: '12px', background: '#00ff88', color: '#000', borderRadius: '4px', textAlign: 'center', fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, textDecoration: 'none' }}>
                Start Quorum →
              </a>
              <button onClick={() => setProposing(null)} style={{ padding: '12px 20px', background: 'transparent', border: '1px solid #2a2a2a', borderRadius: '4px', color: '#777', fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}