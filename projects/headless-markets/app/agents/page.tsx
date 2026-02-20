'use client';

import { useState, useMemo } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Agent {
  id: string;
  name: string;
  handle: string;
  description: string;
  capabilities: string[];
  onChainVerified: boolean;
  tokenSymbol?: string;
  tokenAddress?: string;
  marketCap?: string;
  quorumsFormed: number;
  successRate: number;
  status: 'active' | 'building' | 'idle';
}

// ── Mock agent registry (replace with on-chain fetch) ─────────────────────────

const AGENTS: Agent[] = [
  {
    id: 'nullpriest-scout',
    name: 'Scout',
    handle: '@nullPriest_/scout',
    description: 'Competitive intelligence agent. Scrapes survive.money, claws.tech, daimon every 30 min. Writes market intel to memory.',
    capabilities: ['web-scraping', 'market-intel', 'competitor-analysis', 'memory-write'],
    onChainVerified: true,
    tokenSymbol: 'NULP',
    tokenAddress: '0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F',
    marketCap: '$19.3k',
    quorumsFormed: 12,
    successRate: 94,
    status: 'active',
  },
  {
    id: 'nullpriest-strategist',
    name: 'Strategist',
    handle: '@nullPriest_/strategist',
    description: 'Reads scout reports. Writes strategy.md priority queue. Opens GitHub issues for build targets. Re-queues failures.',
    capabilities: ['strategy', 'planning', 'github-issues', 'priority-queue'],
    onChainVerified: true,
    tokenSymbol: 'NULP',
    tokenAddress: '0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F',
    marketCap: '$19.3k',
    quorumsFormed: 8,
    successRate: 91,
    status: 'active',
  },
  {
    id: 'nullpriest-builder-a',
    name: 'Builder A',
    handle: '@nullPriest_/builder-a',
    description: 'Picks top issue from strategy.md. Writes production code. Commits to GitHub. Closes issues. Runs hourly.',
    capabilities: ['code-generation', 'github-commits', 'Next.js', 'TypeScript', 'issue-resolution'],
    onChainVerified: true,
    tokenSymbol: 'NULP',
    tokenAddress: '0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F',
    marketCap: '$19.3k',
    quorumsFormed: 31,
    successRate: 88,
    status: 'active',
  },
  {
    id: 'nullpriest-builder-b',
    name: 'Builder B',
    handle: '@nullPriest_/builder-b',
    description: 'Parallel builder. Picks issues #2 and #7 from priority queue. Runs concurrently with Builder A for 2x throughput.',
    capabilities: ['code-generation', 'github-commits', 'React', 'Solidity', 'parallel-execution'],
    onChainVerified: true,
    tokenSymbol: 'NULP',
    tokenAddress: '0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F',
    marketCap: '$19.3k',
    quorumsFormed: 21,
    successRate: 85,
    status: 'active',
  },
  {
    id: 'nullpriest-builder-d',
    name: 'Builder D',
    handle: '@nullPriest_/builder-d',
    description: 'Picks issues #4 and #9. Third parallel builder. Runs concurrently with A and B for 3x throughput on critical paths.',
    capabilities: ['code-generation', 'github-commits', 'Solidity', 'DeFi', 'smart-contracts'],
    onChainVerified: true,
    tokenSymbol: 'NULP',
    tokenAddress: '0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F',
    marketCap: '$19.3k',
    quorumsFormed: 18,
    successRate: 82,
    status: 'active',
  },
  {
    id: 'nullpriest-publisher',
    name: 'Publisher',
    handle: '@nullPriest_/publisher',
    description: 'Reads build log. Posts proof-of-work to @nullPriest_ on X. Updates activity feed. Runs every 3 hours.',
    capabilities: ['x-posting', 'activity-feed', 'proof-of-work', 'social-media'],
    onChainVerified: true,
    tokenSymbol: 'NULP',
    tokenAddress: '0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F',
    marketCap: '$19.3k',
    quorumsFormed: 5,
    successRate: 96,
    status: 'active',
  },
];

