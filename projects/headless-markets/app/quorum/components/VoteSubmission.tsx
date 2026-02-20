'use client';

import { useEffect, useState } from 'react';
import { createPublicClient, createWalletClient, http, custom } from 'viem';
import { base } from 'viem/chains';
import { QUORUM_ABI, QUORUM_CONTRACT_ADDRESS } from '../../../lib/quorum-abi';

const publicClient = createPublicClient({ chain: base, transport: http() });

interface Proposal {
  id: `0x${string}`;
  label: string;
}

export default function VoteSubmission() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<string>('');
  const [support, setSupport] = useState<boolean | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    async function loadProposals() {
      try {
        const ids = await publicClient.readContract({
          address: QUORUM_CONTRACT_ADDRESS,
          abi: QUORUM_ABI,
          functionName: 'getActiveProposals',
        }) as `0x${string}`[];
        setProposals(ids.map((id, i) => ({
          id,
          label: `Proposal ${i + 1} — ${id.slice(0, 10)}...${id.slice(-6)}`,
        })));
        if (ids.length > 0) setSelectedProposal(ids[0]);
      } catch {
        const placeholder = '0x0000000000000000000000000000000000000000000000000000000000000001' as `0x${string}`;
        setProposals([{ id: placeholder, label: 'Proposal 1 — Partnership Vote' }]);
        setSelectedProposal(placeholder);
      }
    }
    loadProposals();
  }, []);

  async function castVote() {
    if (!selectedProposal || support === null) return;
    setStatus('pending');
    setErrorMsg(null);
    try {
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        throw new Error('No wallet detected. Connect MetaMask or a Base-compatible wallet.');
      }
      const walletClient = createWalletClient({ chain: base, transport: custom((window as any).ethereum) });
      const [address] = await walletClient.requestAddresses();
      const hash = await walletClient.writeContract({
        address: QUORUM_CONTRACT_ADDRESS,
        abi: QUORUM_ABI,
        functionName: 'castVote',
        args: [selectedProposal as `0x${string}`, support],
        account: address,
      });
      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus('success');
      setHasVoted(true);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.shortMessage || err.message || 'Transaction failed');
    }
  }

  return (
    <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded p-6">
      {hasVoted ? (
        <div className="text-center py-6">
          <div className="text-[#00ff88] text-2xl mb-2">✓</div>
          <div className="font-semibold text-[#e8e8e8] mb-1">Vote recorded on-chain</div>
          {txHash && (
            <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
              className="font-['IBM_Plex_Mono'] text-[11px] text-[#4488ff] hover:underline">
              {txHash.slice(0, 18)}... — view on Basescan
            </a>
          )}
        </div>
      ) : (
        <>
          <div className="mb-5">
            <label className="font-['IBM_Plex_Mono'] text-[10px] text-[#555] uppercase tracking-widest block mb-2">Proposal</label>
            <select value={selectedProposal} onChange={e => setSelectedProposal(e.target.value)}
              className="w-full bg-[#141414] border border-[#2a2a2a] text-[#e8e8e8] text-sm rounded px-3 py-2 font-['IBM_Plex_Mono'] focus:outline-none focus:border-[#00ff88]">
              {proposals.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div className="mb-6">
            <label className="font-['IBM_Plex_Mono'] text-[10px] text-[#555] uppercase tracking-widest block mb-2">Your Vote</label>
            <div className="flex gap-3">
              <button onClick={() => setSupport(true)}
                className={`flex-1 py-3 rounded border text-sm font-semibold transition-all ${support === true ? 'border-[#00ff88] bg-[rgba(0,255,136,0.07)] text-[#00ff88]' : 'border-[#1e1e1e] text-[#555] hover:border-[#2a2a2a] hover:text-[#b0b0b0]'}`}>
                APPROVE
              </button>
              <button onClick={() => setSupport(false)}
                className={`flex-1 py-3 rounded border text-sm font-semibold transition-all ${support === false ? 'border-[#ff4444] bg-[rgba(255,68,68,0.07)] text-[#ff4444]' : 'border-[#1e1e1e] text-[#555] hover:border-[#2a2a2a] hover:text-[#b0b0b0]'}`}>
                REJECT
              </button>
            </div>
          </div>
          <button onClick={castVote} disabled={support === null || status === 'pending'}
            className={`w-full py-3 rounded text-sm font-semibold transition-all ${support === null ? 'bg-[#1a1a1a] text-[#555] cursor-not-allowed' : status === 'pending' ? 'bg-[#00ff88] text-black opacity-50 cursor-wait' : 'bg-[#00ff88] text-black hover:opacity-90'}`}>
            {status === 'pending' ? 'Waiting for signature...' : 'Cast Vote On-Chain'}
          </button>
          {status === 'error' && errorMsg && (
            <div className="mt-3 font-['IBM_Plex_Mono'] text-[11px] text-[#ff4444]">✗ {errorMsg}</div>
          )}
          <div className="mt-4 font-['IBM_Plex_Mono'] text-[10px] text-[#555] leading-relaxed">
            Votes are final and recorded on Base L2. 3-of-5 agents must approve for quorum to pass.
          </div>
        </>
      )}
    </div>
  );
}