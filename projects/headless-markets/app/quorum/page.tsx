'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem';

// Base L2 quorum voting contract ABI (subset for UI)
const QUORUM_ABI = [
  {
    name: 'getProposal',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [
      { name: 'agentA', type: 'address' },
      { name: 'agentB', type: 'address' },
      { name: 'votesFor', type: 'uint256' },
      { name: 'votesAgainst', type: 'uint256' },
      { name: 'quorumRequired', type: 'uint256' },
      { name: 'executed', type: 'bool' },
      { name: 'deadline', type: 'uint256' },
    ],
  },
  {
    name: 'castVote',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'support', type: 'bool' },
    ],
    outputs: [],
  },
  {
    name: 'hasVoted',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'voter', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getRegisteredAgents',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address[]' }],
  },
];

const QUORUM_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_QUORUM_CONTRACT_ADDRESS as `0x${string}`;
const QUORUM_REQUIRED = 3;

interface Proposal {
  agentA: string;
  agentB: string;
  votesFor: bigint;
  votesAgainst: bigint;
  quorumRequired: bigint;
  executed: boolean;
  deadline: bigint;
}

export default function QuorumPage() {
  const { address, isConnected } = useAccount();
  const [proposalId, setProposalId] = useState<number>(1);
  const [inputProposalId, setInputProposalId] = useState<string>('1');

  const { data: proposal, isLoading: proposalLoading, refetch: refetchProposal } = useReadContract({
    address: QUORUM_CONTRACT_ADDRESS,
    abi: QUORUM_ABI,
    functionName: 'getProposal',
    args: [BigInt(proposalId)],
  }) as { data: Proposal | undefined; isLoading: boolean; refetch: () => void };

  const { data: registeredAgents } = useReadContract({
    address: QUORUM_CONTRACT_ADDRESS,
    abi: QUORUM_ABI,
    functionName: 'getRegisteredAgents',
    args: [],
  }) as { data: string[] | undefined };

  const { data: hasVoted } = useReadContract({
    address: QUORUM_CONTRACT_ADDRESS,
    abi: QUORUM_ABI,
    functionName: 'hasVoted',
    args: address ? [BigInt(proposalId), address] : undefined,
    query: { enabled: !!address },
  }) as { data: boolean | undefined };

  const { writeContract, data: txHash, isPending: isVotePending } = useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isTxSuccess) refetchProposal();
  }, [isTxSuccess, refetchProposal]);

  const votesFor = proposal ? Number(proposal.votesFor) : 0;
  const votesAgainst = proposal ? Number(proposal.votesAgainst) : 0;
  const quorumRequired = proposal ? Number(proposal.quorumRequired) : QUORUM_REQUIRED;
  const totalVotes = votesFor + votesAgainst;
  const quorumProgress = Math.min((votesFor / quorumRequired) * 100, 100);
  const isExecuted = proposal?.executed ?? false;
  const deadlineDate = proposal ? new Date(Number(proposal.deadline) * 1000) : null;
  const isExpired = deadlineDate ? deadlineDate < new Date() : false;

  const handleVote = (support: boolean) => {
    if (!isConnected || !address) return;
    writeContract({
      address: QUORUM_CONTRACT_ADDRESS,
      abi: QUORUM_ABI,
      functionName: 'castVote',
      args: [BigInt(proposalId), support],
    });
  };

  const handleLoadProposal = () => {
    const id = parseInt(inputProposalId, 10);
    if (!isNaN(id) && id > 0) setProposalId(id);
  };

  return (
    <div className="min-h-screen bg-[#080808] text-[#e8e8e8] font-sans p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <p className="text-[10px] text-[#555] uppercase tracking-widest mb-2 font-mono">headless-markets / quorum</p>
          <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">Quorum Voting</h1>
          <p className="text-sm text-[#777]">{quorumRequired}-of-5 agent unanimous approval required to partner on-chain.</p>
        </div>
        <div className="flex gap-3 mb-8">
          <input type="number" min="1" value={inputProposalId} onChange={(e) => setInputProposalId(e.target.value)}
            className="bg-[#0d0d0d] border border-[#1e1e1e] text-white font-mono text-sm px-3 py-2 w-32 focus:outline-none focus:border-[#00ff88]" placeholder="Proposal #" />
          <button onClick={handleLoadProposal} className="px-4 py-2 bg-[#141414] border border-[#1e1e1e] text-sm text-[#b0b0b0] hover:text-white hover:border-[#2a2a2a] transition-colors">Load</button>
        </div>
        {proposalLoading ? (
          <div className="text-[#555] font-mono text-sm animate-pulse">Reading chain state...</div>
        ) : !proposal ? (
          <div className="text-[#555] font-mono text-sm">No proposal found at ID #{proposalId}</div>
        ) : (
          <>
            <div className={`flex items-center gap-2 px-4 py-3 mb-6 border text-xs font-mono uppercase tracking-wider ${isExecuted ? 'border-[#00ff88] text-[#00ff88] bg-[rgba(0,255,136,0.05)]' : isExpired ? 'border-[#ff4444] text-[#ff4444] bg-[rgba(255,68,68,0.05)]' : 'border-[#1e1e1e] text-[#777]'}`}>
              <span className={`w-2 h-2 rounded-full ${isExecuted ? 'bg-[#00ff88]' : isExpired ? 'bg-[#ff4444]' : 'bg-[#ffcc00] animate-pulse'}`} />
              {isExecuted ? 'Executed — Partnership Active' : isExpired ? 'Expired — Quorum Not Reached' : 'Active — Awaiting Votes'}
            </div>
            <div className="border border-[#1e1e1e] bg-[#0d0d0d] p-5 mb-6">
              <p className="text-[10px] text-[#555] uppercase tracking-widest mb-4 font-mono">Proposed Partnership</p>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[#555] font-mono mb-1">AGENT A</p>
                  <p className="text-sm font-mono text-[#00ff88] truncate">{proposal.agentA}</p>
                </div>
                <div className="text-[#555] text-xs font-mono shrink-0">x</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[#555] font-mono mb-1">AGENT B</p>
                  <p className="text-sm font-mono text-[#4488ff] truncate">{proposal.agentB}</p>
                </div>
              </div>
            </div>
            <div className="border border-[#1e1e1e] bg-[#0d0d0d] p-5 mb-6">
              <div className="flex justify-between items-baseline mb-3">
                <p className="text-[10px] text-[#555] uppercase tracking-widest font-mono">Quorum Progress</p>
                <p className="text-sm font-mono text-white">{votesFor}/{quorumRequired} agents voted</p>
              </div>
              <div className="w-full h-1.5 bg-[#1a1a1a] mb-4">
                <div className="h-full bg-[#00ff88] transition-all duration-500" style={{ width: `${quorumProgress}%` }} />
              </div>
              <div className="flex gap-6 text-xs font-mono">
                <span className="text-[#00ff88]">checkmark {votesFor} for</span>
                <span className="text-[#ff4444]">x {votesAgainst} against</span>
                <span className="text-[#555]">{quorumRequired - totalVotes > 0 ? `${quorumRequired - totalVotes} pending` : 'quorum met'}</span>
              </div>
            </div>
            {registeredAgents && registeredAgents.length > 0 && (
              <div className="border border-[#1e1e1e] bg-[#0d0d0d] p-5 mb-6">
                <p className="text-[10px] text-[#555] uppercase tracking-widest mb-4 font-mono">Registered Agents ({registeredAgents.length})</p>
                <div className="space-y-2">
                  {registeredAgents.map((agent, i) => (
                    <div key={agent} className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-[#555] w-5 shrink-0">{i + 1}.</span>
                      <span className="text-[#b0b0b0] truncate">{agent}</span>
                      {agent.toLowerCase() === address?.toLowerCase() && (
                        <span className="ml-auto text-[#00ff88] text-[10px] uppercase tracking-wider shrink-0">you</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {deadlineDate && (
              <div className="flex justify-between text-xs font-mono text-[#555] mb-6 px-1">
                <span>Deadline</span>
                <span className={isExpired ? 'text-[#ff4444]' : 'text-[#777]'}>{deadlineDate.toUTCString()}</span>
              </div>
            )}
            {!isExecuted && !isExpired && (
              <div className="border border-[#1e1e1e] bg-[#0d0d0d] p-5">
                <p className="text-[10px] text-[#555] uppercase tracking-widest mb-4 font-mono">Cast Vote</p>
                {!isConnected ? (
                  <p className="text-sm text-[#555] font-mono">Connect wallet to vote</p>
                ) : hasVoted ? (
                  <p className="text-sm text-[#00ff88] font-mono">You have already voted on this proposal</p>
                ) : (
                  <div className="flex gap-3">
                    <button onClick={() => handleVote(true)} disabled={isVotePending || isTxConfirming}
                      className="flex-1 py-3 bg-[rgba(0,255,136,0.08)] border border-[#00ff88] text-[#00ff88] text-sm font-mono uppercase tracking-wider hover:bg-[rgba(0,255,136,0.15)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      {isVotePending || isTxConfirming ? 'Confirming...' : 'Vote For'}
                    </button>
                    <button onClick={() => handleVote(false)} disabled={isVotePending || isTxConfirming}
                      className="flex-1 py-3 bg-[rgba(255,68,68,0.08)] border border-[#ff4444] text-[#ff4444] text-sm font-mono uppercase tracking-wider hover:bg-[rgba(255,68,68,0.15)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      {isVotePending || isTxConfirming ? 'Confirming...' : 'Vote Against'}
                    </button>
                  </div>
                )}
                {isTxSuccess && (
                  <p className="text-xs text-[#00ff88] font-mono mt-3">Vote confirmed on-chain. Tx: {txHash?.slice(0, 10)}...</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}