// Issue #61 — Add agent profile page at /app/agents/[id]
// Builder A — Build #75 — 2026-03-03
// Route: headless-markets/app/agents/[id]/page.tsx
// Fetches single agent from server.js /api/agents/:id
// Renders full profile: stats, stack, capabilities, build history, wallet
// x402 free-tier header included. Back-nav to /app/agents.

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface AgentBuild {
  number: number;
  timestamp: string;
  issue: string;
  status: 'success' | 'failure' | 'skipped';
  message?: string;
}

interface Agent {
  id: string;
  name: string;
  slug: string;
  role: string;
  status: 'active' | 'paused' | 'building';
  builds?: number;
  lastBuild?: string;
  stack?: string[];
  description?: string;
  verified?: boolean;
  buildLog?: AgentBuild[];
  capabilities?: string[];
  assignedIssues?: string[];
  wallet?: string;
  network?: string;
}

const STATUS_COLOR: Record<string, string> = {
  active: '#00ff88',
  building: '#ffcc00',
  paused: '#555',
};

const BUILD_STATUS_COLOR: Record<string, string> = {
  success: '#00ff88',
  failure: '#ff4444',
  skipped: '#555',
};

export default function AgentProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function fetchAgent() {
      try {
        const res = await fetch(`/api/agents/${id}`, {
          headers: { 'x-payment-tier': 'free' },
        });
        if (res.status === 404) {
          setError('agent not found');
          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data: Agent = await res.json();
        setAgent(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'fetch failed');
      } finally {
        setLoading(false);
      }
    }
    fetchAgent();
  }, [id]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '40px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: '#555' }}>
        loading agent profile...
      </div>
    );
  }

  // ── Error / Not found ────────────────────────────────────────────────────
  if (error || !agent) {
    return (
      <div style={{ padding: '40px' }}>
        <a href="/app/agents" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#555', textDecoration: 'none' }}>
          ← agent registry
        </a>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: '#ff4444', marginTop: '24px' }}>
          {error ?? 'agent not found'}
        </p>
      </div>
    );
  }

  // ── Profile ──────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>

      {/* Back nav */}
      <a
        href="/app/agents"
        style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '11px',
          color: '#555',
          textDecoration: 'none',
          display: 'inline-block',
          marginBottom: '32px',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#00ff88')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#555')}
      >
        ← agent registry
      </a>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <h1 style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '22px',
            fontWeight: 500,
            color: '#e8e8e8',
            margin: 0,
          }}>
            {agent.name}
          </h1>
          {agent.verified && (
            <span style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '10px',
              color: '#4488ff',
              background: 'rgba(68,136,255,0.08)',
              border: '1px solid rgba(68,136,255,0.25)',
              borderRadius: '20px',
              padding: '2px 10px',
              letterSpacing: '0.04em',
            }}>
              VERIFIED
            </span>
          )}
          <span style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            color: STATUS_COLOR[agent.status] ?? '#555',
            letterSpacing: '0.05em',
          }}>
            {agent.status}
          </span>
        </div>
        <p style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '12px',
          color: '#777',
          margin: '0 0 12px 0',
        }}>
          {agent.role}
        </p>
        {agent.description && (
          <p style={{ fontSize: '14px', color: '#b0b0b0', margin: 0, lineHeight: '1.6' }}>
            {agent.description}
          </p>
        )}
      </div>

      {/* Stats row */}
      <div style={{
        display: 'flex',
        gap: '40px',
        padding: '20px 24px',
        background: '#0d0d0d',
        border: '1px solid #1e1e1e',
        borderRadius: '6px',
        marginBottom: '32px',
        fontFamily: 'IBM Plex Mono, monospace',
      }}>
        {agent.builds != null && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#00ff88', lineHeight: '1.1' }}>{agent.builds}</div>
            <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.1em', marginTop: '4px' }}>BUILDS</div>
          </div>
        )}
        {agent.lastBuild && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#e8e8e8', lineHeight: '1.4' }}>{agent.lastBuild}</div>
            <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.1em', marginTop: '4px' }}>LAST BUILD</div>
          </div>
        )}
        {agent.assignedIssues != null && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#00ff88', lineHeight: '1.1' }}>{agent.assignedIssues.length}</div>
            <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.1em', marginTop: '4px' }}>OPEN ISSUES</div>
          </div>
        )}
        {agent.network && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#4488ff', lineHeight: '1.4' }}>{agent.network}</div>
            <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.1em', marginTop: '4px' }}>NETWORK</div>
          </div>
        )}
      </div>

      {/* Stack */}
      {agent.stack && agent.stack.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#555', letterSpacing: '0.1em', margin: '0 0 12px 0' }}>
            STACK
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {agent.stack.map((s) => (
              <span key={s} style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '11px',
                color: '#00ff88',
                background: 'rgba(0,255,136,0.07)',
                border: '1px solid rgba(0,255,136,0.15)',
                borderRadius: '3px',
                padding: '4px 10px',
              }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Capabilities */}
      {agent.capabilities && agent.capabilities.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#555', letterSpacing: '0.1em', margin: '0 0 12px 0' }}>
            CAPABILITIES
          </h3>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {agent.capabilities.map((cap, i) => (
              <li key={i} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: '#b0b0b0' }}>
                <span style={{ color: '#00ff88', marginRight: '8px' }}>→</span>{cap}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Assigned issues */}
      {agent.assignedIssues && agent.assignedIssues.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#555', letterSpacing: '0.1em', margin: '0 0 12px 0' }}>
            ASSIGNED ISSUES
          </h3>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {agent.assignedIssues.map((issue, i) => (
              <li key={i} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: '#777' }}>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Wallet */}
      {agent.wallet && (
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#555', letterSpacing: '0.1em', margin: '0 0 8px 0' }}>
            ON-CHAIN WALLET
          </h3>
          <span style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            color: '#4488ff',
            wordBreak: 'break-all',
          }}>
            {agent.wallet}
          </span>
        </div>
      )}

      {/* Build history */}
      {agent.buildLog && agent.buildLog.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#555', letterSpacing: '0.1em', margin: '0 0 12px 0' }}>
            BUILD HISTORY
          </h3>
          <div style={{
            background: '#0d0d0d',
            border: '1px solid #1e1e1e',
            borderRadius: '6px',
            overflow: 'hidden',
          }}>
            {agent.buildLog.slice(0, 10).map((build, i) => (
              <div
                key={build.number}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '48px 12px 1fr auto',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 16px',
                  borderBottom: i < Math.min(agent.buildLog!.length, 10) - 1 ? '1px solid #1a1a1a' : 'none',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '11px',
                }}
              >
                <span style={{ color: '#555' }}>#{build.number}</span>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: BUILD_STATUS_COLOR[build.status] ?? '#555',
                  display: 'inline-block',
                  boxShadow: build.status === 'success' ? '0 0 6px rgba(0,255,136,0.4)' : 'none',
                }} />
                <span style={{ color: '#b0b0b0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {build.issue}
                  {build.message && <span style={{ color: '#555', marginLeft: '8px' }}>— {build.message}</span>}
                </span>
                <span style={{ color: '#555', whiteSpace: 'nowrap' }}>{build.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}