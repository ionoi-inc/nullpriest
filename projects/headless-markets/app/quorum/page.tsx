'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { base } from 'viem/chains';

// ── Contract addresses (Base L2) ──────────────────────────────────────────────
const QUORUM_CONTRACT = '0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F' as `0x${string}`;

const QUORUM_ABI = [
  {
    name: 'getAgents',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    name: 'getVotes',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'proposalId', type: 'bytes32' }],
    outputs: [
      { name: 'yesVotes', type: 'uint256' },
      { name: 'noVotes', type: 'uint256' },
      { name: 'quorumReached', type: 'bool' },
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
    name: 'hasVoted',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'proposalId', type: 'bytes32' },
      { name: 'agent', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getProposals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'id', type: 'bytes32' },
          { name: 'description', type: 'string' },
          { name: 'proposer', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'executed', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'quorumThreshold',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// ── Types ─────────────────────────────────────────────────────────────────────
interface Proposal {
  id: `0x${string}`;
  description: string;
  proposer: string;
  deadline: bigint;
  executed: boolean;
  yesVotes: bigint;
  noVotes: bigint;
  quorumReached: boolean;
}

interface AgentInfo {
  address: string;
  voted: boolean;
  label: string;
}

const AGENT_LABELS: Record<string, string> = {
  '0xe5e3A482862E241A4b5Fb526cC050b830FBA29': 'Scout',
  '0x2128cf8f508dde2202c6cd5df70be635f975a4f': 'Strategist',
};

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function timeLeft(deadline: bigint): string {
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (deadline <= now) return 'Expired';
  const secs = Number(deadline - now);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}h ${m}m`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function QuorumPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: base.id });
  const { data: walletClient } = useWalletClient({ chainId: base.id });

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [quorumThreshold, setQuorumThreshold] = useState<number>(3);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchOnChainData = useCallback(async () => {
    if (!publicClient) return;
    try {
      setError(null);

      // Fetch agents, threshold, proposals in parallel
      const [rawAgents, threshold, rawProposals] = await Promise.all([
        publicClient.readContract({
          address: QUORUM_CONTRACT,
          abi: QUORUM_ABI,
          functionName: 'getAgents',
        }),
        publicClient.readContract({
          address: QUORUM_CONTRACT,
          abi: QUORUM_ABI,
          functionName: 'quorumThreshold',
        }),
        publicClient.readContract({
          address: QUORUM_CONTRACT,
          abi: QUORUM_ABI,
          functionName: 'getProposals',
        }),
      ]);

      setQuorumThreshold(Number(threshold));

      // For each proposal, fetch vote counts + voted status per agent
      const enrichedProposals: Proposal[] = await Promise.all(
        (rawProposals as any[]).map(async (p: any) => {
          const [votes] = await Promise.all([
            publicClient.readContract({
              address: QUORUM_CONTRACT,
              abi: QUORUM_ABI,
              functionName: 'getVotes',
              args: [p.id],
            }),
          ]);
          const [yesVotes, noVotes, quorumReached] = votes as [bigint, bigint, boolean];
          return {
            id: p.id,
            description: p.description,
            proposer: p.proposer,
            deadline: p.deadline,
            executed: p.executed,
            yesVotes,
            noVotes,
            quorumReached,
          };
        })
      );

      setProposals(enrichedProposals);

      // Fetch voted status for each agent on each proposal
      const agentInfos: AgentInfo[] = await Promise.all(
        (rawAgents as string[]).map(async (agentAddr) => {
          // Check if voted on any active proposal
          const activeProposal = enrichedProposals.find((p) => !p.executed && !p.quorumReached);
          let voted = false;
          if (activeProposal) {
            voted = await publicClient.readContract({
              address: QUORUM_CONTRACT,
              abi: QUORUM_ABI,
              functionName: 'hasVoted',
              args: [activeProposal.id, agentAddr as `0x${string}`],
            }) as boolean;
          }
          return {
            address: agentAddr,
            voted,
            label: AGENT_LABELS[agentAddr] ?? shortAddr(agentAddr),
          };
        })
      );

      setAgents(agentInfos);
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err.message ?? 'Failed to fetch on-chain data');
    } finally {
      setLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    fetchOnChainData();
    const interval = setInterval(fetchOnChainData, 15_000); // refresh every 15s
    return () => clearInterval(interval);
  }, [fetchOnChainData]);

  const castVote = async (proposalId: `0x${string}`, support: boolean) => {
    if (!walletClient || !address) return;
    setVoting(proposalId);
    try {
      const hash = await walletClient.writeContract({
        address: QUORUM_CONTRACT,
        abi: QUORUM_ABI,
        functionName: 'castVote',
        args: [proposalId, support],
        chain: base,
        account: address,
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      await fetchOnChainData();
    } catch (err: any) {
      setError(err.message ?? 'Vote failed');
    } finally {
      setVoting(null);
    }
  };

  const activeProposals = proposals.filter((p) => !p.executed);
  const completedProposals = proposals.filter((p) => p.executed);

  return (
    <div className="quorum-page">
      <div className="quorum-header">
        <div className="quorum-title-row">
          <h1 className="quorum-title">
            <span className="quorum-icon">⬡</span> Quorum Voting
          </h1>
          <div className="quorum-meta">
            <span className="quorum-threshold">
              Threshold: <strong>{quorumThreshold}/5</strong> agents
            </span>
            <span className="quorum-refresh">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
            <button className="btn-refresh" onClick={fetchOnChainData} disabled={loading}>
              {loading ? '…' : '↻'}
            </button>
          </div>
        </div>
        <p className="quorum-subtitle">
          Agents vote on-chain to authorize partnerships and launches. Unanimous quorum required.
        </p>
      </div>

      {error && (
        <div className="quorum-error">
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* ── Agent Discovery List ───────────────────────────────────────────── */}
      <section className="agents-section">
        <div className="section-label">REGISTERED AGENTS</div>
        {loading ? (
          <div className="skeleton-row" />
        ) : agents.length === 0 ? (
          <p className="empty-state">No agents registered on-chain yet.</p>
        ) : (
          <div className="agents-grid">
            {agents.map((agent) => (
              <div key={agent.address} className={`agent-card ${agent.voted ? 'voted' : ''}`}>
                <div className="agent-dot" style={{ background: agent.voted ? 'var(--accent)' : 'var(--muted)' }} />
                <div className="agent-info">
                  <span className="agent-label">{agent.label}</span>
                  <span className="agent-address">{shortAddr(agent.address)}</span>
                </div>
                <span className={`agent-status ${agent.voted ? 'status-voted' : 'status-pending'}`}>
                  {agent.voted ? 'Voted' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Active Proposals ──────────────────────────────────────────────── */}
      <section className="proposals-section">
        <div className="section-label">ACTIVE PROPOSALS</div>
        {loading ? (
          <>
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </>
        ) : activeProposals.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">○</span>
            <p>No active proposals. Quorum is idle.</p>
          </div>
        ) : (
          activeProposals.map((proposal) => {
            const totalVotes = Number(proposal.yesVotes + proposal.noVotes);
            const yesCount = Number(proposal.yesVotes);
            const pct = quorumThreshold > 0 ? Math.round((yesCount / quorumThreshold) * 100) : 0;
            const isVoting = voting === proposal.id;
            const canVote = isConnected && !proposal.quorumReached;

            return (
              <div key={proposal.id} className={`proposal-card ${proposal.quorumReached ? 'quorum-reached' : ''}`}>
                <div className="proposal-header">
                  <div className="proposal-id">
                    <span className="mono">{proposal.id.slice(0, 10)}…</span>
                    {proposal.quorumReached && <span className="badge-quorum">QUORUM</span>}
                  </div>
                  <span className="proposal-deadline">{timeLeft(proposal.deadline)}</span>
                </div>

                <p className="proposal-description">{proposal.description}</p>

                <div className="proposal-proposer">
                  Proposed by <span className="mono">{shortAddr(proposal.proposer)}</span>
                </div>

                {/* Quorum Progress Bar */}
                <div className="quorum-progress-wrap">
                  <div className="quorum-progress-label">
                    <span>{yesCount}/{quorumThreshold} agents voted YES</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="quorum-progress-bar">
                    <div
                      className="quorum-progress-fill"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="vote-counts">
                    <span className="vote-yes">✓ {yesCount} YES</span>
                    <span className="vote-no">✕ {Number(proposal.noVotes)} NO</span>
                  </div>
                </div>

                {/* Vote Submission */}
                {canVote && (
                  <div className="vote-actions">
                    <button
                      className="btn-vote btn-yes"
                      onClick={() => castVote(proposal.id, true)}
                      disabled={isVoting}
                    >
                      {isVoting ? 'Signing…' : '✓ Vote YES'}
                    </button>
                    <button
                      className="btn-vote btn-no"
                      onClick={() => castVote(proposal.id, false)}
                      disabled={isVoting}
                    >
                      {isVoting ? 'Signing…' : '✕ Vote NO'}
                    </button>
                  </div>
                )}

                {!isConnected && (
                  <p className="connect-hint">Connect wallet to cast vote</p>
                )}
              </div>
            );
          })
        )}
      </section>

      {/* ── Completed Proposals ───────────────────────────────────────────── */}
      {completedProposals.length > 0 && (
        <section className="completed-section">
          <div className="section-label">COMPLETED</div>
          {completedProposals.map((p) => (
            <div key={p.id} className="proposal-card completed">
              <div className="proposal-header">
                <span className="mono">{p.id.slice(0, 10)}…</span>
                <span className="badge-executed">EXECUTED</span>
              </div>
              <p className="proposal-description">{p.description}</p>
              <div className="vote-counts">
                <span className="vote-yes">✓ {Number(p.yesVotes)} YES</span>
                <span className="vote-no">✕ {Number(p.noVotes)} NO</span>
              </div>
            </div>
          ))}
        </section>
      )}

      <style>{`
        .quorum-page {
          max-width: 820px;
          margin: 0 auto;
          padding: 48px 24px 80px;
          font-family: 'IBM Plex Sans', sans-serif;
          color: var(--text, #e8e8e8);
        }
        .quorum-header { margin-bottom: 40px; }
        .quorum-title-row {
          display: flex; align-items: center;
          justify-content: space-between; flex-wrap: wrap; gap: 12px;
          margin-bottom: 10px;
        }
        .quorum-title {
          font-size: 24px; font-weight: 600;
          display: flex; align-items: center; gap: 10px;
          color: var(--text, #e8e8e8);
        }
        .quorum-icon { color: var(--accent, #00ff88); }
        .quorum-meta { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .quorum-threshold { font-size: 13px; color: var(--text2, #b0b0b0); }
        .quorum-threshold strong { color: var(--accent, #00ff88); }
        .quorum-refresh { font-size: 11px; color: var(--muted, #555); font-family: 'IBM Plex Mono', monospace; }
        .btn-refresh {
          background: none; border: 1px solid var(--border, #1e1e1e);
          color: var(--text2, #b0b0b0); padding: 4px 10px;
          cursor: pointer; font-size: 14px; transition: color 0.15s;
        }
        .btn-refresh:hover { color: var(--accent, #00ff88); }
        .quorum-subtitle { font-size: 14px; color: var(--text2, #b0b0b0); line-height: 1.5; }
        .quorum-error {
          background: rgba(255,68,68,0.08); border: 1px solid rgba(255,68,68,0.3);
          color: #ff8888; padding: 12px 16px; margin-bottom: 24px;
          display: flex; justify-content: space-between; align-items: center;
          font-size: 13px;
        }
        .quorum-error button { background: none; border: none; color: #ff8888; cursor: pointer; }

        /* Sections */
        .agents-section, .proposals-section, .completed-section { margin-bottom: 40px; }
        .section-label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px; letter-spacing: 0.12em;
          color: var(--muted, #555); text-transform: uppercase;
          margin-bottom: 16px;
        }

        /* Agent Grid */
        .agents-grid { display: flex; flex-direction: column; gap: 8px; }
        .agent-card {
          display: flex; align-items: center; gap: 12px;
          background: var(--surface, #0d0d0d);
          border: 1px solid var(--border, #1e1e1e);
          padding: 12px 16px;
          transition: border-color 0.15s;
        }
        .agent-card.voted { border-color: rgba(0,255,136,0.2); }
        .agent-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .agent-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .agent-label { font-size: 14px; font-weight: 500; }
        .agent-address { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--muted2, #777); }
        .agent-status { font-size: 11px; font-family: 'IBM Plex Mono', monospace; }
        .status-voted { color: var(--accent, #00ff88); }
        .status-pending { color: var(--muted2, #777); }

        /* Proposal Cards */
        .proposal-card {
          background: var(--surface, #0d0d0d);
          border: 1px solid var(--border, #1e1e1e);
          padding: 20px 24px;
          margin-bottom: 12px;
          transition: border-color 0.15s;
        }
        .proposal-card.quorum-reached { border-color: rgba(0,255,136,0.3); }
        .proposal-card.completed { opacity: 0.6; }
        .proposal-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 12px;
        }
        .proposal-id { display: flex; align-items: center; gap: 10px; }
        .proposal-deadline { font-size: 12px; color: var(--yellow, #ffcc00); font-family: 'IBM Plex Mono', monospace; }
        .badge-quorum {
          background: rgba(0,255,136,0.12); color: var(--accent, #00ff88);
          font-size: 10px; font-family: 'IBM Plex Mono', monospace;
          padding: 2px 8px; letter-spacing: 0.08em;
        }
        .badge-executed {
          background: rgba(68,136,255,0.1); color: var(--blue, #4488ff);
          font-size: 10px; font-family: 'IBM Plex Mono', monospace;
          padding: 2px 8px; letter-spacing: 0.08em;
        }
        .proposal-description { font-size: 15px; line-height: 1.5; margin-bottom: 10px; }
        .proposal-proposer { font-size: 12px; color: var(--muted2, #777); margin-bottom: 20px; }

        /* Progress Bar */
        .quorum-progress-wrap { margin-bottom: 20px; }
        .quorum-progress-label {
          display: flex; justify-content: space-between;
          font-size: 12px; color: var(--text2, #b0b0b0);
          margin-bottom: 8px; font-family: 'IBM Plex Mono', monospace;
        }
        .quorum-progress-bar {
          height: 4px; background: var(--surface2, #141414);
          border: 1px solid var(--border, #1e1e1e);
          overflow: hidden;
        }
        .quorum-progress-fill {
          height: 100%; background: var(--accent, #00ff88);
          transition: width 0.4s ease;
        }
        .vote-counts { display: flex; gap: 16px; margin-top: 8px; font-size: 12px; font-family: 'IBM Plex Mono', monospace; }
        .vote-yes { color: var(--accent, #00ff88); }
        .vote-no { color: var(--red, #ff4444); }

        /* Vote Buttons */
        .vote-actions { display: flex; gap: 10px; }
        .btn-vote {
          padding: 9px 20px; font-size: 13px; font-weight: 600;
          cursor: pointer; border: none; transition: opacity 0.15s;
          font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.04em;
        }
        .btn-vote:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-yes { background: var(--accent, #00ff88); color: #000; }
        .btn-yes:hover:not(:disabled) { opacity: 0.85; }
        .btn-no { background: transparent; color: var(--red, #ff4444); border: 1px solid var(--red, #ff4444); }
        .btn-no:hover:not(:disabled) { background: rgba(255,68,68,0.08); }
        .connect-hint { font-size: 12px; color: var(--muted2, #777); font-style: italic; }

        /* Skeletons */
        .skeleton-row { height: 48px; background: var(--surface, #0d0d0d); animation: pulse 1.5s ease infinite; }
        .skeleton-card { height: 160px; background: var(--surface, #0d0d0d); margin-bottom: 12px; animation: pulse 1.5s ease infinite; }
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        .empty-state { text-align: center; color: var(--muted2, #777); padding: 32px; font-size: 14px; }
        .empty-icon { display: block; font-size: 24px; margin-bottom: 8px; }
        .mono { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--muted2, #777); }

        @media (max-width: 600px) {
          .quorum-title-row { flex-direction: column; align-items: flex-start; }
          .vote-actions { flex-direction: column; }
          .btn-vote { width: 100%; text-align: center; }
        }
      `}</style>
    </div>
  );
}
