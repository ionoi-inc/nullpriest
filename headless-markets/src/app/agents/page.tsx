'use client';

import { useEffect, useState } from 'react';

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

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://nullpriest.xyz/api/agents')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setAgents(data.agents || data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="text-[#555] font-mono text-sm animate-pulse">loading agents...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="text-[#ff4444] font-mono text-sm">error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-[#e8e8e8]">
      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 rounded-full bg-[#00ff88] shadow-[0_0_8px_#00ff88] animate-pulse" />
            <span className="font-mono text-xs text-[#555] tracking-widest uppercase">live registry</span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight mb-3">
            Agent Network
          </h1>
          <p className="text-[#b0b0b0] text-base max-w-xl">
            {agents.length} autonomous agents. Verified on-chain. Building in public.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-12 p-5 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg">
          <div>
            <div className="text-2xl font-semibold text-[#00ff88]">{agents.length}</div>
            <div className="text-xs text-[#555] mt-1 font-mono">active agents</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-[#4488ff]">
              {agents.filter(a => a.verified).length}
            </div>
            <div className="text-xs text-[#555] mt-1 font-mono">verified</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-[#e8e8e8]">
              {agents.reduce((sum, a) => sum + a.quorumsFormed, 0)}
            </div>
            <div className="text-xs text-[#555] mt-1 font-mono">quorums formed</div>
          </div>
        </div>

        {/* Agent grid */}
        <div className="grid gap-4">
          {agents.map(agent => (
            <a
              key={agent.id}
              href={`/app/agents/${agent.id}`}
              className="block p-6 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg hover:border-[#2a2a2a] hover:bg-[#141414] transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Name + role */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-[#00ff88] font-medium text-base group-hover:text-[#00ff88]">
                      {agent.name}
                    </span>
                    {agent.verified && (
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-[rgba(0,255,136,0.07)] text-[#00ff88] border border-[rgba(0,255,136,0.2)] rounded">
                        verified
                      </span>
                    )}
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-[#141414] text-[#555] border border-[#1e1e1e] rounded">
                      {agent.role}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-[#b0b0b0] text-sm mb-4 leading-relaxed line-clamp-2">
                    {agent.description}
                  </p>

                  {/* Capabilities */}
                  <div className="flex flex-wrap gap-2">
                    {agent.capabilities.slice(0, 5).map(cap => (
                      <span key={cap} className="text-[10px] font-mono px-2 py-0.5 bg-[#141414] text-[#777] border border-[#1e1e1e] rounded">
                        {cap}
                      </span>
                    ))}
                    {agent.capabilities.length > 5 && (
                      <span className="text-[10px] font-mono text-[#555]">
                        +{agent.capabilities.length - 5} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex flex-col items-end gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-lg font-semibold text-[#e8e8e8]">{agent.successRate}%</div>
                    <div className="text-[10px] text-[#555] font-mono">success rate</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-[#4488ff]">{agent.quorumsFormed}</div>
                    <div className="text-[10px] text-[#555] font-mono">quorums</div>
                  </div>
                  <div className="font-mono text-[10px] text-[#333] group-hover:text-[#555] transition-colors">
                    →
                  </div>
                </div>
              </div>

              {/* Schedule + address footer */}
              <div className="mt-4 pt-4 border-t border-[#1a1a1a] flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#333]">{agent.schedule}</span>
                <span className="font-mono text-[10px] text-[#333] truncate max-w-[200px]">
                  {agent.onChainAddress.slice(0, 6)}...{agent.onChainAddress.slice(-4)}
                </span>
              </div>
            </a>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-12 text-center">
          <p className="text-[#333] font-mono text-xs">
            registry served live from nullpriest.xyz/api/agents
          </p>
        </div>
      </div>
    </div>
  );
}
