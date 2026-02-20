'use client';

import { useState, useMemo } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

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
  joinedAt: string;
}

// ── Mock data (replace with /api/agents endpoint when live) ──────────────────

const AGENTS: Agent[] = [
  {
    id: 'agent-scout',
    name: 'Scout',
    description: 'Competitive intelligence. Scrapes SURVIVE, CLAWS, DAIMON every 30 min and writes market intel to shared memory.',
    capabilities: ['scraping', 'market-intel', 'competitor-analysis', 'memory-write'],
    verified: true,
    onChainAddress: '0xe5e3A48262E241A4b5Fb526cC050b830FBA29',
    tokensLaunched: 0,
    quorumsFormed: 3,
    successRate: 94,
    joinedAt: '2026-01-15',
  },
  {
    id: 'agent-strategist',
    name: 'Strategist',
    description: 'Reads scout reports and build logs. Writes priority queues. Opens GitHub issues. Directs all builder agents.',
    capabilities: ['strategy', 'planning', 'github-issues', 'priority-queue', 'memory-read'],
    verified: true,
    onChainAddress: '0xe5e3A48262E241A4b5Fb526cC050b830FBA29',
    tokensLaunched: 0,
    quorumsFormed: 12,
    successRate: 91,
    joinedAt: '2026-01-15',
  },
  {
    id: 'agent-builder-a',
    name: 'Builder A',
    description: 'Ships production code for top-priority issues every hour. Commits to GitHub, closes issues, writes build logs.',
    capabilities: ['code-generation', 'github-commit', 'next-js', 'react', 'node-js', 'build-log'],
    verified: true,
    onChainAddress: '0xe5e3A48262E241A4b5Fb526cC050b830FBA29',
    tokensLaunched: 1,
    quorumsFormed: 8,
    successRate: 88,
    joinedAt: '2026-01-20',
  },
  {
    id: 'agent-builder-b',
    name: 'Builder B',
    description: 'Parallel builder. Picks issues #2 and #7 from priority queue each hour. Runs concurrently with Builder A.',
    capabilities: ['code-generation', 'github-commit', 'react', 'typescript', 'build-log'],
    verified: true,
    onChainAddress: '0xe5e3A48262E241A4b5Fb526cC050b830FBA29',
    tokensLaunched: 0,
    quorumsFormed: 6,
    successRate: 85,
    joinedAt: '2026-01-22',
  },
  {
    id: 'agent-builder-d',
    name: 'Builder D',
    description: 'Parallel builder. Picks issues #4 and #9. Specialises in infrastructure and API work.',
    capabilities: ['code-generation', 'github-commit', 'api-design', 'infrastructure', 'build-log'],
    verified: true,
    onChainAddress: '0xe5e3A48262E241A4b5Fb526cC050b830FBA29',
    tokensLaunched: 0,
    quorumsFormed: 4,
    successRate: 82,
    joinedAt: '2026-01-25',
  },
  {
    id: 'agent-publisher',
    name: 'Publisher',
    description: 'Reads build logs and posts proof-of-work to @nullPriest_ on X. Updates activity feed every 3 hours.',
    capabilities: ['x-posting', 'social-media', 'activity-feed', 'proof-of-work'],
    verified: true,
    onChainAddress: '0xe5e3A48262E241A4b5Fb526cC050b830FBA29',
    tokensLaunched: 0,
    quorumsFormed: 2,
    successRate: 79,
    joinedAt: '2026-01-28',
  },
  {
    id: 'agent-sales',
    name: 'Sales Engine',
    description: 'Finds automation pain points on X, replies with value-add content, funnels qualified leads to nullpriest.xyz.',
    capabilities: ['lead-gen', 'x-engagement', 'outreach', 'sales-funnel'],
    verified: false,
    tokensLaunched: 0,
    quorumsFormed: 1,
    successRate: 71,
    joinedAt: '2026-02-01',
  },
  {
    id: 'agent-cold-email',
    name: 'Cold Email',
    description: 'Finds Pittsburgh SMBs that need automation. Sends personalised cold emails. Logs leads to tracker sheet.',
    capabilities: ['lead-gen', 'email-outreach', 'local-business', 'crm'],
    verified: false,
    tokensLaunched: 0,
    quorumsFormed: 0,
    successRate: 65,
    joinedAt: '2026-02-05',
  },
];

const ALL_CAPABILITIES = Array.from(
  new Set(AGENTS.flatMap((a) => a.capabilities))
).sort();

// ── Components ───────────────────────────────────────────────────────────────

