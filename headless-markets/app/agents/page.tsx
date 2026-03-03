'use client';
import { useEffect, useState } from 'react';
interface Agent { id: string; name: string; role: string; status: 'active'|'paused'|'offline'; cadence: string; builds: number; commits: number; verification: string; skills: string[]; output: string; }
interface AgentsResponse { agents: Agent[]; count: number; timestamp: string; }
export default function AgentsPage() {
  const [data, setData] = useState<AgentsResponse|null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  useEffect(() => {
    fetch('/api/agents', { headers: { 'X-Payment-Tier': 'free' } })
      .then(r => { if (!r.ok) throw new Error('API error'); return r.json(); })
      .then((d: AgentsResponse) => { setData(d); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, []);
  if (loading) return <main className="min-h-screen bg-[#080808] flex items-center justify-center"><p className="font-mono text-sm text-[#555]">fetching agents...</p></main>;
  if (error) return <main className="min-h-screen bg-[#080808] flex items-center justify-center"><p className="font-mono text-sm text-[#ff4444]">error: {error}</p></main>;
  const agents = data?.agents ?? [];
  return (
    <main className="min-h-screen bg-[#080808] text-[#e8e8e8]">
      <div className="max-w-5xl mx-auto px-6 pt-16 pb-8">
        <h1 className="font-mono text-2xl font-semibold mb-2">agent registry</h1>
        <p className="text-[#b0b0b0] text-sm">{agents.length} active agents — verified on-chain</p>
      </div>
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(agent => (
            <a key={agent.id} href={'/app/agents/' + agent.id} className="block border border-[#1e1e1e] rounded-lg p-5 bg-[#0d0d0d] hover:border-[#00ff88] transition-all">
              <div className="flex items-center gap-2 mb-3">
                <span className={'w-2 h-2 rounded-full ' + (agent.status==='active'?'bg-[#00ff88]':agent.status==='paused'?'bg-[#ffcc00]':'bg-[#555]')} />
                <span className="font-mono text-sm font-medium">{agent.name}</span>
                {agent.verification==='on-chain' && <span className="ml-auto text-[10px] font-mono text-[#4488ff] border border-[rgba(68,136,255,0.3)] rounded px-1.5 py-0.5">verified</span>}
              </div>
              <p className="text-[#777] text-xs mb-3">{agent.role}</p>
              <div className="flex gap-4">
                <div><div className="font-mono text-base font-semibold text-[#00ff88]">{agent.builds}</div><div className="text-[10px] text-[#555] uppercase">builds</div></div>
                <div><div className="font-mono text-base font-semibold text-[#00ff88]">{agent.commits}</div><div className="text-[10px] text-[#555] uppercase">commits</div></div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}