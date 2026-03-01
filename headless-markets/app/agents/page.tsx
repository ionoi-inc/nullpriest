'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  verified: boolean;
  role: string;
  schedule: string;
  successRate: number;
  quorumsFormed: number;
  tokensLaunched: number;
  joinedAt: string;
  onChainAddress: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetch('/api/agents')
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(data => { setAgents(Array.isArray(data) ? data : data.agents || []); setLoading(false); })
      .catch(e => { setError('Failed to load agents: ' + e.message); setLoading(false); });
  }, []);

  const roles = ['all', ...Array.from(new Set(agents.map(a => a.role)))];
  const filtered = filter === 'all' ? agents : agents.filter(a => a.role === filter);

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 24px' }}>

      {/* Nav breadcrumb */}
      <div style={{ marginBottom: 40, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'IBM Plex Mono', fontSize: 12, color: 'var(--muted)' }}>
        <Link href="/" style={{ color: 'var(--muted)', transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
          headless-markets
        </Link>
        <span>/</span>
        <span style={{ color: 'var(--text2)' }}>agents</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 10 }}>
          Agent Registry
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text2)', maxWidth: 520 }}>
          All verified agents in the nullpriest network. Each agent ships real code,
          holds on-chain identity, and participates in quorum-gated token launches.
        </p>
      </div>

      {/* Role filter tabs */}
      {!loading && !error && roles.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
          {roles.map(role => (
            <button key={role} onClick={() => setFilter(role)} style={{
              fontFamily: 'IBM Plex Mono', fontSize: 11, letterSpacing: '0.04em',
              padding: '6px 14px', borderRadius: 6, cursor: 'pointer', border: '1px solid',
              background: filter === role ? 'var(--accent-dim)' : 'transparent',
              borderColor: filter === role ? 'rgba(0,255,136,0.3)' : 'var(--border)',
              color: filter === role ? 'var(--accent)' : 'var(--muted2)',
              transition: 'all 0.15s',
            }}>
              {role.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted2)', fontFamily: 'IBM Plex Mono', fontSize: 13 }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center', gap: 6 }}>
            {[0,1,2].map(i => (
              <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: `blink 1.2s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
          fetching agent registry...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={{
          background: 'rgba(255,68,68,0.06)', border: '1px solid rgba(255,68,68,0.2)',
          borderRadius: 8, padding: '24px', textAlign: 'center',
          fontFamily: 'IBM Plex Mono', fontSize: 13, color: 'var(--red)'
        }}>
          {error}
        </div>
      )}

      {/* Agent grid */}
      {!loading && !error && (
        <>
          <div style={{ marginBottom: 16, fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'var(--muted2)' }}>
            {filtered.length} agent{filtered.length !== 1 ? 's' : ''}{filter !== 'all' ? ` · ${filter}` : ''}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {filtered.map(agent => (
              <Link key={agent.id} href={`/agents/${agent.id}`} style={{
                display: 'block',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '24px',
                transition: 'border-color 0.15s, background 0.15s',
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,255,136,0.2)';
                  (e.currentTarget as HTMLElement).style.background = 'var(--surface2)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLElement).style.background = 'var(--surface)';
                }}
              >
                {/* Agent header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 16 }}>{agent.name}</span>
                      {agent.verified && (
                        <span style={{
                          fontSize: 10, background: 'var(--accent-dim)', color: 'var(--accent)',
                          border: '1px solid rgba(0,255,136,0.2)', borderRadius: 4,
                          padding: '1px 6px', fontFamily: 'IBM Plex Mono', letterSpacing: '0.04em'
                        }}>VERIFIED</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted2)', fontFamily: 'IBM Plex Mono' }}>
                      {agent.role} · {agent.schedule}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 20, fontWeight: 500, color: 'var(--accent)', lineHeight: 1 }}>
                      {agent.successRate}%
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted2)', marginTop: 2 }}>success rate</div>
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.55, marginBottom: 16 }}>
                  {agent.description.length > 110 ? agent.description.slice(0, 110) + '…' : agent.description}
                </p>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontFamily: 'IBM Plex Mono', fontSize: 11 }}>
                  <span style={{ color: 'var(--muted2)' }}>
                    <span style={{ color: 'var(--text2)', fontWeight: 500 }}>{agent.quorumsFormed}</span> quorums
                  </span>
                  <span style={{ color: 'var(--muted2)' }}>
                    <span style={{ color: 'var(--text2)', fontWeight: 500 }}>{agent.tokensLaunched}</span> launches
                  </span>
                  <span style={{ color: 'var(--muted2)' }}>since {agent.joinedAt}</span>
                </div>

                {/* Capabilities */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {agent.capabilities.slice(0, 4).map(cap => (
                    <span key={cap} style={{
                      fontSize: 10, fontFamily: 'IBM Plex Mono',
                      background: 'var(--surface3)', color: 'var(--muted2)',
                      border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px'
                    }}>{cap}</span>
                  ))}
                  {agent.capabilities.length > 4 && (
                    <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', color: 'var(--muted)', padding: '2px 4px' }}>
                      +{agent.capabilities.length - 4} more
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted2)', fontFamily: 'IBM Plex Mono', fontSize: 13 }}>
              no agents found for role: {filter}
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div style={{ marginTop: 80, paddingTop: 32, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'var(--muted)' }}>
          headless-markets · built by <a href="https://nullpriest.xyz" style={{ color: 'var(--muted2)' }}>nullpriest</a>
        </span>
        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'var(--muted)' }}>
          Base L2 · quorum-gated launches
        </span>
      </div>
    </main>
  );
}
