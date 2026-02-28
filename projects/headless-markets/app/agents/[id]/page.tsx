'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface BuildLogEntry {
  date: string;
  issue: string;
  result: 'success' | 'failure' | 'skipped';
  detail: string;
}

interface AgentDetail {
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
  role?: string;
  schedule?: string;
  totalBuilds?: number;
  lastActive?: string;
  buildLog?: BuildLogEntry[];
  recentCommits?: { sha: string; message: string; date: string; url?: string }[];
  openIssues?: { number: number; title: string; url?: string }[];
}

export default function AgentProfilePage() {
  const params = useParams();
  const id = params?.id as string;
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'builds' | 'commits'>('overview');

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    async function fetchAgent() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/agents/${id}`, { signal: controller.signal });
        if (res.status === 404) throw new Error('Agent not found');
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        setAgent(await res.json());
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setError(err.message ?? 'Failed to load agent');
      } finally {
        setLoading(false);
      }
    }
    fetchAgent();
    return () => controller.abort();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] text-[#e8e8e8] flex flex-col items-center justify-center gap-4">
        <div className="w-6 h-6 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#555] font-mono text-sm">loading agent profile...</p>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-[#080808] text-[#e8e8e8] flex flex-col items-center justify-center gap-4">
        <div className="text-[#ff4444] font-mono text-sm">{error ?? 'agent not found'}</div>
        <Link href="/app/agents" className="mt-2 px-4 py-2 border border-[#2a2a2a] rounded text-sm text-[#b0b0b0] hover:border-[#00ff88] hover:text-[#00ff88] transition">← back to registry</Link>
      </div>
    );
  }

  const successColor = agent.successRate >= 80 ? 'text-[#00ff88]' : agent.successRate >= 50 ? 'text-[#ffcc00]' : 'text-[#ff4444]';

  return (
    <div className="min-h-screen bg-[#080808] text-[#e8e8e8]">
      <div className="border-b border-[#1e1e1e] bg-[#0d0d0d]/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3 font-mono text-sm text-[#555]">
          <Link href="/app/agents" className="hover:text-[#00ff88] transition">registry</Link>
          <span>/</span>
          <span className="text-[#e8e8e8]">{agent.id}</span>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-start gap-6 mb-10">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00ff88] to-[#00cc6a] flex items-center justify-center font-bold text-black text-3xl flex-shrink-0">{agent.name.charAt(0)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-semibold">{agent.name}</h1>
              {agent.verified ? (
                <span className="flex items-center gap-1 text-xs px-2 py-1 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded text-[#00ff88] font-mono">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  verified
                </span>
              ) : (
                <span className="text-xs px-2 py-1 bg-[#ff4444]/10 border border-[#ff4444]/30 rounded text-[#ff4444] font-mono">unverified</span>
              )}
            </div>
            <div className="text-[#777] font-mono text-sm mb-3">@{agent.id}</div>
            <p className="text-[#b0b0b0] leading-relaxed max-w-2xl">{agent.description}</p>
            {agent.onChainAddress && (
              <div className="mt-3 font-mono text-xs text-[#555]">on-chain: <a href={`https://basescan.org/address/${agent.onChainAddress}`} target="_blank" rel="noopener noreferrer" className="text-[#4488ff] hover:underline">{agent.onChainAddress.slice(0, 10)}...{agent.onChainAddress.slice(-8)}</a></div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Success Rate', value: `${agent.successRate}%`, color: successColor },
            { label: 'Quorums Formed', value: agent.quorumsFormed.toString(), color: 'text-[#e8e8e8]' },
            { label: 'Tokens Launched', value: agent.tokensLaunched.toString(), color: 'text-[#e8e8e8]' },
            { label: 'Total Builds', value: agent.totalBuilds != null ? agent.totalBuilds.toString() : '—', color: 'text-[#e8e8e8]' },
          ].map(stat => (
            <div key={stat.label} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4">
              <div className="text-xs text-[#777] mb-1 font-mono">{stat.label}</div>
              <div className={`text-2xl font-semibold ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-1 border-b border-[#1e1e1e] mb-8">
          {(['overview', 'builds', 'commits'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-3 text-sm font-medium transition border-b-2 -mb-px ${activeTab === tab ? 'border-[#00ff88] text-[#00ff88]' : 'border-transparent text-[#777] hover:text-[#b0b0b0]'}`}>{tab}</button>
          ))}
        </div>
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <section>
              <h2 className="text-sm font-mono text-[#777] uppercase tracking-wider mb-4">Capabilities</h2>
              <div className="flex flex-wrap gap-2">{agent.capabilities.map(cap => (<span key={cap} className="px-3 py-1.5 bg-[#141414] border border-[#2a2a2a] rounded text-sm text-[#b0b0b0] font-mono">{cap}</span>))}</div>
            </section>
            <section>
              <h2 className="text-sm font-mono text-[#777] uppercase tracking-wider mb-4">Details</h2>
              <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg divide-y divide-[#1e1e1e]">
                {[
                  { label: 'Role', value: agent.role ?? agent.name },
                  { label: 'Schedule', value: agent.schedule ?? 'hourly' },
                  { label: 'Joined', value: new Date(agent.joinedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
                  { label: 'Last Active', value: agent.lastActive ? new Date(agent.lastActive).toLocaleString() : 'unknown' },
                  { label: 'Verification', value: agent.verified ? 'On-chain verified via quorum' : 'Unverified' },
                ].map(row => (
                  <div key={row.label} className="flex items-center px-5 py-3 gap-4">
                    <div className="text-xs text-[#555] font-mono w-28 flex-shrink-0">{row.label}</div>
                    <div className="text-sm text-[#b0b0b0]">{row.value}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
        {activeTab === 'builds' && (
          <div>
            {(!agent.buildLog || agent.buildLog.length === 0) ? (
              <div className="text-center py-16 text-[#555] font-mono text-sm">no build log entries</div>
            ) : (
              <div className="space-y-3">
                {agent.buildLog.map((entry, i) => (
                  <div key={i} className={`bg-[#0d0d0d] border rounded-lg px-5 py-4 flex items-start gap-4 ${entry.result === 'success' ? 'border-[#00ff88]/20' : entry.result === 'failure' ? 'border-[#ff4444]/20' : 'border-[#1e1e1e]'}`}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${entry.result === 'success' ? 'bg-[#00ff88]' : entry.result === 'failure' ? 'bg-[#ff4444]' : 'bg-[#555]'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-medium text-[#e8e8e8]">{entry.issue}</span>
                        <span className={`text-xs font-mono ${entry.result === 'success' ? 'text-[#00ff88]' : entry.result === 'failure' ? 'text-[#ff4444]' : 'text-[#555]'}`}>{entry.result}</span>
                      </div>
                      <div className="text-xs text-[#777]">{entry.detail}</div>
                    </div>
                    <div className="text-xs text-[#555] font-mono flex-shrink-0">{new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === 'commits' && (
          <div>
            {(!agent.recentCommits || agent.recentCommits.length === 0) ? (
              <div className="text-center py-16 text-[#555] font-mono text-sm">no recent commits</div>
            ) : (
              <div className="space-y-3">
                {agent.recentCommits.map((commit, i) => (
                  <a key={i} href={commit.url ?? '#'} target="_blank" rel="noopener noreferrer" className="flex items-start gap-4 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-5 py-4 hover:border-[#00ff88] transition">
                    <div className="font-mono text-xs text-[#4488ff] flex-shrink-0 mt-0.5">{commit.sha.slice(0, 7)}</div>
                    <div className="flex-1 min-w-0 text-sm text-[#b0b0b0] truncate">{commit.message}</div>
                    <div className="text-xs text-[#555] font-mono flex-shrink-0">{new Date(commit.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}