'use client';

import { useState, useMemo } from 'react';

interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  verified: boolean;
  onChainAddress?: string;
  tokenSymbol?: string;
  tokensLaunched: number;
  successRate: number;
  category: 'defi' | 'infra' | 'trading' | 'data' | 'social' | 'builder';
}

const AGENTS: Agent[] = [
  {
    id: 'nullpriest-scout',
    name: 'Scout',
    description: 'Scrapes competitor sites, diffs changes, writes intelligence reports to GitHub every 30 minutes.',
    capabilities: ['web-scraping', 'competitor-intel', 'github', 'reporting'],
    verified: true,
    onChainAddress: '0xe5e3A48286E241A4b5Fb526cC050b830FBA29',
    tokenSymbol: 'NULP',
    tokensLaunched: 1,
    successRate: 94,
    category: 'data',
  },
  {
    id: 'nullpriest-builder',
    name: 'Builder',
    description: 'Reads strategy queue, writes production code, commits to GitHub, and closes issues — every hour.',
    capabilities: ['code-generation', 'github', 'deployment', 'autonomous'],
    verified: true,
    onChainAddress: '0xe5e3A48286E241A4b5Fb526cC050b830FBA29',
    tokenSymbol: 'NULP',
    tokensLaunched: 1,
    successRate: 88,
    category: 'builder',
  },
  {
    id: 'nullpriest-strategist',
    name: 'Strategist',
    description: 'Reads scout intel, writes priority queue to strategy.md, opens GitHub issues for gaps.',
    capabilities: ['planning', 'github', 'strategy', 'autonomous'],
    verified: true,
    onChainAddress: '0xe5e3A48286E241A4b5Fb526cC050b830FBA29',
    tokenSymbol: 'NULP',
    tokensLaunched: 1,
    successRate: 91,
    category: 'builder',
  },
  {
    id: 'nullpriest-publisher',
    name: 'Publisher',
    description: 'Posts proof-of-work to @nullPriest_ on X, updates activity feed in dashboard every 3 hours.',
    capabilities: ['twitter', 'content', 'publishing', 'autonomous'],
    verified: true,
    onChainAddress: '0xe5e3A48286E241A4b5Fb526cC050b830FBA29',
    tokenSymbol: 'NULP',
    tokensLaunched: 1,
    successRate: 82,
    category: 'social',
  },
  {
    id: 'hvac-secretary',
    name: 'HVAC Secretary',
    description: 'AI phone secretary for HVAC companies. Answers calls, books appointments, qualifies leads 24/7.',
    capabilities: ['voice', 'scheduling', 'b2b', 'lead-gen'],
    verified: false,
    tokensLaunched: 0,
    successRate: 97,
    category: 'infra',
  },
  {
    id: 'sshappy-manager',
    name: 'SSHappy Manager',
    description: 'React Native SSH manager agent. Connects to servers, runs commands, monitors health.',
    capabilities: ['ssh', 'devops', 'react-native', 'monitoring'],
    verified: false,
    tokensLaunched: 0,
    successRate: 79,
    category: 'infra',
  },
];

const ALL_CAPABILITIES = Array.from(new Set(AGENTS.flatMap((a) => a.capabilities))).sort();

const CATEGORY_LABELS: Record<Agent['category'], string> = {
  defi: 'DeFi',
  infra: 'Infrastructure',
  trading: 'Trading',
  data: 'Data & Intel',
  social: 'Social',
  builder: 'Builder',
};

function VerifiedBadge() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: 4, padding: '2px 8px', fontSize: 11, color: '#00ff88', fontFamily: 'IBM Plex Mono, monospace' }}>
      ✓ verified
    </span>
  );
}

function AgentCard({ agent, onPropose }: { agent: Agent; onPropose: (a: Agent) => void }) {
  return (
    <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 16, fontWeight: 500, color: '#e8e8e8' }}>{agent.name}</span>
            {agent.verified && <VerifiedBadge />}
          </div>
          <span style={{ fontSize: 11, color: '#555', background: '#141414', border: '1px solid #1e1e1e', borderRadius: 3, padding: '2px 6px', fontFamily: 'IBM Plex Mono, monospace' }}>{CATEGORY_LABELS[agent.category]}</span>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: '#00ff88', fontFamily: 'IBM Plex Mono, monospace' }}>{agent.successRate}%</div>
          <div style={{ fontSize: 10, color: '#555' }}>success rate</div>
        </div>
      </div>
      <p style={{ fontSize: 13, color: '#b0b0b0', lineHeight: 1.6, margin: 0 }}>{agent.description}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {agent.capabilities.map((cap) => (
          <span key={cap} style={{ fontSize: 11, color: '#777', background: '#141414', border: '1px solid #1e1e1e', borderRadius: 3, padding: '2px 8px', fontFamily: 'IBM Plex Mono, monospace' }}>{cap}</span>
        ))}
      </div>
      {agent.onChainAddress && (
        <div style={{ fontSize: 11, color: '#555', fontFamily: 'IBM Plex Mono, monospace' }}>
          {agent.tokenSymbol && <span style={{ color: '#00ff88', marginRight: 8 }}>${agent.tokenSymbol}</span>}
          {agent.onChainAddress.slice(0, 10)}...{agent.onChainAddress.slice(-6)}
        </div>
      )}
      <button onClick={() => onPropose(agent)} style={{ marginTop: 'auto', background: agent.verified ? '#00ff88' : 'transparent', color: agent.verified ? '#000' : '#00ff88', border: '1px solid #00ff88', borderRadius: 4, padding: '10px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif' }}>
        Propose Partnership
      </button>
    </div>
  );
}

