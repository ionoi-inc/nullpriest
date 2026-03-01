'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://nullpriest.xyz';

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
        const res = await fetch(`${API_BASE}/api/agents/${id}`, { signal: controller.signal });
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
        <div className="max-w-5xl mx-auto px-6 py-4">
          <Link href="/app/agents" className="inline-flex items-center gap-2 text-sm text-[#b0b0b0] hover:text-[#00ff88] transition mb-4">
            ← Back to Registry
          </Link>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold">{agent.name}</h1>
              {agent.verified && (
                <span className="px-3 py-1 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded text-[#00ff88] text-sm font-mono">
                  ✓ verified
                </span>
              )}
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${successColor}`}>{agent.successRate}%</div>
              <div className="text-xs text-[#777] mt-1">success rate</div>
            </div>
          </div>

          <p className="text-[#b0b0b0] text-lg leading-relaxed mb-6">{agent.description}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-4">
              <div className="text-2xl font-semibold text-[#4488ff]">{agent.quorumsFormed}</div>
              <div className="text-xs text-[#777] mt-1">quorums formed</div>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-4">
              <div className="text-2xl font-semibold text-[#aa88ff]">{agent.tokensLaunched}</div>
              <div className="text-xs text-[#777] mt-1">tokens launched</div>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-4">
              <div className="text-2xl font-semibold text-[#00ff88]">{agent.totalBuilds ?? 0}</div>
              <div className="text-xs text-[#777] mt-1">total builds</div>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-4">
              <div className="text-sm font-semibold text-[#e8e8e8]">{agent.role ?? 'Agent'}</div>
              <div className="text-xs text-[#777] mt-1">role</div>
            </div>
          </div>

          {agent.schedule && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-4 mb-6">
              <div className="text-xs text-[#777] mb-1">Schedule</div>
              <div className="font-mono text-sm text-[#00ff88]">{agent.schedule}</div>
            </div>
          )}

          {agent.onChainAddress && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-4 mb-6">
              <div className="text-xs text-[#777] mb-1">On-Chain Address</div>
              <div className="font-mono text-sm text-[#4488ff] break-all">{agent.onChainAddress}</div>
            </div>
          )}

          <div>
            <div className="text-xs text-[#777] mb-2">Capabilities</div>
            <div className="flex flex-wrap gap-2">
              {agent.capabilities.map((cap) => (
                <span key={cap} className="px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-sm text-[#b0b0b0] font-mono">
                  {cap}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-hidden">
          <div className="border-b border-[#1e1e1e] flex">
            <button onClick={() => setActiveTab('overview')} className={`px-6 py-3 text-sm font-mono ${activeTab === 'overview' ? 'bg-[#1a1a1a] text-[#00ff88] border-b-2 border-[#00ff88]' : 'text-[#777] hover:text-[#b0b0b0]'}`}>
              Overview
            </button>
            <button onClick={() => setActiveTab('builds')} className={`px-6 py-3 text-sm font-mono ${activeTab === 'builds' ? 'bg-[#1a1a1a] text-[#00ff88] border-b-2 border-[#00ff88]' : 'text-[#777] hover:text-[#b0b0b0]'}`}>
              Build Log ({agent.buildLog?.length ?? 0})
            </button>
            <button onClick={() => setActiveTab('commits')} className={`px-6 py-3 text-sm font-mono ${activeTab === 'commits' ? 'bg-[#1a1a1a] text-[#00ff88] border-b-2 border-[#00ff88]' : 'text-[#777] hover:text-[#b0b0b0]'}`}>
              Recent Commits ({agent.recentCommits?.length ?? 0})
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-[#777] mb-1">Joined</div>
                  <div className="font-mono text-[#e8e8e8]">{new Date(agent.joinedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
                {agent.lastActive && (
                  <div>
                    <div className="text-sm text-[#777] mb-1">Last Active</div>
                    <div className="font-mono text-[#e8e8e8]">{new Date(agent.lastActive).toLocaleString()}</div>
                  </div>
                )}
                {agent.openIssues && agent.openIssues.length > 0 && (
                  <div>
                    <div className="text-sm text-[#777] mb-2">Open Issues</div>
                    <div className="space-y-2">
                      {agent.openIssues.map((issue) => (
                        <div key={issue.number} className="flex items-center gap-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded p-3">
                          <span className="text-xs font-mono text-[#777]">#{issue.number}</span>
                          <span className="text-sm text-[#e8e8e8]">{issue.title}</span>
                          {issue.url && (
                            <a href={issue.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-[#4488ff] hover:text-[#00ff88]">
                              view →
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'builds' && (
              <div className="space-y-3">
                {agent.buildLog && agent.buildLog.length > 0 ? (
                  agent.buildLog.map((entry, idx) => (
                    <div key={idx} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-mono ${
                            entry.result === 'success' ? 'bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30' :
                            entry.result === 'failure' ? 'bg-[#ff4444]/10 text-[#ff4444] border border-[#ff4444]/30' :
                            'bg-[#777]/10 text-[#777] border border-[#777]/30'
                          }`}>
                            {entry.result}
                          </span>
                          <span className="text-sm font-mono text-[#b0b0b0]">{entry.issue}</span>
                        </div>
                        <span className="text-xs text-[#555] font-mono">{new Date(entry.date).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-[#777]">{entry.detail}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-[#555] font-mono text-sm">No build history</div>
                )}
              </div>
            )}

            {activeTab === 'commits' && (
              <div className="space-y-3">
                {agent.recentCommits && agent.recentCommits.length > 0 ? (
                  agent.recentCommits.map((commit) => (
                    <div key={commit.sha} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs text-[#4488ff]">{commit.sha.slice(0, 7)}</span>
                          {commit.url && (
                            <a href={commit.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#4488ff] hover:text-[#00ff88]">
                              view →
                            </a>
                          )}
                        </div>
                        <span className="text-xs text-[#555] font-mono">{new Date(commit.date).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-[#e8e8e8]">{commit.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-[#555] font-mono text-sm">No recent commits</div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}