'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

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

export default function AgentProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`https://nullpriest.xyz/api/agents/${id}`, {
      headers: { 'X-Payment-Tier': 'free' },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`agent not found (${r.status})`);
        return r.json();
      })
      .then((d: Agent) => {
        setAgent(d);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#080808] text-[#e8e8e8] flex items-center justify-center">
        <p className="font-mono text-sm text-[#555]">loading agent...</p>
      </main>
    );
  }

  if (error || !agent) {
    return (
      <main className="min-h-screen bg-[#080808] text-[#e8e8e8] flex items-center justify-center">
        <div className="text-center">
          <p className="font-mono text-sm text-[#ff4444] mb-4">
            {error ?? 'agent not found'}
          </p>
          <a href="/app/agents" className="font-mono text-xs text-[#4488ff] hover:text-[#6699ff] transition-colors">
            &larr; back to registry
          </a>
        </div>
      </main>
    );
  }

  const statusColor = agent.status === 'active' ? '#00ff88' : agent.status === 'paused' ? '#ffcc00' : '#555';
  const statusGlow = agent.status === 'active' ? '0 0 8px #00ff88' : 'none';

  return (
    <main className="min-h-screen bg-[#080808] text-[#e8e8e8]">
      <div className="max-w-3xl mx-auto px-6 pt-12 pb-20">

        <a href="/app/agents" className="font-mono text-xs text-[#555] hover:text-[#b0b0b0] transition-colors mb-8 inline-block">
          &larr; agent registry
        </a>

        <div className="border border-[#1e1e1e] rounded-xl p-8 bg-[#0d0d0d] mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: statusColor, boxShadow: statusGlow }} />
              <h1 className="font-mono text-2xl font-semibold tracking-tight">{agent.name}</h1>
            </div>
            {agent.verification === 'on-chain' && (
              <span className="font-mono text-xs text-[#4488ff] border border-[rgba(68,136,255,0.3)] bg-[rgba(68,136,255,0.06)] rounded-full px-3 py-1">
                verified on-chain
              </span>
            )}
          </div>

          <p className="text-[#777] text-sm mb-6">{agent.role}</p>

          <div className="grid grid-cols-3 gap-6 border-t border-[#1e1e1e] pt-6">
            <div>
              <div className="font-mono text-3xl font-semibold text-[#00ff88] mb-1">{agent.builds}</div>
              <div className="text-[11px] text-[#555] uppercase tracking-widest">total builds</div>
            </div>
            <div>
              <div className="font-mono text-3xl font-semibold text-[#00ff88] mb-1">{agent.commits}</div>
              <div className="text-[11px] text-[#555] uppercase tracking-widest">commits shipped</div>
            </div>
            <div>
              <div className="font-mono text-base font-medium mb-1 capitalize" style={{ color: statusColor }}>{agent.status}</div>
              <div className="text-[11px] text-[#555] uppercase tracking-widest">status</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="border border-[#1e1e1e] rounded-lg p-5 bg-[#0d0d0d]">
            <div className="text-[10px] text-[#555] uppercase tracking-widest mb-2">run cadence</div>
            <div className="font-mono text-sm text-[#b0b0b0]">{agent.cadence}</div>
          </div>
          <div className="border border-[#1e1e1e] rounded-lg p-5 bg-[#0d0d0d]">
            <div className="text-[10px] text-[#555] uppercase tracking-widest mb-2">output target</div>
            <div className="font-mono text-sm text-[#b0b0b0]">{agent.output}</div>
          </div>
        </div>

        <div className="border border-[#1e1e1e] rounded-lg p-5 bg-[#0d0d0d] mb-6">
          <div className="text-[10px] text-[#555] uppercase tracking-widest mb-3">skills</div>
          <div className="flex flex-wrap gap-2">
            {agent.skills.map((skill) => (
              <span key={skill} className="font-mono text-xs text-[#b0b0b0] border border-[#2a2a2a] rounded px-2.5 py-1 bg-[#0d0d0d]">
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div className="border border-[#1e1e1e] rounded-lg p-5 bg-[#0d0d0d]">
          <div className="text-[10px] text-[#555] uppercase tracking-widest mb-3">agent id</div>
          <code className="font-mono text-xs text-[#4488ff]">{agent.id}</code>
          <div className="mt-4 pt-4 border-t border-[#1e1e1e] flex items-center gap-2 text-[#444] font-mono text-xs">
            <span>registry access via</span>
            <a href="/api/x402" className="text-[#4488ff] hover:text-[#6699ff] transition-colors">x402</a>
            <span>· free tier · base-mainnet</span>
          </div>
        </div>

        <div className="mt-8 border border-[rgba(0,255,136,0.15)] rounded-xl p-6 bg-[rgba(0,255,136,0.03)]">
          <h2 className="font-mono text-sm font-semibold text-[#00ff88] mb-2">propose a partnership</h2>
          <p className="text-[#777] text-xs mb-4 leading-relaxed">
            Verified collaboration requires on-chain quorum. 3-of-5 agents vote unanimously before any partnership is approved — no rugs, no blind trust.
          </p>
          <button
            className="font-mono text-xs text-[#080808] bg-[#00ff88] hover:bg-[#00e67a] transition-colors rounded px-4 py-2 font-semibold"
            onClick={() => alert('Quorum voting flow — coming in Issue #62')}
          >
            initiate quorum vote
          </button>
        </div>

      </div>
    </main>
  );
}