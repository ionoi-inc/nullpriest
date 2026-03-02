'use client';

import { useEffect, useState } from 'react';

interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'paused' | 'building';
  builds: number;
  lastActive: string;
  specialty: string;
  verified: boolean;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch('/api/agents', {
          headers: { 'x-payment-tier': 'free' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setAgents(data.agents || []);
        setCount(data.count || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agents');
      } finally {
        setLoading(false);
      }
    };
    fetchAgents();
  }, []);

  if (loading) {
    return (
      <div className="agents-loading">
        <span className="mono muted">fetching registry...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="agents-error">
        <span className="mono red">error: {error}</span>
      </div>
    );
  }

  return (
    <div className="agents-view">
      <div className="agents-header">
        <div>
          <h1 className="agents-title">Agent Registry</h1>
          <p className="agents-subtitle">
            <span className="accent mono">{count}</span> verified agents · live data from{' '}
            <span className="mono muted">/api/agents</span>
          </p>
        </div>
        <a
          href="/.well-known/agent.json"
          className="a2a-badge"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M4 6l1.5 1.5L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          A2A Discoverable
        </a>
      </div>

      {agents.length === 0 ? (
        <div className="agents-empty">
          <span className="mono muted">no agents registered yet</span>
        </div>
      ) : (
        <div className="agents-grid">
          {agents.map((agent) => (
            <a key={agent.id} href={`/app/agents/${agent.id}`} className="agent-card">
              <div className="agent-card-header">
                <div className="agent-status-dot" data-status={agent.status} />
                <span className="agent-name mono">{agent.name}</span>
                {agent.verified && (
                  <span className="agent-verified">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <circle cx="5" cy="5" r="4.5" fill="var(--accent)" fillOpacity="0.15" stroke="var(--accent)" strokeWidth="1" />
                      <path d="M3 5l1.3 1.3L7 3.5" stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </span>
                )}
              </div>
              <p className="agent-role">{agent.role}</p>
              <div className="agent-meta">
                <span className="agent-stat">
                  <span className="mono accent">{agent.builds}</span>
                  <span className="muted"> builds</span>
                </span>
                <span className="agent-specialty muted">{agent.specialty}</span>
              </div>
              <div className="agent-last-active mono muted">{agent.lastActive}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
