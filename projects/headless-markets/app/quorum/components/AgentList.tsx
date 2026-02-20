'use client';

import { useEffect, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { QUORUM_ABI, QUORUM_CONTRACT_ADDRESS } from '../../../lib/quorum-abi';

interface Agent {
  address: string;
  name: string;
  role: string;
}

const client = createPublicClient({ chain: base, transport: http() });

export default function AgentList() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const [addresses, names, roles] = await client.readContract({
          address: QUORUM_CONTRACT_ADDRESS,
          abi: QUORUM_ABI,
          functionName: 'getRegisteredAgents',
        }) as [string[], string[], string[]];

        setAgents(addresses.map((addr, i) => ({
          address: addr,
          name: names[i] || `Agent ${i + 1}`,
          role: roles[i] || 'voter',
        })));
      } catch (err: any) {
        setError(err.message || 'Failed to load agents');
        // Fallback: show known nullpriest agents
        setAgents([
          { address: '0xe5e3A48286E241A4b5Fb526cC050b830FBA29', name: 'Scout', role: 'Intelligence' },
          { address: '0x0000000000000000000000000000000000000001', name: 'Strategist', role: 'Planning' },
          { address: '0x0000000000000000000000000000000000000002', name: 'Builder A', role: 'Engineering' },
          { address: '0x0000000000000000000000000000000000000003', name: 'Builder B', role: 'Engineering' },
          { address: '0x0000000000000000000000000000000000000004', name: 'Publisher', role: 'Distribution' },
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchAgents();
  }, []);

  if (loading) return null;

  return (
    <div className="space-y-3">
      {error && (
        <div className="font-['IBM_Plex_Mono'] text-[11px] text-[#ffcc00] mb-3">
          ⚠ On-chain read failed — showing cached agents. {error}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {agents.map((agent, i) => (
          <div
            key={agent.address}
            className="bg-[#0d0d0d] border border-[#1e1e1e] rounded p-4 hover:border-[#2a2a2a] transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
              <span className="font-semibold text-sm text-[#e8e8e8]">{agent.name}</span>
            </div>
            <div className="font-['IBM_Plex_Mono'] text-[10px] text-[#555] uppercase tracking-widest mb-1">
              {agent.role}
            </div>
            <div className="font-['IBM_Plex_Mono'] text-[10px] text-[#555] truncate">
              {agent.address.slice(0, 8)}...{agent.address.slice(-6)}
            </div>
            <div className="mt-3 flex items-center gap-1">
              <span className="text-[10px] text-[#00ff88] font-['IBM_Plex_Mono']">ELIGIBLE</span>
            </div>
          </div>
        ))}
      </div>
      <div className="font-['IBM_Plex_Mono'] text-[11px] text-[#555] mt-2">
        {agents.length} agents registered · quorum threshold: 3-of-{agents.length}
      </div>
    </div>
  );
}