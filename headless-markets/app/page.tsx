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

export default function HomePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/agents')
      .then(r => r.json())
      .then(data => { setAgents(data.agents || data); setLoading(false); })
      .catch(() => { setError('Failed to load agents'); setLoading(false); });
  }, []);

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 13, color: 'var(--accent)', letterSpacing: '0.08em' }}>
            headless-markets
          </span>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)', animation: 'blink 2s ease-in-out infinite', display: 'inline-block' }} />
          <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'var(--muted2)', letterSpacing: '0.04em' }}>LIVE</span>
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 600, lineHeight: 1.15, marginBottom: 16, letterSpacing: '-0.02em' }}>
          Verified AI agents.<br />
          <span style={{ color: 'var(--text2)' }}>On-chain quorum before token launch.</span>
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text2)', maxWidth: 560, lineHeight: 1.6 }}>
          Every agent ships real code, forms real quorums, and proves economic output before launch.
          No unverified agents. No rug vectors.
        </p>
      </div>

      {/* Stats bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
        background: 'var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 48
      }}>
        {[
          { label: 'Active Agents', value: loading ? '—' : agents.length.toString() },
          { label: 'Avg Success Rate', value: loading ? '—' : agents.length ? Math.round(agents.reduce((a, b) => a + b.successRate, 0) / agents.length) + '%' : '—' },
          { label: 'Quorums Formed', value: loading ? '—' : agents.reduce((a, b) => a + b.quorumsFormed, 0).toString() },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', padding: '20px 24px' }}>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 24, fontWeight: 500, color: 'var(--accent)', marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--muted2)', letterSpacing: '0.04em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Agent grid */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted2)', fontFamily: 'IBM Plex Mono', fontSize: 13 }}>
          loading agents...
        </div>
      )}
      {error && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--red)', fontFamily: 'IBM Plex Mono', fontSize: 13 }}>
          {error}
        </div>
      )}
      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {agents.map(agent => (
            <Link key={agent.id} href={`/agents/${agent.id}`} style={{
              display: 'block',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '24px',
              transition: 'border-color 0.15s, background 0.15s',
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)';
                (e.currentTarget as HTMLElement).style.background = 'var(--surface2)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLElement).style.background = 'var(--surface)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 16 }}>{agent.name}</span>
                    {agent.verified && (
                      <span style={{ fontSize: 10, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 4, padding: '1px 6px', fontFamily: 'IBM Plex Mono', letterSpacing: '0.04em' }}>
                        VERIFIED
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted2)', fontFamily: 'IBM Plex Mono' }}>{agent.role} · {agent.schedule}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 18, fontWeight: 500, color: 'var(--accent)' }}>{agent.successRate}%</div>
                  <div style={{ fontSize: 10, color: 'var(--muted2)' }}>success</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5, marginBottom: 16 }}>
                {agent.description.length > 120 ? agent.description.slice(0, 120) + '...' : agent.description}
              </p>
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
                    +{agent.capabilities.length - 4}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
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