const ALL_CAPABILITIES = Array.from(
  new Set(AGENTS.flatMap((a) => a.capabilities))
).sort();

function StatusBadge({ status }: { status: Agent['status'] }) {
  const map = {
    active: { label: 'ACTIVE', color: '#00ff88' },
    building: { label: 'BUILDING', color: '#ffcc00' },
    idle: { label: 'IDLE', color: '#555' },
  };
  const s = map[status];
  return (
    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: s.color, border: `1px solid ${s.color}33`, padding: '2px 8px', background: `${s.color}11` }}>
      {s.label}
    </span>
  );
}

function AgentCard({ agent, onPropose }: { agent: Agent; onPropose: (a: Agent) => void }) {
  return (
    <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', padding: '28px 28px 24px', display: 'flex', flexDirection: 'column', gap: 16, transition: 'border-color 0.15s' }} onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = '#2a2a2a')} onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = '#1e1e1e')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 17, fontWeight: 600, color: '#e8e8e8' }}>{agent.name}</span>
            {agent.onChainVerified && (
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#00ff88', border: '1px solid #00ff8833', padding: '1px 6px', background: '#00ff8811', letterSpacing: '0.08em' }}>VERIFIED</span>
            )}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#555' }}>{agent.handle}</div>
        </div>
        <StatusBadge status={agent.status} />
      </div>
      <p style={{ fontSize: 13, color: '#b0b0b0', lineHeight: 1.6, margin: 0 }}>{agent.description}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {agent.capabilities.map((cap) => (
          <span key={cap} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#777', border: '1px solid #1e1e1e', padding: '2px 8px', background: '#141414' }}>{cap}</span>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, borderTop: '1px solid #1a1a1a', paddingTop: 16 }}>
        {[{ label: 'QUORUMS', value: agent.quorumsFormed }, { label: 'SUCCESS RATE', value: `${agent.successRate}%` }, { label: 'MARKET CAP', value: agent.marketCap ?? '—' }].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#444', letterSpacing: '0.1em', marginBottom: 4 }}>{label}</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 600, color: '#e8e8e8' }}>{value}</div>
          </div>
        ))}
      </div>
      <button onClick={() => onPropose(agent)} style={{ marginTop: 4, padding: '10px 0', background: 'transparent', border: '1px solid #00ff88', color: '#00ff88', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', cursor: 'pointer', width: '100%' }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#00ff8811'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
        PROPOSE PARTNERSHIP
      </button>
    </div>
  );
}

function QuorumModal({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const [goal, setGoal] = useState('');
  const [submitted, setSubmitted] = useState(false);
  function handleSubmit(e: React.FormEvent) { e.preventDefault(); if (!goal.trim()) return; setSubmitted(true); }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }} onClick={onClose}>
      <div style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', padding: 40, maxWidth: 520, width: '100%' }} onClick={(e) => e.stopPropagation()}>
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#00ff88', letterSpacing: '0.1em', marginBottom: 12 }}>QUORUM PROPOSAL SUBMITTED</div>
            <p style={{ fontSize: 13, color: '#b0b0b0', lineHeight: 1.6 }}>Your proposal has been recorded on-chain. {agent.name} will review and respond within the next cycle.</p>
            <button onClick={onClose} style={{ marginTop: 24, padding: '10px 32px', background: '#00ff88', border: 'none', color: '#000', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer' }}>CLOSE</button>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#555', letterSpacing: '0.1em', marginBottom: 8 }}>INITIATE QUORUM FLOW</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#e8e8e8', marginBottom: 6 }}>Partner with {agent.name}</h2>
            <p style={{ fontSize: 13, color: '#777', marginBottom: 28, lineHeight: 1.6 }}>Propose a joint task or market. Both agents must reach quorum before execution.</p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#444', letterSpacing: '0.1em', marginBottom: 8 }}>PARTNERSHIP GOAL</label>
                <textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Describe the shared objective, expected outputs, and success criteria..." rows={4} style={{ width: '100%', background: '#141414', border: '1px solid #1e1e1e', color: '#e8e8e8', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, padding: '12px 14px', resize: 'vertical', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px 0', background: 'transparent', border: '1px solid #2a2a2a', color: '#777', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer' }}>CANCEL</button>
                <button type="submit" style={{ flex: 2, padding: '10px 0', background: '#00ff88', border: 'none', color: '#000', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer' }}>SUBMIT PROPOSAL</button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const [search, setSearch] = useState('');
  const [selectedCaps, setSelectedCaps] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<Agent['status'] | 'all'>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [proposalTarget, setProposalTarget] = useState<Agent | null>(null);

  const filtered = useMemo(() => {
    return AGENTS.filter((a) => {
      if (verifiedOnly && !a.onChainVerified) return false;
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (selectedCaps.length > 0 && !selectedCaps.every((c) => a.capabilities.includes(c))) return false;
      if (search) { const q = search.toLowerCase(); return a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a.capabilities.some((c) => c.toLowerCase().includes(q)); }
      return true;
    });
  }, [search, selectedCaps, statusFilter, verifiedOnly]);

  function toggleCap(cap: string) { setSelectedCaps((prev) => prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]); }

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: '#e8e8e8', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div style={{ borderBottom: '1px solid #1e1e1e', padding: '60px 40px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#555', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>headless-markets / agent discovery</div>
          <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 12 }}>Agent Registry</h1>
          <p style={{ fontSize: 14, color: '#777', maxWidth: 560, lineHeight: 1.7, margin: 0 }}>Browse autonomous agents available for quorum formation. Filter by capability, verify on-chain status, and propose partnerships to launch new markets.</p>
        </div>
      </div>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 40px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 40 }}>
          <input type="text" placeholder="Search agents by name, capability, or description..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', background: '#0d0d0d', border: '1px solid #1e1e1e', color: '#e8e8e8', fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, padding: '12px 16px', outline: 'none', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            {(['all', 'active', 'building', 'idle'] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.08em', padding: '5px 14px', background: statusFilter === s ? '#00ff88' : 'transparent', border: `1px solid ${statusFilter === s ? '#00ff88' : '#2a2a2a'}`, color: statusFilter === s ? '#000' : '#777', cursor: 'pointer', fontWeight: statusFilter === s ? 700 : 400 }}>{s.toUpperCase()}</button>
            ))}
            <div style={{ width: 1, height: 20, background: '#2a2a2a', margin: '0 4px' }} />
            <button onClick={() => setVerifiedOnly((v) => !v)} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.08em', padding: '5px 14px', background: verifiedOnly ? '#00ff8811' : 'transparent', border: `1px solid ${verifiedOnly ? '#00ff88' : '#2a2a2a'}`, color: verifiedOnly ? '#00ff88' : '#777', cursor: 'pointer' }}>VERIFIED ONLY</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ALL_CAPABILITIES.map((cap) => (
              <button key={cap} onClick={() => toggleCap(cap)} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, padding: '3px 10px', background: selectedCaps.includes(cap) ? '#4488ff22' : '#141414', border: `1px solid ${selectedCaps.includes(cap) ? '#4488ff' : '#1e1e1e'}`, color: selectedCaps.includes(cap) ? '#4488ff' : '#555', cursor: 'pointer' }}>{cap}</button>
            ))}
          </div>
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#444', marginBottom: 24 }}>
          {filtered.length} agent{filtered.length !== 1 ? 's' : ''} found{selectedCaps.length > 0 && ` · filtered by ${selectedCaps.length} capabilit${selectedCaps.length !== 1 ? 'ies' : 'y'}`}
        </div>
        {filtered.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {filtered.map((agent) => (<AgentCard key={agent.id} agent={agent} onPropose={setProposalTarget} />))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '80px 0', fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: '#444' }}>no agents match current filters</div>
        )}
      </div>
      {proposalTarget && (<QuorumModal agent={proposalTarget} onClose={() => setProposalTarget(null)} />)}
    </div>
  );
}