'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPublicClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Agent {
  id: string;
  name: string;
  address: `0x${string}`;
  role: string;
  voted: boolean;
  voteTimestamp?: number;
}

interface QuorumState {
  proposalId: string;
  proposalTitle: string;
  proposalDescription: string;
  targetPartner: string;
  requiredVotes: number;
  currentVotes: number;
  agents: Agent[];
  deadline: number;
  executed: boolean;
  status: 'pending' | 'active' | 'passed' | 'failed' | 'executed';
}

interface VoteSubmission {
  agentId: string;
  vote: 'yes' | 'no' | 'abstain';
  signature?: string;
}

// ─── Contract Config ───────────────────────────────────────────────────────────

const HEADLESS_MARKETS_CONTRACT = '0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F' as const;
const NULP_TOKEN = '0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F' as const;

const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org'),
});

// ─── Mock on-chain state (replace with real contract reads) ────────────────────

const MOCK_AGENTS: Agent[] = [
  { id: 'scout',      name: 'Scout',      address: '0xe5e3A482862E241A4b5Fb526cC050b830FBA29', role: 'Intelligence',  voted: true,  voteTimestamp: Date.now() - 3600000 },
  { id: 'strategist', name: 'Strategist', address: '0x1A2b3C4d5E6f7A8B9C0d1E2F3A4B5C6D7E8F9A0B', role: 'Strategy',      voted: true,  voteTimestamp: Date.now() - 2400000 },
  { id: 'builderA',   name: 'Builder A',  address: '0x2B3c4D5e6F7a8B9C0D1e2F3A4b5C6d7E8f9A0b1', role: 'Build',         voted: true,  voteTimestamp: Date.now() - 1200000 },
  { id: 'builderB',   name: 'Builder B',  address: '0x3C4d5E6f7A8b9C0d1E2f3A4B5c6D7e8F9A0B1C2', role: 'Build',         voted: false },
  { id: 'publisher',  name: 'Publisher',  address: '0x4D5e6F7a8B9c0D1e2F3a4B5C6d7E8f9A0b1C2D3', role: 'Distribution',  voted: false },
];

// ─── Utility ──────────────────────────────────────────────────────────────────

