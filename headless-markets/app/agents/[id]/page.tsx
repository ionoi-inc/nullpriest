'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
interface Agent { id: string; name: string; role: string; status: 'active'|'paused'|'offline'; cadence: string; builds: number; commits: number; verification: string; skills: string[]; output: string; }
export default function AgentProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [agent, setAgent] = useState<Agent|null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  useEffect(() => {
    if (!id) return;
    fetch('/api/agents/' + id, { headers: { 'X-Payment-Tier': 'free' } })
      .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
      .then((d: Agent) => { setAgent(d); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, [id]);
  if (loading) return <main className="min-h-screen bg-[#080808] flex items-center justify-center"><p className="font-mono text-sm text-[#555]">loading...</p></main>;
  if (error||!agent) return <main className="min-h-screen bg-[#080808] flex items-center justify-center"><div><p className="font-mono text-sm text-[#ff4444] mb-4">{error??'not found'}</p><a href="/app/agents" className="font-mono text-xs text-[#4488ff]">back</a></div></main>;
  const sc = agent.status==='active'?'#00ff88':agent.status==='paused'?'#ffcc00':'#555';
  return (
    <main className="min-h-screen bg-[#080808] text-[#e8e8e8]">
      <div className="max-w-3xl mx-auto px-6 pt-12 pb-20">
        <a href="/app/agents" className="font-mono text-xs text-[#555] mb-8 inline-block">back to registry</a>
        <div className="border border-[#1e1e1e] rounded-xl p-8 bg-[#0d0d0d] mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full" style={{background:sc}} />
              <h1 className="font-mono text-2xl font-semibold">{agent.name}</h1>
            </div>
            {agent.verification==='on-chain' && <span className="font-mono text-xs text-[#4488ff] border border-[rgba(68,136,255,0.3)] rounded-full px-3 py-1">verified on-chain</span>}
          </div>
          <p className="text-[#777] text-sm mb-6">{agent.role}</p>
          <div className="grid grid-cols-3 gap-6 border-t border-[#1e1e1e] pt-6">
            <div><div className="font-mono text-3xl font-semibold text-[#00ff88] mb-1">{agent.builds}</div><div className="text-[11px] text-[#555] uppercase">builds</div></div>
            <div><div className="font-mono text-3xl font-semibold text-[#00ff88] mb-1">{agent.commits}</div><div className="text-[11px] text-[#555] uppercase">commits</div></div>
            <div><div className="font-mono text-base font-medium mb-1" style={{color:sc}}>{agent.status}</div><div className="text-[11px] text-[#555] uppercase">status</div></div>
          </div>
        </div>
        <div className="border border-[#1e1e1e] rounded-xl p-8 bg-[#0d0d0d] mb-6">
          <h2 className="font-mono text-sm font-semibold uppercase text-[#555] mb-4">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {agent.skills.map(s => <span key={s} className="font-mono text-xs bg-[#141414] border border-[#1e1e1e] rounded px-3 py-1.5">{s}</span>)}
          </div>
        </div>
        <div className="border border-[#1e1e1e] rounded-xl p-8 bg-[#0d0d0d]">
          <h2 className="font-mono text-sm font-semibold uppercase text-[#555] mb-4">Latest Output</h2>
          <p className="font-mono text-sm text-[#b0b0b0] leading-relaxed whitespace-pre-wrap">{agent.output}</p>
        </div>
      </div>
    </main>
  );
}