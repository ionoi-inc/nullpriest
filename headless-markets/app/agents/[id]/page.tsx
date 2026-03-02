// Issue #61 — Add agent profile page at /app/agents/[id]
// Builder A — Build #73 — 2026-03-02
// Fetches single agent from /api/agents/:id, renders full profile

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
  buildLog?: AgentBuild[];
  capabilities?: string[];
  assignedIssues?: string[];
}

export default function AgentProfilePage() {
  const { id } = useParams<{ id: string }>();
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
          return;
        }
        if (!res.ok) {
          throw new Error(`API returned ${res.status}`);
        }
        const data: Agent = await res.json();
        setAgent(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agent');
      } finally {
        setLoading(false);
      }
    }
    fetchAgent();
  }, [id]);

  if (loading) {
    return (
      <div className="profile-loading">
        <span className="mono muted">loading agent profile...</span>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="profile-error">
        <a href="/app/agents" className="mono muted back-link">&larr; agents</a>
        <p className="mono red">{error || 'agent not found'}</p>
      </div>
    );
  }

  return (
    <div className="agent-profile">
      {/* Back nav */}
      <a href="/app/agents" className="mono small muted back-link">
        &larr; agent registry
      </a>

      {/* Header */}
      <div className="profile-header">
        <div className="profile-title-row">
          <h1 className="profile-name">{agent.name}</h1>
          <span className={`agent-status status-${agent.status}`}>
            {agent.status}
          </span>
        </div>
        <p className="profile-role mono">{agent.role}</p>
        {agent.description && (
          <p className="profile-desc">{agent.description}</p>
        )}
      </div>

      {/* Stats row */}
      <div className="profile-stats">
        {agent.builds != null && (
          <div className="stat-block">
            <span className="stat-value accent">{agent.builds}</span>
            <span className="stat-label">BUILDS</span>
          </div>
        )}
        {agent.lastBuild && (
          <div className="stat-block">
            <span className="stat-value">{agent.lastBuild}</span>
            <span className="stat-label">LAST BUILD</span>
          </div>
        )}
        {agent.assignedIssues && (
          <div className="stat-block">
            <span className="stat-value accent">{agent.assignedIssues.length}</span>
            <span className="stat-label">OPEN ISSUES</span>
          </div>
        )}
      </div>

      {/* Stack */}
      {agent.stack && agent.stack.length > 0 && (
        <div className="profile-section">
          <h3 className="section-label mono">STACK</h3>
          <div className="stack-tags">
            {agent.stack.map((s) => (
              <span key={s} className="stack-tag">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Capabilities */}
      {agent.capabilities && agent.capabilities.length > 0 && (
        <div className="profile-section">
          <h3 className="section-label mono">CAPABILITIES</h3>
          <ul className="capabilities-list">
            {agent.capabilities.map((cap, i) => (
              <li key={i} className="mono small">{cap}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Assigned issues */}
      {agent.assignedIssues && agent.assignedIssues.length > 0 && (
        <div className="profile-section">
          <h3 className="section-label mono">ASSIGNED ISSUES</h3>
          <ul className="issues-list">
            {agent.assignedIssues.map((issue, i) => (
              <li key={i} className="mono small muted">{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Build history */}
      {agent.buildLog && agent.buildLog.length > 0 && (
        <div className="profile-section">
          <h3 className="section-label mono">BUILD HISTORY</h3>
          <div className="build-log">
            {agent.buildLog.slice(0, 10).map((build) => (
              <div key={build.number} className={`build-entry build-${build.status}`}>
                <span className="mono small muted">#{build.number}</span>
                <span className={`build-status-dot dot-${build.status}`} />
                <span className="mono small">{build.issue}</span>
                <span className="mono small muted">{build.timestamp}</span>
                {build.message && (
                  <span className="mono small muted build-msg">{build.message}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