function timeUntil(ts: number): string {
  const diff = ts - Date.now();
  if (diff <= 0) return 'expired';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function statusColor(status: QuorumState['status']): string {
  switch (status) {
    case 'passed':   return '#00ff88';
    case 'failed':   return '#ff4444';
    case 'executed': return '#4488ff';
    case 'active':   return '#ffcc00';
    default:         return '#777';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuorumPage() {
  const [quorum, setQuorum] = useState<QuorumState>({
    proposalId: 'prop-001',
    proposalTitle: 'Partner: AgentKit Integration',
    proposalDescription: 'Integrate Coinbase AgentKit to enable nullpriest agents to transact autonomously on Base. Exposes wallet primitives to all 6 agents. Required for headless-markets launch.',
    targetPartner: 'Coinbase AgentKit',
    requiredVotes: 5,
    currentVotes: 3,
    agents: MOCK_AGENTS,
    deadline: Date.now() + 7200000, // 2h from now
    executed: false,
    status: 'active',
  });

  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chainBlock, setChainBlock] = useState<bigint | null>(null);
  const [activeTab, setActiveTab] = useState<'vote' | 'history'>('vote');

  // Fetch latest Base L2 block to confirm chain connectivity
  useEffect(() => {
    publicClient.getBlockNumber()
      .then(setChainBlock)
      .catch(() => setChainBlock(null));
  }, []);

  // Recompute status based on votes
  useEffect(() => {
    setQuorum(prev => {
      const passed = prev.currentVotes >= prev.requiredVotes;
      const expired = Date.now() > prev.deadline;
      let status: QuorumState['status'] = prev.status;
      if (prev.executed) status = 'executed';
      else if (passed) status = 'passed';
      else if (expired) status = 'failed';
      else status = 'active';
      return { ...prev, status };
    });
  }, [quorum.currentVotes, quorum.deadline]);

  const castVote = useCallback(async (submission: VoteSubmission) => {
    setSubmitting(submission.agentId);
    setError(null);
    try {
      // Simulate on-chain vote tx (replace with actual contract write)
      await new Promise(resolve => setTimeout(resolve, 1200));
      setQuorum(prev => {
        const agents = prev.agents.map(a =>
          a.id === submission.agentId
            ? { ...a, voted: true, voteTimestamp: Date.now() }
            : a
        );
        const currentVotes = agents.filter(a => a.voted).length;
        return { ...prev, agents, currentVotes };
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Vote failed');
    } finally {
      setSubmitting(null);
    }
  }, []);

  const executeProposal = useCallback(async () => {
    if (quorum.status !== 'passed') return;
    setSubmitting('execute');
    await new Promise(resolve => setTimeout(resolve, 1500));
    setQuorum(prev => ({ ...prev, executed: true, status: 'executed' }));
    setSubmitting(null);
  }, [quorum.status]);

  const progress = (quorum.currentVotes / quorum.requiredVotes) * 100;

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.label}>QUORUM VOTING</span>
          <h1 style={styles.title}>{quorum.proposalTitle}</h1>
          <p style={styles.description}>{quorum.proposalDescription}</p>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.statusBadge}>
            <span style={{ ...styles.statusDot, background: statusColor(quorum.status) }} />
            <span style={{ color: statusColor(quorum.status), fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 }}>
              {quorum.status.toUpperCase()}
            </span>
          </div>
          <div style={styles.chainStatus}>
            <span style={styles.label}>BASE L2</span>
            <span style={styles.chainBlock}>
              {chainBlock ? `#${chainBlock.toString()}` : 'connecting...'}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={styles.progressSection}>
        <div style={styles.progressHeader}>
          <span style={styles.progressLabel}>QUORUM PROGRESS</span>
          <span style={styles.progressCount}>
            {quorum.currentVotes}/{quorum.requiredVotes} agents voted
          </span>
        </div>
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${Math.min(progress, 100)}%` }} />
          {[1, 2, 3, 4, 5].map(n => (
            <div
              key={n}
              style={{
                ...styles.progressTick,
                left: `${(n / quorum.requiredVotes) * 100}%`,
                background: n <= quorum.currentVotes ? '#00ff88' : '#2a2a2a',
              }}
            />
          ))}
        </div>
        <div style={styles.progressMeta}>
          <span style={styles.mutedText}>Deadline: {timeUntil(quorum.deadline)}</span>
          <span style={styles.mutedText}>Target: {quorum.targetPartner}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {(['vote', 'history'] as const).map(tab => (
          <button
            key={tab}
            style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(tab)}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Agent List */}
      {activeTab === 'vote' && (
        <div style={styles.agentList}>
          {quorum.agents.map(agent => (
            <div key={agent.id} style={styles.agentCard}>
              <div style={styles.agentInfo}>
                <div style={styles.agentHeader}>
                  <span style={styles.agentName}>{agent.name}</span>
                  <span style={styles.agentRole}>{agent.role}</span>
                </div>
                <span style={styles.agentAddress}>{agent.address.slice(0, 10)}...{agent.address.slice(-6)}</span>
                {agent.voteTimestamp && (
                  <span style={styles.voteTime}>
                    Voted {Math.round((Date.now() - agent.voteTimestamp) / 60000)}m ago
                  </span>
                )}
              </div>
              <div style={styles.agentAction}>
                {agent.voted ? (
                  <div style={styles.votedBadge}>
                    <span style={styles.checkmark}>✓</span>
                    <span style={styles.votedText}>VOTED</span>
                  </div>
                ) : (
                  <button
                    style={{
                      ...styles.voteBtn,
                      opacity: submitting === agent.id ? 0.6 : 1,
                    }}
                    disabled={!!submitting}
                    onClick={() => castVote({ agentId: agent.id, vote: 'yes' })}
                  >
                    {submitting === agent.id ? 'SIGNING...' : 'CAST VOTE'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'history' && (
        <div style={styles.historyPane}>
          {quorum.agents.filter(a => a.voted).map(agent => (
            <div key={agent.id} style={styles.historyRow}>
              <span style={styles.agentName}>{agent.name}</span>
              <span style={styles.historyVote}>YES</span>
              <span style={styles.mutedText}>
                {agent.voteTimestamp
                  ? new Date(agent.voteTimestamp).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
                  : '—'}
              </span>
            </div>
          ))}
          {quorum.agents.filter(a => !a.voted).length > 0 && (
            <div style={styles.pendingSection}>
              <span style={styles.label}>AWAITING</span>
              {quorum.agents.filter(a => !a.voted).map(agent => (
                <div key={agent.id} style={{ ...styles.historyRow, opacity: 0.4 }}>
                  <span style={styles.agentName}>{agent.name}</span>
                  <span style={styles.mutedText}>pending</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Execute Button */}
      {quorum.status === 'passed' && !quorum.executed && (
        <div style={styles.executeSection}>
          <p style={styles.executeNote}>
            Quorum reached. On-chain execution will record the partnership vote to Base L2.
          </p>
          <button
            style={{ ...styles.executeBtn, opacity: submitting === 'execute' ? 0.6 : 1 }}
            disabled={submitting === 'execute'}
            onClick={executeProposal}
          >
            {submitting === 'execute' ? 'EXECUTING ON-CHAIN...' : 'EXECUTE ON-CHAIN'}
          </button>
        </div>
      )}

      {quorum.status === 'executed' && (
        <div style={styles.executedBanner}>
          ✓ EXECUTED ON BASE L2 — partnership vote permanently recorded
        </div>
      )}

      {error && <div style={styles.errorBanner}>{error}</div>}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    background: '#080808',
    minHeight: '100vh',
    color: '#e8e8e8',
    fontFamily: "'IBM Plex Sans', sans-serif",
    padding: '40px',
    maxWidth: 900,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 40,
    gap: 24,
  },
  headerLeft: { flex: 1 },
  headerRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 },
  label: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    display: 'block',
    marginBottom: 8,
  },
  title: { fontSize: 26, fontWeight: 600, marginBottom: 12, lineHeight: 1.2 },
  description: { color: '#b0b0b0', fontSize: 14, lineHeight: 1.7, maxWidth: 580 },
  statusBadge: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#0d0d0d', border: '1px solid #1e1e1e',
    padding: '8px 14px',
  },
  statusDot: { width: 6, height: 6, borderRadius: '50%' },
  chainStatus: { textAlign: 'right' },
  chainBlock: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    color: '#4488ff',
  },
  progressSection: {
    background: '#0d0d0d',
    border: '1px solid #1e1e1e',
    padding: 24,
    marginBottom: 32,
  },
  progressHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 12 },
  progressLabel: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  },
  progressCount: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    color: '#00ff88',
  },
  progressTrack: {
    height: 6,
    background: '#1a1a1a',
    position: 'relative',
    marginBottom: 12,
  },
  progressFill: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    background: '#00ff88',
    transition: 'width 0.6s ease',
  },
  progressTick: {
    position: 'absolute',
    top: -3, width: 2, height: 12,
    transform: 'translateX(-50%)',
    transition: 'background 0.3s',
  },
  progressMeta: { display: 'flex', justifyContent: 'space-between' },
  mutedText: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#555' },
  tabs: { display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid #1e1e1e' },
  tab: {
    background: 'none', border: 'none',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11, color: '#555',
    padding: '10px 20px',
    cursor: 'pointer',
    letterSpacing: '0.08em',
    borderBottom: '2px solid transparent',
    transition: 'color 0.15s',
  },
  tabActive: { color: '#00ff88', borderBottom: '2px solid #00ff88' },
  agentList: { display: 'flex', flexDirection: 'column', gap: 12 },
  agentCard: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: '#0d0d0d', border: '1px solid #1e1e1e',
    padding: '16px 20px',
    transition: 'border-color 0.15s',
  },
  agentInfo: { display: 'flex', flexDirection: 'column', gap: 4 },
  agentHeader: { display: 'flex', alignItems: 'center', gap: 12 },
  agentName: { fontSize: 14, fontWeight: 500 },
  agentRole: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10, color: '#555',
    background: '#141414',
    padding: '2px 8px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  agentAddress: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11, color: '#555',
  },
  voteTime: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10, color: '#00ff88',
  },
  agentAction: {},
  votedBadge: { display: 'flex', alignItems: 'center', gap: 6 },
  checkmark: { color: '#00ff88', fontSize: 14 },
  votedText: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10, color: '#00ff88',
    letterSpacing: '0.08em',
  },
  voteBtn: {
    background: '#00ff88', color: '#000',
    border: 'none', padding: '8px 20px',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11, fontWeight: 600,
    letterSpacing: '0.06em',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  historyPane: { display: 'flex', flexDirection: 'column', gap: 8 },
  historyRow: {
    display: 'flex', gap: 20, alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #141414',
  },
  historyVote: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11, color: '#00ff88',
  },
  pendingSection: { marginTop: 16 },
  executeSection: {
    marginTop: 32, padding: 24,
    background: 'rgba(0,255,136,0.05)',
    border: '1px solid rgba(0,255,136,0.2)',
    textAlign: 'center',
  },
  executeNote: { fontSize: 13, color: '#b0b0b0', marginBottom: 16 },
  executeBtn: {
    background: '#00ff88', color: '#000',
    border: 'none', padding: '12px 32px',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12, fontWeight: 700,
    letterSpacing: '0.08em',
    cursor: 'pointer',
  },
  executedBanner: {
    marginTop: 24, padding: 16,
    background: 'rgba(68,136,255,0.08)',
    border: '1px solid rgba(68,136,255,0.3)',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12, color: '#4488ff',
    textAlign: 'center',
    letterSpacing: '0.06em',
  },
  errorBanner: {
    marginTop: 16, padding: 12,
    background: 'rgba(255,68,68,0.08)',
    border: '1px solid rgba(255,68,68,0.3)',
    color: '#ff4444', fontSize: 12,
    fontFamily: "'IBM Plex Mono', monospace",
  },
};
