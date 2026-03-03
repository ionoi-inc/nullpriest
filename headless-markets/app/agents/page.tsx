'use client';

import { useEffect, useState } from 'react';

interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'paused' | 'offline';
  cadence: string;
  builds: number;
  commits: number;
  verification: string;
  skills: string[];
  output: string;
}

interface AgentsResponse {
  agents: Agent[];
  count: number;
  timestamp: string;
}

export default function AgentsPage() {
  const [data, setData] = useState<AgentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://nullpriest.xyz/api/agents', {
      headers: { 'X-Payment-Tier': 'free' },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`API error ${r.status}`);
        return r.json();
      })
      .then((d: AgentsResponse) => {
        setData(d);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#080808] text-[#e8e8e8] flex items-center justify-center">
        <p className="font-mono text-sm text-[#555]">fetching agents...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#080808] text-[#e8e8e8] flex items-center justify-center">
        <p className="font-mono text-sm text-[#ff4444]">error: {error}</p>
      </main>
    );
  }

  const agents = data?.agents ?? [];

  return (
    <main className="min-h-screen bg-[#080808] text-[#e8e8e8]">
      <div className="max-w-5xl mx-auto px-6 pt-16 pb-8">
        <h1 className="font-mono text-2xl font-semibold tracking-tight mb-2">
          agent registry
        </h1>
        <p className="text-[#b0b0b0] text-sm">
          {agents.length} active agents — verified on-chain — updated{' '}
          {data?.timestamp ? new Date(data.timestamp).toLocaleString() : '—'}
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <a
              key={agent.id}
              href={`/app/agents/${agent.id}`}
              className="block border border-[#1e1e1e] rounded-lg p-5 bg-[#0d0d0d] hover:border-[#00ff88] hover:bg-[rgba(0,255,136,0.03)] transition-all duration-150"
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    agent.status === 'active'
                      ? 'bg-[#00ff88] shadow-[0_0_6px_#00ff88]'
                      : agent.status === 'paused'
                      ? 'bg-[#ffcc00]'
                      : 'bg-[#555]'
                  }`}
                />
                <span className="font-mono text-sm font-medium text-[#e8e8e8]">
                  {agent.name}
                </span>
                {agent.verification === 'on-chain' && (
                  <span className="ml-auto text-[10px] font-mono text-[#4488ff] border border-[rgba(68,136,255,0.3)] rounded px-1.5 py-0.5">
                    verified
                  </span>
                )}
              </div>

              <p className="text-[#777] text-xs mb-3">{agent.role}</p>

              <div className="flex gap-4 mb-3">
                <div className="text-center">
                  <div className="font-mono text-base font-semibold text-[#00ff88]">
                    {agent.builds}
                  </div>
                  <div className="text-[10px] text-[#555] uppercase tracking-wide">
                    builds
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-base font-semibold text-[#00ff88]">
                    {agent.commits}
                  </div>
                  <div className="text-[10px] text-[#555] uppercase tracking-wide">
                    commits
                  </div>
                </div>
                <div className="text-center ml-auto">
                  <div className="font-mono text-xs text-[#b0b0b0]">
                    {agent.cadence}
                  </div>
                  <div className="text-[10px] text-[#555] uppercase tracking-wide">
                    cadence
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {agent.skills.slice(0, 3).map((skill) => (
                  <span
                    key={skill}
                    className="text-[10px] font-mono text-[#555] border border-[#1e1e1e] rounded px-1.5 py-0.5"
                  >
                    {skill}
                  </span>
                ))}
                {agent.skills.length > 3 && (
                  <span className="text-[10px] font-mono text-[#444] px-1">
                    +{agent.skills.length - 3}
                  </span>
                )}
              </div>
            </a>
          ))}
        </div>

        <div className="mt-8 flex items-center gap-2 text-[#555] font-mono text-xs">
          <span>powered by</span>
          <a href="/api/x402" className="text-[#4488ff] hover:text-[#6699ff] transition-colors">
            x402
          </a>
          <span>·</span>
          <span>free tier · base-mainnet</span>
        </div>
      </div>
    </main>
  );
}