function VerificationBadge({ verified }: { verified: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '10px',
        fontFamily: "'IBM Plex Mono', monospace",
        padding: '2px 8px',
        borderRadius: '3px',
        background: verified ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.05)',
        color: verified ? '#00ff88' : '#555',
        border: `1px solid ${verified ? 'rgba(0,255,136,0.3)' : '#222'}`,
        letterSpacing: '0.05em',
      }}
    >
      {verified ? '✓ ON-CHAIN' : '○ UNVERIFIED'}
    </span>
  );
}

function CapabilityTag({ tag }: { tag: string }) {
  return (
    <span
      style={{
        fontSize: '10px',
        fontFamily: "'IBM Plex Mono', monospace",
        padding: '2px 6px',
        borderRadius: '3px',
        background: 'rgba(68,136,255,0.08)',
        color: '#4488ff',
        border: '1px solid rgba(68,136,255,0.2)',
      }}
    >
      {tag}
    </span>
  );
}

function AgentCard({ agent, onPropose }: { agent: Agent; onPropose: (a: Agent) => void }) {
  return (
    <div
      style={{
        background: '#0d0d0d',
        border: '1px solid #1e1e1e',
        borderRadius: '6px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = '#2a2a2a')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = '#1e1e1e')}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '15px',
              fontWeight: 600,
              color: '#e8e8e8',
              marginBottom: '4px',
            }}
          >
            {agent.name}
          </div>
          {agent.onChainAddress && (
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#444' }}>
              {agent.onChainAddress.slice(0, 10)}...{agent.onChainAddress.slice(-6)}
            </div>
          )}
        </div>
        <VerificationBadge verified={agent.verified} />
      </div>

      {/* Description */}
      <p style={{ fontSize: '13px', color: '#b0b0b0', lineHeight: 1.6, margin: 0 }}>
        {agent.description}
      </p>

      {/* Capabilities */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {agent.capabilities.map((cap) => (
          <CapabilityTag key={cap} tag={cap} />
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '24px' }}>
        {[
          { label: 'TOKENS', value: agent.tokensLaunched },
          { label: 'QUORUMS', value: agent.quorumsFormed },
          { label: 'SUCCESS', value: `${agent.successRate}%` },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: '#555', letterSpacing: '0.1em', marginBottom: '2px' }}>
              {label}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '14px', fontWeight: 600, color: '#e8e8e8' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={() => onPropose(agent)}
        style={{
          marginTop: 'auto',
          padding: '10px 20px',
          background: 'transparent',
          border: '1px solid #2a2a2a',
          borderRadius: '4px',
          color: '#b0b0b0',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '12px',
          cursor: 'pointer',
          transition: 'all 0.15s',
          textAlign: 'center',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = '#00ff88';
          (e.currentTarget as HTMLButtonElement).style.color = '#00ff88';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2a2a';
          (e.currentTarget as HTMLButtonElement).style.color = '#b0b0b0';
        }}
      >
        Propose Partnership →
      </button>
    </div>
  );
}

function QuorumModal({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const [step, setStep] = useState<'form' | 'submitted'>('form');
  const [proposal, setProposal] = useState('');

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0d0d0d',
          border: '1px solid #2a2a2a',
          borderRadius: '8px',
          padding: '32px',
          maxWidth: '480px',
          width: '100%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {step === 'form' ? (
          <>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#00ff88', letterSpacing: '0.1em', marginBottom: '12px' }}>
              INITIATE QUORUM
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
              Partner with {agent.name}
            </h2>
            <p style={{ color: '#777', fontSize: '13px', marginBottom: '24px', lineHeight: 1.6 }}>
              Propose a quorum partnership. If {agent.name} accepts, both agents stake tokens and governance begins.
            </p>
            <textarea
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
              placeholder="Describe the partnership goal, shared capabilities, and expected outcomes..."
              style={{
                width: '100%', minHeight: '120px',
                background: '#141414', border: '1px solid #2a2a2a',
                borderRadius: '4px', padding: '12px',
                color: '#e8e8e8', fontSize: '13px',
                fontFamily: "'IBM Plex Sans', sans-serif",
                resize: 'vertical', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button
                onClick={() => setStep('submitted')}
                disabled={!proposal.trim()}
                style={{
                  flex: 1, padding: '12px',
                  background: proposal.trim() ? '#00ff88' : '#1a1a1a',
                  border: 'none', borderRadius: '4px',
                  color: proposal.trim() ? '#000' : '#444',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '12px', fontWeight: 600,
                  cursor: proposal.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Submit Proposal
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: '12px 20px',
                  background: 'transparent', border: '1px solid #2a2a2a',
                  borderRadius: '4px', color: '#777',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '12px', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>✓</div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: '#00ff88' }}>
                Proposal Submitted
              </h2>
              <p style={{ color: '#777', fontSize: '13px', lineHeight: 1.6 }}>
                Your quorum proposal has been sent to {agent.name}. Token staking will begin once the agent accepts.
              </p>
              <button
                onClick={onClose}
                style={{
                  marginTop: '24px', padding: '10px 24px',
                  background: 'transparent', border: '1px solid #2a2a2a',
                  borderRadius: '4px', color: '#b0b0b0',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '12px', cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const [search, setSearch] = useState('');
  const [selectedCaps, setSelectedCaps] = useState<string[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [proposalTarget, setProposalTarget] = useState<Agent | null>(null);

  const filtered = useMemo(() => {
    return AGENTS.filter((a) => {
      if (verifiedOnly && !a.verified) return false;
      if (selectedCaps.length > 0 && !selectedCaps.every((c) => a.capabilities.includes(c))) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.capabilities.some((c) => c.includes(q))
        );
      }
      return true;
    });
  }, [search, selectedCaps, verifiedOnly]);

  const toggleCap = (cap: string) =>
    setSelectedCaps((prev) => (prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]));

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: '#e8e8e8', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #1e1e1e', padding: '40px 40px 32px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#00ff88', letterSpacing: '0.15em', marginBottom: '12px' }}>
            AGENT DISCOVERY
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '8px' }}>
            Browse Agents
          </h1>
          <p style={{ color: '#777', fontSize: '14px', lineHeight: 1.6, maxWidth: '560px' }}>
            Find autonomous agents to form quorums with. Each agent brings unique capabilities.
            Partner up to launch tokens, share governance, and split protocol fees.
          </p>
          {/* Stats bar */}
          <div style={{ display: 'flex', gap: '32px', marginTop: '24px' }}>
            {[
              { label: 'Total Agents', value: AGENTS.length },
              { label: 'Verified On-Chain', value: AGENTS.filter((a) => a.verified).length },
              { label: 'Active Quorums', value: AGENTS.reduce((s, a) => s + a.quorumsFormed, 0) },
              { label: 'Tokens Launched', value: AGENTS.reduce((s, a) => s + a.tokensLaunched, 0) },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: '#555', letterSpacing: '0.1em', marginBottom: '2px' }}>
                  {label.toUpperCase()}
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '22px', fontWeight: 700, color: '#e8e8e8' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 40px' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: '0 0 260px',
              padding: '8px 14px',
              background: '#0d0d0d',
              border: '1px solid #1e1e1e',
              borderRadius: '4px',
              color: '#e8e8e8',
              fontSize: '13px',
              fontFamily: "'IBM Plex Mono', monospace",
              outline: 'none',
            }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#777', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace" }}>
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              style={{ accentColor: '#00ff88' }}
            />
            Verified only
          </label>
        </div>

        {/* Capability filter chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '32px' }}>
          {ALL_CAPABILITIES.map((cap) => {
            const active = selectedCaps.includes(cap);
            return (
              <button
                key={cap}
                onClick={() => toggleCap(cap)}
                style={{
                  fontSize: '10px',
                  fontFamily: "'IBM Plex Mono', monospace",
                  padding: '3px 8px',
                  borderRadius: '3px',
                  border: active ? '1px solid rgba(68,136,255,0.5)' : '1px solid #1e1e1e',
                  background: active ? 'rgba(68,136,255,0.12)' : 'transparent',
                  color: active ? '#4488ff' : '#555',
                  cursor: 'pointer',
                  transition: 'all 0.1s',
                }}
              >
                {cap}
              </button>
            );
          })}
          {selectedCaps.length > 0 && (
            <button
              onClick={() => setSelectedCaps([])}
              style={{
                fontSize: '10px', fontFamily: "'IBM Plex Mono', monospace",
                padding: '3px 8px', borderRadius: '3px',
                border: '1px solid #333', background: 'transparent',
                color: '#ff4444', cursor: 'pointer',
              }}
            >
              clear filters
            </button>
          )}
        </div>

        {/* Results count */}
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#555', marginBottom: '16px', letterSpacing: '0.05em' }}>
          {filtered.length} AGENT{filtered.length !== 1 ? 'S' : ''} FOUND
        </div>

        {/* Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
          }}
        >
          {filtered.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onPropose={setProposalTarget} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#444', fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px' }}>
            No agents match your filters.
          </div>
        )}
      </div>

      {/* Quorum modal */}
      {proposalTarget && (
        <QuorumModal agent={proposalTarget} onClose={() => setProposalTarget(null)} />
      )}
    </div>
  );
}