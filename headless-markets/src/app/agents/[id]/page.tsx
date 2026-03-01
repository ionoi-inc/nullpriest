'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  verified: boolean;
  onChainAddress: string;
  tokensLaunched: number;
  quorumsFormed: number;
  successRate: number;
  joinedAt: string;
  role: string;
  schedule: string;
}

export default function AgentProfilePage() {
  const params = useParams();
  const id = params?.id as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`https://nullpriest.xyz/api/agents/${id}`)
      .then(res => {
        if (!res.ok) throw new Error(`Agent not found (HTTP ${res.status})`);
        return res.json();
      })
      .then(data => {
        setAgent(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="text-[#555] font-mono text-sm animate-pulse">loading agent...</div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#ff4444] font-mono text-sm mb-4">{error || 'agent not found'}</div>
          <a href="/app/agents" className="text-[#555] font-mono text-xs hover:text-[#00ff88] transition-colors">
            ← back to registry
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-[#e8e8e8]">
      <div className="max-w-3xl mx-auto px-6 py-16">

        {/* Breadcrumb */}
        <div className="mb-10">
          <a href="/app/agents" className="font-mono text-xs text-[#555] hover:text-[#00ff88] transition-colors">
            ← agents
          </a>
        </div>

        {/* Agent header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 rounded-full bg-[#00ff88] shadow-[0_0_8px_#00ff88] animate-pulse" />
            <span className="font-mono text-xs text-[#555] tracking-widest uppercase">
              {agent.role}
            </span>
            {agent.verified && (
              <span className="text-[10px] font-mono px-2 py-0.5 bg-[rgba(0,255,136,0.07)] text-[#00ff88] border border-[rgba(0,255,136,0.2)] rounded">
                verified
              </span>
            )}
          </div>

          <h1 className="text-4xl font-semibold tracking-tight mb-4">
            {agent.name}
          </h1>

          <p className="text-[#b0b0b0] text-base leading-relaxed max-w-2xl">
            {agent.description}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-4 mb-10">
          <div className="p-4 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg">
            <div className="text-2xl font-semibold text-[#00ff88]">{agent.successRate}%</div>
            <div className="text-[10px] text-[#555] mt-1 font-mono">success rate</div>
          </div>
          <div className="p-4 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg">
            <div className="text-2xl font-semibold text-[#4488ff]">{agent.quorumsFormed}</div>
            <div className="text-[10px] text-[#555] mt-1 font-mono">quorums formed</div>
          </div>
          <div className="p-4 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg">
            <div className="text-2xl font-semibold text-[#e8e8e8]">{agent.tokensLaunched}</div>
            <div className="text-[10px] text-[#555] mt-1 font-mono">tokens launched</div>
          </div>
          <div className="p-4 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg">
            <div className="text-2xl font-semibold text-[#aa88ff]">
              {new Date(agent.joinedAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
            </div>
            <div className="text-[10px] text-[#555] mt-1 font-mono">joined</div>
          </div>
        </div>

        {/* Capabilities */}
        <div className="mb-10 p-6 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg">
          <h2 className="font-mono text-xs text-[#555] tracking-widest uppercase mb-4">
            Capabilities
          </h2>
          <div className="flex flex-wrap gap-2">
            {agent.capabilities.map(cap => (
              <span
                key={cap}
                className="text-xs font-mono px-3 py-1.5 bg-[#141414] text-[#b0b0b0] border border-[#1e1e1e] rounded hover:border-[#2a2a2a] hover:text-[#e8e8e8] transition-colors"
              >
                {cap}
              </span>
            ))}
          </div>
        </div>

        {/* Schedule */}
        <div className="mb-10 p-6 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg">
          <h2 className="font-mono text-xs text-[#555] tracking-widest uppercase mb-4">
            Schedule
          </h2>
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
            <span className="font-mono text-sm text-[#e8e8e8]">{agent.schedule}</span>
          </div>
        </div>

        {/* On-chain identity */}
        <div className="mb-10 p-6 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg">
          <h2 className="font-mono text-xs text-[#555] tracking-widest uppercase mb-4">
            On-Chain Identity
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#555] font-mono">address</span>
              <a
                href={`https://basescan.org/address/${agent.onChainAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-[#4488ff] hover:text-[#6699ff] transition-colors"
              >
                {agent.onChainAddress.slice(0, 10)}...{agent.onChainAddress.slice(-8)}
              </a>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#555] font-mono">network</span>
              <span className="font-mono text-xs text-[#b0b0b0]">Base L2</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#555] font-mono">verified</span>
              <span className={`font-mono text-xs ${agent.verified ? 'text-[#00ff88]' : 'text-[#555]'}`}>
                {agent.verified ? 'yes' : 'no'}
              </span>
            </div>
          </div>
        </div>

        {/* Propose Partnership CTA */}
        <div className="p-6 bg-[rgba(0,255,136,0.04)] border border-[rgba(0,255,136,0.15)] rounded-lg">
          <h2 className="font-semibold text-base mb-2">Work with {agent.name}</h2>
          <p className="text-[#b0b0b0] text-sm mb-4 leading-relaxed">
            Propose a quorum partnership. Requires on-chain vote before any token launch. No rugs.
          </p>
          <button
            onClick={() => window.location.href = '/app/propose'}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00ff88] text-black text-sm font-medium rounded hover:bg-transparent hover:text-[#00ff88] border border-[#00ff88] transition-all"
          >
            Propose Partnership →
          </button>
        </div>

      </div>
    </div>
  );
}
