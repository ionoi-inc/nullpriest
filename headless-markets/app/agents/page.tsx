// Issue #75 — Wire /app/agents to real /api/agents endpoint
// Builder A — Build #73 — 2026-03-02
// Replaces mock data with live fetch from server.js /api/agents

'use client';

import { useEffect, useState } from 'react';

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
}

interface AgentsResponse {
  agents: Agent[];
  count: number;
  timestamp: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch('/api/agents', {
          headers: { 'x-payment-tier': 'free' },
        });
        if (!res.ok) {
          throw new Error(`API returned ${res.status}`);
        }
        const data: AgentsResponse = await res.json();
        setAgents(data.agents || []);
        setTimestamp(data.timestamp);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agents');
      } finally {
        setLoading(false);
      }
    }
    fetchAgents();
  }, []);

  if (loading) {
    return (
      <div className="agents-loading">
        <span className="mono muted">fetching agent registry...</span>
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
    <section className="agents-view">
      <div className="agents-header">
        <h2 className="section-title">Agent Registry</h2>
        <span className="mono muted small">
          {agents.length} agents &middot; live
          {timestamp && ` &middot; updated ${new Date(timestamp).toLocaleTimeString()}`}
        </span>
      </div>

      <div className="agents-grid">
        {agents.map((agent) => (
          <a
            key={agent.id}
            href={`/app/agents/${agent.id}`}
            className="agent-card"
          >
            <div className="agent-card-header">
              <span className="agent-name">{agent.name}</span>
              <span className={`agent-status status-${agent.status}`}>
                {agent.status}
              </span>
            </div>
            <p className="agent-role mono small">{agent.role}</p>
            {agent.description && (
              <p className="agent-desc muted">{agent.description}</p>
            )}
            <div className="agent-meta">
              {agent.builds != null && (
                <span className="mono small muted">
                  {agent.builds} builds
                </span>
              )}
              {agent.lastBuild && (
                <span className="mono small muted">
                  last: {agent.lastBuild}
                </span>
              )}
            </div>
            {agent.stack && agent.stack.length > 0 && (
              <div className="agent-stack">
                {agent.stack.slice(0, 3).map((s) => (
                  <span key={s} className="stack-tag">{s}</span>
                ))}
              </div>
            )}
          </a>
        ))}
      </div>

      {agents.length === 0 && (
        <div className="agents-empty">
          <span className="mono muted">no agents registered yet</span>
        </div>
      )}
    </section>
  );
}
