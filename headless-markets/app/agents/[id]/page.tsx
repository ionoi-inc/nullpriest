'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface AgentBuild {
  issue: number;
  title: string;
  status: 'shipped' | 'failed' | 'in_progress';
  timestamp: string;
}

interface AgentDetail {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'paused' | 'building';
  builds: number;
  lastActive: string;
  specialty: string;
  verified: boolean;
  description?: string;
  recentBuilds?: AgentBuild[];
  metrics?: {
    successRate: number;
    avgBuildTime: string;
    issuesShipped: number;
    streak: number;
  };
}

const STATUS_LABELS: Record<string, string> = {
  active: 'ACTIVE',
  paused: 'PAUSED',
  building: 'BUILDING',
};

export default function AgentProfilePage() {
  const params = useParams();
  const id = params?.id as string;

  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchAgent = async () => {
      try {
        const res = await fetch(`/api/agents/${id}`, {
          headers: { 'x-payment-tier': 'free' },
        });
        if (res.status === 404) throw new Error('agent not found');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setAgent(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agent');
      } finally {
        setLoading(false);
      }
    };
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
        <span className="mono red">{error || 'agent not found'}</span>
        <a href="/app/agents" className="profile-back mono muted">
          ← back to registry
        </a>
      </div>
    );
  }

  return (
    <div className="profile-view">
      <a href="/app/agents" className="profile-back mono muted">
        ← registry
      </a>

      <div className="profile-header">
        <div className="profile-identity">
          <div className="profile-status-dot" data-status={agent.status} />
          <h1 className="profile-name mono">{agent.name}</h1>
          {agent.verified && (
            <span className="profile-verified">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6.5" fill="var(--accent)" fillOpacity="0.12" stroke="var(--accent)" strokeWidth="1" />
                <path d="M4.5 7l1.8 1.8L9.5 5" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              verified
            </span>
          )}
          <span className={`profile-status-badge status-${agent.status}`}>
            {STATUS_LABELS[agent.status] || agent.status.toUpperCase()}
          </span>
        </div>
        <p className="profile-role">{agent.role}</p>
        {agent.description && (
          <p className="profile-description muted">{agent.description}</p>
        )}
      </div>

      {agent.metrics && (
        <div className="profile-metrics">
          <div className="profile-metric">
            <span className="metric-value mono accent">{agent.metrics.issuesShipped}</span>
            <span className="metric-label muted">issues shipped</span>
          </div>
          <div className="profile-metric">
            <span className="metric-value mono accent">{agent.metrics.successRate}%</span>
            <span className="metric-label muted">success rate</span>
          </div>
          <div className="profile-metric">
            <span className="metric-value mono accent">{agent.metrics.avgBuildTime}</span>
            <span className="metric-label muted">avg build time</span>
          </div>
          <div className="profile-metric">
            <span className="metric-value mono accent">{agent.metrics.streak}</span>
            <span className="metric-label muted">build streak</span>
          </div>
        </div>
      )}

      <div className="profile-meta-row">
        <span className="mono muted">specialty:</span>
        <span className="mono">{agent.specialty}</span>
        <span className="mono muted">last active:</span>
        <span className="mono">{agent.lastActive}</span>
        <span className="mono muted">total builds:</span>
        <span className="mono accent">{agent.builds}</span>
      </div>

      {agent.recentBuilds && agent.recentBuilds.length > 0 && (
        <div className="profile-builds">
          <h2 className="profile-section-title mono">recent builds</h2>
          <div className="builds-list">
            {agent.recentBuilds.map((build, i) => (
              <div key={i} className="build-row">
                <span className={`build-status mono status-${build.status}`}>
                  {build.status === 'shipped' ? '✓' : build.status === 'failed' ? '✗' : '~'}
                </span>
                <span className="build-issue mono muted">#{build.issue}</span>
                <span className="build-title">{build.title}</span>
                <span className="build-time mono muted">{build.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="profile-footer">
        <a
          href={`https://github.com/iono-such-things/nullpriest`}
          className="profile-github-link mono muted"
          target="_blank"
          rel="noopener noreferrer"
        >
          view repo →
        </a>
        <span className="mono muted">agent id: {agent.id}</span>
      </div>
    </div>
  );
}
