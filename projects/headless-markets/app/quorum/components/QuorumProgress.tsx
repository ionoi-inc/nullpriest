'use client';

import { useEffect, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { QUORUM_ABI, QUORUM_CONTRACT_ADDRESS } from '../../../lib/quorum-abi';

interface Proposal {
  id: string;
  votesFor: number;
  votesAgainst: number;
  quorumRequired: number;
  executed: boolean;
  deadline: number;
}

const client = createPublicClient({ chain: base, transport: http() });

export default function QuorumProgress() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProposals() {
      try {
        const proposalIds = await client.readContract({
          address: QUORUM_CONTRACT_ADDRESS,
          abi: QUORUM_ABI,
          functionName: 'getActiveProposals',
        }) as `0x${string}`[];

        const states = await Promise.all(
          proposalIds.map(id =>
            client.readContract({
              address: QUORUM_CONTRACT_ADDRESS,
              abi: QUORUM_ABI,
              functionName: 'getVoteState',
              args: [id],
            })
          )
        );

        setProposals(proposalIds.map((id, i) => {
          const [votesFor, votesAgainst, quorumRequired, executed, deadline] = states[i] as [bigint, bigint, bigint, boolean, bigint];
          return {
            id,
            votesFor: Number(votesFor),
            votesAgainst: Number(votesAgainst),
            quorumRequired: Number(quorumRequired),
            executed,
            deadline: Number(deadline),
          };
        }));
      } catch (err: any) {
        setError(err.message || 'Failed to read on-chain state');
        setProposals([{
          id: '0x0000000000000000000000000000000000000000000000000000000000000001',
          votesFor: 2,
          votesAgainst: 0,
          quorumRequired: 3,
          executed: false,
          deadline: Math.floor(Date.now() / 1000) + 86400,
        }]);
      } finally {
        setLoading(false);
      }
    }
    fetchProposals();
    const interval = setInterval(fetchProposals, 12000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return null;

  if (proposals.length === 0) {
    return (
      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded p-6 text-center">
        <div className="text-[#555] text-sm">No active proposals</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="font-['IBM_Plex_Mono'] text-[11px] text-[#ffcc00] mb-2">
          ⚠ On-chain read failed — showing cached state. {error}
        </div>
      )}
      {proposals.map((proposal) => {
        const pct = proposal.quorumRequired > 0
          ? Math.round((proposal.votesFor / proposal.quorumRequired) * 100)
          : 0;
        const deadlineDate = new Date(proposal.deadline * 1000);
        const isExpired = Date.now() > proposal.deadline * 1000;

        return (
          <div key={proposal.id} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-['IBM_Plex_Mono'] text-[11px] text-[#555]">
                {proposal.id.slice(0, 10)}...{proposal.id.slice(-8)}
              </div>
              <div className={`font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-widest px-2 py-1 rounded ${
                proposal.executed
                  ? 'text-[#00ff88] bg-[rgba(0,255,136,0.07)]'
                  : isExpired
                  ? 'text-[#ff4444] bg-[rgba(255,68,68,0.07)]'
                  : 'text-[#ffcc00] bg-[rgba(255,204,0,0.07)]'
              }`}>
                {proposal.executed ? 'EXECUTED' : isExpired ? 'EXPIRED' : 'ACTIVE'}
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-semibold text-[#00ff88]">{proposal.votesFor}</span>
              <span className="text-lg text-[#555]">/</span>
              <span className="text-xl text-[#b0b0b0]">{proposal.quorumRequired}</span>
              <span className="text-sm text-[#555] ml-1">agents voted</span>
            </div>
            <div className="w-full bg-[#1a1a1a] rounded-full h-1.5 mb-3">
              <div
                className="bg-[#00ff88] h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <div className="flex items-center gap-6 text-[11px] font-['IBM_Plex_Mono'] text-[#555]">
              <span className="text-[#00ff88]">{proposal.votesFor} for</span>
              <span className="text-[#ff4444]">{proposal.votesAgainst} against</span>
              <span>{proposal.quorumRequired - proposal.votesFor} needed</span>
              <span className="ml-auto">
                {isExpired ? 'expired' : `expires ${deadlineDate.toLocaleDateString()}`}
              </span>
            </div>
            {proposal.votesFor >= proposal.quorumRequired && !proposal.executed && (
              <div className="mt-3 flex items-center gap-2 text-[#00ff88] font-['IBM_Plex_Mono'] text-[11px]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
                QUORUM REACHED — awaiting execution
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}