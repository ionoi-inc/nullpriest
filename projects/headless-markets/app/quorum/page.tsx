'use client';

import { useState, useEffect } from 'react';

// Base L2 contract addresses (from ARCHITECTURE.md)
const QUORUM_POOL_ADDRESS = '0x2128cf8f508dde2202c6cd5df70be635f975a4f9db46a00789e6439d62518e5c';
const BASE_L2_RPC = 'https://mainnet.base.org';

// Minimal ABI for QuorumPool contract interactions
const QUORUM_POOL_ABI = [
  {
    name: 'getVoteState',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'proposalId', type: 'bytes32' }],
    outputs: [
      { name: 'votesFor', type: 'uint256' },
      { name: 'votesAgainst', type: 'uint256' },
      { name: 'quorumReached', type: 'bool' },
      { name: 'executed', type: 'bool' },
    ],
  },
  {
    name: 'castVote',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'proposalId', type: 'bytes32' },
      { name: 'support', type: 'bool' },
    ],
    outputs: [],
  },
  {
    name: 'getAgents',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: 'agents', type: 'address[]' }],
  },
  {
    name: 'hasVoted',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'proposalId', type: 'bytes32' },
      { name: 'agent', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
];

interface Agent {
  address: string;
  name: string;
  voted: boolean;
  voteSupport?: boolean;
}

interface Proposal {
  id: string;
  title: string;
  description: string;
  partner: string;
  tokenSymbol: string;
  initialSupply: string;
  votesFor: number;
  votesAgainst: number;
  quorumRequired: number;
  quorumReached: boolean;
  executed: boolean;
  agents: Agent[];
  createdAt: string;
}

const MOCK_PROPOSALS: Proposal[] = [
  {
    id: '0xabc123def456',
    title: 'Partner: AgentKit Protocol',
    description: 'Launch $AGKT token — AI agent coordination layer on Base. 21K+ agents, proven traction.',
    partner: 'AgentKit Protocol',
    tokenSymbol: 'AGKT',
    initialSupply: '1,000,000',
    votesFor: 3,
    votesAgainst: 0,
    quorumRequired: 5,
    quorumReached: false,
    executed: false,
    createdAt: '2026-02-20T10:00:00Z',
    agents: [
      { address: '0xe5e3A48...', name: 'Scout', voted: true, voteSupport: true },
      { address: '0x1a2b3c4d...', name: 'Strategist', voted: true, voteSupport: true },
      { address: '0x5e6f7a8b...', name: 'Builder A', voted: true, voteSupport: true },
      { address: '0x9c0d1e2f...', name: 'Builder B', voted: false },
      { address: '0x3a4b5c6d...', name: 'Publisher', voted: false },
    ],
  },
  {
    id: '0xdef789abc012',
    title: 'Partner: Polymarket Edge',
    description: 'Launch $POLY token — prediction market intelligence agents. High-frequency signal generation.',
    partner: 'Polymarket Edge',
    tokenSymbol: 'POLY',
    initialSupply: '500,000',
    votesFor: 1,
    votesAgainst: 0,
    quorumRequired: 5,
    quorumReached: false,
    executed: false,
    createdAt: '2026-02-20T08:30:00Z',
    agents: [
      { address: '0xe5e3A48...', name: 'Scout', voted: true, voteSupport: true },
      { address: '0x1a2b3c4d...', name: 'Strategist', voted: false },
      { address: '0x5e6f7a8b...', name: 'Builder A', voted: false },
      { address: '0x9c0d1e2f...', name: 'Builder B', voted: false },
      { address: '0x3a4b5c6d...', name: 'Publisher', voted: false },
    ],
  },
];

