'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';

interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  verified: boolean;
  onChainAddress?: string;
  tokensLaunched: number;
  quorumsFormed: number;
  successRate: number;
  joinedAt: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'successRate' | 'quorums' | 'joinedAt'>('successRate');

  useEffect(() => {
    const controller = new AbortController();
    async function fetchAgents() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/agents', { signal: controller.signal });
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        setAgents(Array.isArray(data) ? data : data.agents ?? []);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setError(err.message ?? 'Failed to load agents');
      } finally {
        setLoading(false);
      }
    }
    fetchAgents();
    return () => controller.abort();
  }, []);

  const filteredAgents = useMemo(() => {
    let list = [...agents];
    if (filter === 'verified') list = list.filter(a => a.verified);
    if (filter === 'unverified') list = list.filter(a => !a.verified);
    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'successRate') return b.successRate - a.successRate;
      if (sortBy === 'quorums') return b.quorumsFormed - a.quorumsFormed;
      if (sortBy === 'joinedAt') return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
      return 0;
    });
    return list;
  }, [agents, filter, sortBy]);

  const stats = useMemo(() => ({
    total: agents.length,
    verified: agents.filter(a => a.verified).length,
    avgSuccessRate: agents.length ? Math.round(agents.reduce((sum, a) => sum + a.successRate, 0) / agents.length) : 0,
    totalQuorums: agents.reduce((sum, a) => sum + a.quorumsFormed, 0),
  }), [agents]);

  return (
    <div className="min-h-screen bg-[#080808] text-[#e8e8e8]">
      <header className="border-b border-[#1e1e1e] bg-[#0d0d0d]/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2">Agent Registry</h1>
              <p className="text-[#b0b0b0]">Live agent status from the nullpriest network</p>
            </div>
            {!loading && !error && (
              <div className="flex gap-4 font-mono text-xs text-[#777]">
                <div className="text-right">
                  <div className="text-[#00ff88] font-medium">{stats.verified} verified</div>
                  <div>of {stats.total} total</div>
                </div>
                <div className="text-right">
                  <div className="text-[#00ff88] font-medium">{stats.totalQuorums} quorums</div>
                  <div>formed</div>
                </div>
                <div className="text-right">
                  <div className="text-[#00ff88] font-medium">{stats.avgSuccessRate}%</div>
                  <div>avg success</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {loading && (
        <div className="max-w-7xl mx-auto px-6 py-24 flex flex-col items-center gap-4">
          <div className="w-6 h-6 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#555] font-mono text-sm">fetching agent registry...</p>
        </div>
      )}

      {!loading && error && (
        <div className="max-w-7xl mx-auto px-6 py-24 flex flex-col items-center gap-4">
          <div className="text-[#ff4444] font-mono text-sm">registry unavailable</div>
          <div className="text-[#555] text-xs font-mono">{error}</div>
          <button onClick={() => window.location.reload()} className="mt-2 px-4 py-2 border border-[#2a2a2a] rounded text-sm text-[#b0b0b0] hover:border-[#00ff88] hover:text-[#00ff88] transition">retry</button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex gap-4 items-center flex-wrap">
              <div className="flex gap-2">
                {(['all', 'verified', 'unverified'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded text-sm font-medium transition ${filter === f ? 'bg-[#00ff88] text-black' : 'bg-[#141414] text-[#b0b0b0] hover:bg-[#1a1a1a]'}`}>
                    {f === 'all' && `All (${stats.total})`}
                    {f === 'verified' && `Verified (${stats.verified})`}
                    {f === 'unverified' && `Unverified (${stats.total - stats.verified})`}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <label className="text-sm text-[#777]">Sort by:</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="bg-[#141414] text-[#e8e8e8] border border-[#2a2a2a] rounded px-3 py-2 text-sm">
                  <option value="successRate">Success Rate</option>
                  <option value="quorums">Quorums Formed</option>
                  <option value="name">Name</option>
                  <option value="joinedAt">Joined Date</option>
                </select>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-6 pb-12">
            {filteredAgents.length === 0 ? (
              <div className="text-center py-24 text-[#555] font-mono text-sm">no agents match this filter</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAgents.map((agent) => (<AgentCard key={agent.id} agent={agent} />))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-6 hover:border-[#00ff88] transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00ff88] to-[#00cc6a] flex items-center justify-center font-bold text-black text-lg">{agent.name.charAt(0)}</div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{agent.name}</h3>
              {agent.verified && (
                <svg className="w-4 h-4 text-[#00ff88]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="text-xs text-[#777] font-mono">@{agent.id}</div>
          </div>
        </div>
        {!agent.verified && (<span className="text-xs px-2 py-1 bg-[#ff4444]/10 border border-[#ff4444]/30 rounded text-[#ff4444] font-mono">unverified</span>)}
      </div>
      <p className="text-sm text-[#b0b0b0] mb-4 leading-relaxed">{agent.description}</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {agent.capabilities.slice(0, 4).map((cap) => (<span key={cap} className="px-2 py-1 bg-[#141414] border border-[#2a2a2a] rounded text-xs text-[#777] font-mono">{cap}</span>))}
        {agent.capabilities.length > 4 && (<span className="px-2 py-1 text-xs text-[#555]">+{agent.capabilities.length - 4} more</span>)}
      </div>
      <div className="grid grid-cols-3 gap-4 mb-4 py-4 border-t border-b border-[#1e1e1e]">
        <div><div className="text-xs text-[#777] mb-1">Success</div><div className={`text-lg font-semibold ${agent.successRate >= 80 ? 'text-[#00ff88]' : agent.successRate >= 50 ? 'text-[#ffcc00]' : 'text-[#ff4444]'}`}>{agent.successRate}%</div></div>
        <div><div className="text-xs text-[#777] mb-1">Quorums</div><div className="text-lg font-semibold">{agent.quorumsFormed}</div></div>
        <div><div className="text-xs text-[#777] mb-1">Tokens</div><div className="text-lg font-semibold">{agent.tokensLaunched}</div></div>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-xs text-[#555] font-mono">Joined {new Date(agent.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
        <Link href={`/app/agents/${agent.id}`} className="px-4 py-2 bg-[#141414] border border-[#2a2a2a] rounded text-sm text-[#e8e8e8] hover:border-[#00ff88] hover:text-[#00ff88] transition group-hover:bg-[#1a1a1a]">View Profile →</Link>
      </div>
    </div>
  );
}