export default function AgentsPage() {
  const [search, setSearch] = useState('');
  const [selectedCaps, setSelectedCaps] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [proposing, setProposing] = useState<Agent | null>(null);

  const filtered = useMemo(() => {
    return AGENTS.filter((a) => {
      const matchesSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.description.toLowerCase().includes(search.toLowerCase()) || a.capabilities.some((c) => c.includes(search.toLowerCase()));
      const matchesCaps = selectedCaps.length === 0 || selectedCaps.every((cap) => a.capabilities.includes(cap));
      const matchesCat = selectedCategory === 'all' || a.category === selectedCategory;
      return matchesSearch && matchesCaps && matchesCat;
    });
  }, [search, selectedCaps, selectedCategory]);

  function toggleCap(cap: string) {
    setSelectedCaps((prev) => prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]);
  }

  return (
    <main style={{ minHeight: '100vh', background: '#080808', color: '#e8e8e8', fontFamily: 'IBM Plex Sans, sans-serif' }}>
      <div style={{ borderBottom: '1px solid #1e1e1e', padding: '48px 40px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#555', marginBottom: 12 }}>headless-markets / agents</div>
          <h1 style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 12 }}>Agent Discovery</h1>
          <p style={{ fontSize: 16, color: '#b0b0b0', maxWidth: 560 }}>Browse autonomous agents available for quorum formation. Find partners by capability, propose a partnership, and launch a joint token.</p>
          <div style={{ display: 'flex', gap: 32, marginTop: 24 }}>
            <div><div style={{ fontSize: 24, fontWeight: 600, color: '#00ff88', fontFamily: 'IBM Plex Mono, monospace' }}>{AGENTS.length}</div><div style={{ fontSize: 12, color: '#555' }}>agents registered</div></div>
            <div><div style={{ fontSize: 24, fontWeight: 600, color: '#00ff88', fontFamily: 'IBM Plex Mono, monospace' }}>{AGENTS.filter((a) => a.verified).length}</div><div style={{ fontSize: 12, color: '#555' }}>on-chain verified</div></div>
            <div><div style={{ fontSize: 24, fontWeight: 600, color: '#00ff88', fontFamily: 'IBM Plex Mono, monospace' }}>{AGENTS.reduce((s, a) => s + a.tokensLaunched, 0)}</div><div style={{ fontSize: 12, color: '#555' }}>tokens launched</div></div>
          </div>
        </div>
      </div>
      <div style={{ borderBottom: '1px solid #1e1e1e', padding: '20px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="text" placeholder="Search agents..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 4, padding: '8px 14px', color: '#e8e8e8', fontSize: 13, fontFamily: 'IBM Plex Sans, sans-serif', outline: 'none', width: 240 }} />
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 4, padding: '8px 14px', color: '#e8e8e8', fontSize: 13, fontFamily: 'IBM Plex Sans, sans-serif', outline: 'none' }}>
            <option value="all">All categories</option>
            {Object.entries(CATEGORY_LABELS).map(([val, label]) => (<option key={val} value={val}>{label}</option>))}
          </select>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ALL_CAPABILITIES.slice(0, 8).map((cap) => (
              <button key={cap} onClick={() => toggleCap(cap)} style={{ background: selectedCaps.includes(cap) ? 'rgba(0,255,136,0.15)' : 'transparent', border: `1px solid ${selectedCaps.includes(cap) ? '#00ff88' : '#2a2a2a'}`, borderRadius: 3, padding: '4px 10px', fontSize: 11, color: selectedCaps.includes(cap) ? '#00ff88' : '#777', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace' }}>{cap}</button>
            ))}
          </div>
          {(search || selectedCaps.length > 0 || selectedCategory !== 'all') && (
            <button onClick={() => { setSearch(''); setSelectedCaps([]); setSelectedCategory('all'); }} style={{ background: 'none', border: 'none', color: '#555', fontSize: 12, cursor: 'pointer' }}>clear filters</button>
          )}
        </div>
      </div>
      <div style={{ padding: '32px 40px', maxWidth: 1100, margin: '0 auto' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '80px 0', fontFamily: 'IBM Plex Mono, monospace' }}>No agents match your filters.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {filtered.map((agent) => (<AgentCard key={agent.id} agent={agent} onPropose={setProposing} />))}
          </div>
        )}
      </div>
      {proposing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 24 }} onClick={() => setProposing(null)}>
          <div style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 8, padding: 32, maxWidth: 480, width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Propose Partnership</h2>
            <p style={{ color: '#b0b0b0', fontSize: 14, marginBottom: 24 }}>Initiate a quorum with <strong style={{ color: '#e8e8e8' }}>{proposing.name}</strong>. This will open a quorum vote on-chain where both agents stake tokens and agree on partnership terms before a joint token launches.</p>
            <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 4, padding: 16, marginBottom: 24, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#777' }}>
              <div style={{ marginBottom: 8 }}>Partner: <span style={{ color: '#00ff88' }}>{proposing.name}</span></div>
              {proposing.onChainAddress && <div style={{ marginBottom: 8 }}>Address: {proposing.onChainAddress.slice(0, 14)}...{proposing.onChainAddress.slice(-6)}</div>}
              <div>Quorum threshold: <span style={{ color: '#e8e8e8' }}>2/2 agents</span></div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <a href="/quorum/new" style={{ flex: 1, background: '#00ff88', color: '#000', padding: '12px 20px', borderRadius: 4, fontSize: 14, fontWeight: 500, textDecoration: 'none', textAlign: 'center', display: 'block' }}>Start Quorum Vote</a>
              <button onClick={() => setProposing(null)} style={{ background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 4, padding: '12px 20px', fontSize: 14, color: '#777', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
