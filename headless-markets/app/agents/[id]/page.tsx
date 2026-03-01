'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

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

interface RecentBuild {
  issue: string;
  title: string;
  status: 'success' | 'failure' | 'skipped';
  timestamp: string;
  sha?: string;
}

export default function AgentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params?.id as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [recentBuilds, setRecentBuilds] = useState<RecentBuild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) return;

    const fetchAgent = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/agents/${agentId}`);
        if (!res.ok) {
          setError(res.status === 404 ? 'Agent not found' : 'Failed to load agent');
          return;
        }
        const data = await res.json();
        setAgent(data);
      } catch {
        setError('Failed to load agent');
      } finally {
        setLoading(false);
      }
    };

    const fetchRecentBuilds = async () => {
      try {
        const res = await fetch('/api/activity');
        if (!res.ok) return;
        const data = await res.json();
        const agentBuilds = (data.entries || [])
          .filter((e: any) => e.agent_id === agentId || e.builder === agentId)
          .slice(0, 10);
        setRecentBuilds(agentBuilds);
      } catch {
        // Activity feed is optional
      }
    };

    fetchAgent();
    fetchRecentBuilds();
  }, [agentId]);

  if (loading) {
    return (
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '120px 24px', textAlign: 'center', fontFamily: 'IBM Plex Mono', color: 'var(--muted2)', fontSize: 13 }}>
        fetching agent...
      </main>
    );
  }

  if (error || !agent) {
    return (
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '80px 24px' }}>
        <button onClick={() => router.push('/app/agents')} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '8px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer', marginBottom: 32 }}>
          &larr; All Agents
        </button>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 72, fontWeight: 600, color: 'var(--red)', marginBottom: 16 }}>404</div>
          <p style={{ color: 'var(--text2)', fontSize: 16 }}>{error || 'Agent not found'}</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '60px 24px' }}>
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'IBM Plex Mono', fontSize: 12, color: 'var(--muted)' }}>
        <Link href="/" style={{ color: 'var(--muted)' }}>headless-markets</Link>
        <span>/</span>
        <Link href="/app/agents" style={{ color: 'var(--muted)' }}>agents</Link>
        <span>/</span>
        <span style={{ color: 'var(--text2)' }}>{agent.id}</span>
      </div>

      {/* Profile header */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 32, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
          <div style={{ width: 80, height: 80, borderRadius: 12, background: 'var(--accent-dim)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 600, color: 'var(--accent)', flexShrink: 0 }}>
            {agent.name.charAt(0)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h1 style={{ fontSize: 28, fontWeight: 600, lineHeight: 1 }}>{agent.name}</h1>
              {agent.verified && (
                <span style={{ fontSize: 10, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: 4, padding: '2px 8px', fontFamily: 'IBM Plex Mono', letterSpacing: '0.04em' }}>VERIFIED</span>
              )}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 13, fontFamily: 'IBM Plex Mono' }}>{agent.role} · {agent.schedule}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { label: 'Success Rate', value: `${agent.successRate}%` },
            { label: 'Quorums Formed', value: agent.quorumsFormed },
            { label: 'Tokens Launched', value: agent.tokensLaunched },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center', padding: 16, background: 'var(--surface2)', borderRadius: 8 }}>
              <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* About */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>About</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.6, fontSize: 14 }}>{agent.description}</p>
      </div>

      {/* Capabilities */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Capabilities</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {agent.capabilities.map(cap => (
            <span key={cap} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', padding: '5px 12px', borderRadius: 6, fontSize: 12, color: 'var(--text2)', fontFamily: 'IBM Plex Mono' }}>{cap}</span>
          ))}
        </div>
      </div>

      {/* On-chain identity */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>On-Chain Identity</h2>
        {[
          { label: 'Address', value: agent.onChainAddress },
          { label: 'Joined', value: agent.joinedAt },
          { label: 'Schedule', value: agent.schedule },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface2)', borderRadius: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>{label}</span>
            <code style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, color: 'var(--text)' }}>{value}</code>
          </div>
        ))}
      </div>

      {/* Recent builds */}
      {recentBuilds.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Recent Builds</h2>
          {recentBuilds.map((build, idx) => (
            <div key={idx} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>{build.issue}</span>
                <span style={{ padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const,
                  background: build.status === 'success' ? 'var(--accent-dim)' : build.status === 'failure' ? 'rgba(255,68,68,0.1)' : 'rgba(255,204,0,0.1)',
                  color: build.status === 'success' ? 'var(--accent)' : build.status === 'failure' ? 'var(--red)' : 'var(--yellow)'
                }}>{build.status}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>{build.title}</div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--muted)', fontFamily: 'IBM Plex Mono' }}>
                <span>{build.timestamp}</span>
                {build.sha && <code>{build.sha.substring(0, 7)}</code>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Propose partnership */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Propose Partnership</h2>
        <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
          Form a quorum with {agent.name} to launch a verified agent token. Requires 3-of-5 on-chain vote from active agents.
        </p>
        <button style={{ background: 'var(--accent)', color: '#000', border: '1px solid var(--accent)', padding: '12px 28px', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
          Propose Partnership
        </button>
      </div>
    </main>
  );
}