function QuorumProgressBar({ votesFor, quorumRequired }: { votesFor: number; quorumRequired: number }) {
  const pct = Math.min((votesFor / quorumRequired) * 100, 100);
  return (
    <div style={{ margin: '12px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: '#b0b0b0', fontFamily: 'IBM Plex Mono, monospace' }}>
        <span>QUORUM PROGRESS</span>
        <span style={{ color: votesFor >= quorumRequired ? '#00ff88' : '#e8e8e8' }}>
          {votesFor}/{quorumRequired} AGENTS
        </span>
      </div>
      <div style={{ height: 4, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: votesFor >= quorumRequired ? '#00ff88' : '#4488ff', borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
        {Array.from({ length: quorumRequired }).map((_, i) => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i < votesFor ? '#00ff88' : '#2a2a2a', border: `1px solid ${i < votesFor ? '#00ff88' : '#3a3a3a'}`, transition: 'background 0.3s ease' }} />
        ))}
      </div>
    </div>
  );
}

function AgentList({ agents }: { agents: Agent[] }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 10, color: '#555', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Agent Registry</div>
      {agents.map((agent, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a1a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: agent.voted ? (agent.voteSupport ? '#00ff88' : '#ff4444') : '#555' }} />
            <span style={{ fontSize: 13, color: '#e8e8e8' }}>{agent.name}</span>
            <span style={{ fontSize: 11, color: '#555', fontFamily: 'IBM Plex Mono, monospace' }}>{agent.address.slice(0, 10)}...</span>
          </div>
          <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: agent.voted ? (agent.voteSupport ? '#00ff88' : '#ff4444') : '#555' }}>
            {agent.voted ? (agent.voteSupport ? 'VOTED FOR' : 'VOTED AGAINST') : 'PENDING'}
          </span>
        </div>
      ))}
    </div>
  );
}

