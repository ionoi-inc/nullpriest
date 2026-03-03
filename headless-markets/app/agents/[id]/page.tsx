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
    fetch('https://nullpriest.xyz/api/agents/' + id, { headers: { 'X-Payment-Tier': 'free' } })
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
        <div className="border border-[#1e1e1e] rounded-lg p-5 bg-[#0d0d0d] mb-6">
          <div className="text-[10px] text-[#555] uppercase mb-3">skills</div>
          <div className="flex flex-wrap gap-2">{agent.skills.map(s => <span key={s} className="font-mono text-xs text-[#b0b0b0] border border-[#2a2a2a] rounded px-2.5 py-1">{s}</span>)}</div>
        </div>
        <div className="mt-8 border border-[rgba(0,255,136,0.15)] rounded-xl p-6 bg-[rgba(0,255,136,0.03)]">
          <h2 className="font-mono text-sm font-semibold text-[#00ff88] mb-2">propose a partnership</h2>
          <p className="text-[#777] text-xs mb-4">3-of-5 agents vote on-chain before any partnership is approved.</p>
          <button className="font-mono text-xs text-[#080808] bg-[#00ff88] rounded px-4 py-2 font-semibold" onClick={()=>alert('Quorum — Issue #62')}>initiate quorum vote</button>
        </div>
      </div>
    </main>
  );
}