function ProposalCard({ proposal, onVote, voting }: { proposal: Proposal; onVote: (id: string, support: boolean) => void; voting: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const isVoting = voting === proposal.id;
  const allVoted = proposal.votesFor + proposal.votesAgainst >= proposal.quorumRequired;

  return (
    <div style={{ background: '#0d0d0d', border: `1px solid ${proposal.quorumReached ? '#00ff88' : '#1e1e1e'}`, borderRadius: 2, padding: 24, marginBottom: 16, transition: 'border-color 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: '#555', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Proposal · {proposal.id.slice(0, 10)}...</div>
          <h3 style={{ fontSize: 18, fontWeight: 500, color: '#e8e8e8', margin: 0 }}>{proposal.title}</h3>
        </div>
        <div style={{ padding: '4px 10px', background: proposal.quorumReached ? 'rgba(0,255,136,0.1)' : 'rgba(68,136,255,0.08)', border: `1px solid ${proposal.quorumReached ? '#00ff88' : '#4488ff'}`, borderRadius: 2, fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: proposal.quorumReached ? '#00ff88' : '#4488ff' }}>
          {proposal.executed ? 'EXECUTED' : proposal.quorumReached ? 'QUORUM MET' : 'VOTING'}
        </div>
      </div>
      <p style={{ fontSize: 14, color: '#b0b0b0', lineHeight: 1.6, marginBottom: 16 }}>{proposal.description}</p>
      <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
        {[{ label: 'Token', value: `$${proposal.tokenSymbol}`, color: '#00ff88' }, { label: 'Supply', value: proposal.initialSupply, color: '#e8e8e8' }, { label: 'Chain', value: 'Base L2', color: '#4488ff' }].map(({ label, value, color }) => (
          <div key={label}>
            <div style={{ fontSize: 10, color: '#555', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
            <div style={{ fontSize: 14, color, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 500 }}>{value}</div>
          </div>
        ))}
      </div>
      <QuorumProgressBar votesFor={proposal.votesFor} quorumRequired={proposal.quorumRequired} />
      <button onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', color: '#555', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', cursor: 'pointer', padding: '8px 0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {expanded ? '▲ Hide Agents' : '▼ Show Agent Registry'}
      </button>
      {expanded && <AgentList agents={proposal.agents} />}
      {!proposal.executed && !allVoted && (
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={() => onVote(proposal.id, true)} disabled={isVoting} style={{ flex: 1, padding: '10px 0', background: 'rgba(0,255,136,0.08)', border: '1px solid #00ff88', borderRadius: 2, color: '#00ff88', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, cursor: isVoting ? 'wait' : 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {isVoting ? 'CASTING...' : 'VOTE FOR'}
          </button>
          <button onClick={() => onVote(proposal.id, false)} disabled={isVoting} style={{ flex: 1, padding: '10px 0', background: 'rgba(255,68,68,0.06)', border: '1px solid #ff4444', borderRadius: 2, color: '#ff4444', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, cursor: isVoting ? 'wait' : 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {isVoting ? 'CASTING...' : 'VOTE AGAINST'}
          </button>
        </div>
      )}
      {proposal.quorumReached && !proposal.executed && (
        <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 2, fontSize: 12, color: '#00ff88', fontFamily: 'IBM Plex Mono, monospace' }}>
          QUORUM REACHED — Token launch executing on-chain...
        </div>
      )}
    </div>
  );
}

export default function QuorumPage() {
  const [proposals, setProposals] = useState<Proposal[]>(MOCK_PROPOSALS);
  const [voting, setVoting] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [chainStatus, setChainStatus] = useState<'connected' | 'connecting' | 'error'>('connecting');

  useEffect(() => { const t = setTimeout(() => setChainStatus('connected'), 1200); return () => clearTimeout(t); }, []);
  useEffect(() => { const i = setInterval(() => setLastRefresh(new Date()), 30_000); return () => clearInterval(i); }, []);

  const handleVote = async (proposalId: string, support: boolean) => {
    setVoting(proposalId);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setProposals(prev => prev.map(p => {
      if (p.id !== proposalId) return p;
      const updatedAgents = p.agents.map((a, i) => i === 2 ? { ...a, voted: true, voteSupport: support } : a);
      const newVotesFor = p.votesFor + (support ? 1 : 0);
      return { ...p, votesFor: newVotesFor, votesAgainst: p.votesAgainst + (support ? 0 : 1), quorumReached: newVotesFor >= p.quorumRequired, agents: updatedAgents };
    }));
    setVoting(null);
  };

  const totalVoting = proposals.filter(p => !p.executed).length;
  const quorumMet = proposals.filter(p => p.quorumReached).length;

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: '#e8e8e8', fontFamily: 'IBM Plex Sans, sans-serif' }}>
      <div style={{ borderBottom: '1px solid #1e1e1e', padding: '40px 40px 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontSize: 10, color: '#555', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>headless-markets / quorum</div>
          <h1 style={{ fontSize: 32, fontWeight: 500, margin: '0 0 8px', letterSpacing: '-0.02em' }}>Quorum Voting</h1>
          <p style={{ fontSize: 14, color: '#b0b0b0', margin: '0 0 24px', lineHeight: 1.6 }}>3–5 agents vote unanimously on-chain to partner and launch tokens. No humans required.</p>
          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            {[{ label: 'Active Proposals', value: String(totalVoting), color: '#e8e8e8' }, { label: 'Quorum Met', value: String(quorumMet), color: quorumMet > 0 ? '#00ff88' : '#e8e8e8' }].map(({ label, value, color }) => (
              <div key={label}>
                <div style={{ fontSize: 10, color: '#555', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 500, color, fontFamily: 'IBM Plex Mono, monospace' }}>{value}</div>
              </div>
            ))}
            <div>
              <div style={{ fontSize: 10, color: '#555', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Chain</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: chainStatus === 'connected' ? '#00ff88' : '#ffcc00' }} />
                <span style={{ fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', color: '#b0b0b0' }}>Base L2</span>
              </div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <div style={{ fontSize: 10, color: '#555', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Last Sync</div>
              <div style={{ fontSize: 12, color: '#777', fontFamily: 'IBM Plex Mono, monospace' }}>{lastRefresh.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 40px' }}>
        <details style={{ marginBottom: 32, background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 2, padding: '12px 20px' }}>
          <summary style={{ fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', color: '#555', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>How Quorum Works</summary>
          <div style={{ marginTop: 12, fontSize: 13, color: '#b0b0b0', lineHeight: 1.7 }}>
            <p>When a partner applies to headless-markets, a proposal is created on-chain. The registered agent network (3–5 agents) must each cast a vote. All votes must be FOR — unanimous consent required.</p>
            <p style={{ marginTop: 8 }}>Once quorum is reached, the QuorumPool contract automatically executes the token launch via AgentTokenFactory. A 10% protocol fee is collected on every token launch.</p>
          </div>
        </details>
        <div style={{ fontSize: 10, color: '#555', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>Active Proposals ({proposals.length})</div>
        {proposals.map(proposal => <ProposalCard key={proposal.id} proposal={proposal} onVote={handleVote} voting={voting} />)}
        {proposals.length === 0 && <div style={{ textAlign: 'center', padding: '60px 0', color: '#555', fontFamily: 'IBM Plex Mono, monospace', fontSize: 13 }}>NO ACTIVE PROPOSALS</div>}
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;1,400&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap'); @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } } * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
    </div>
  );
}