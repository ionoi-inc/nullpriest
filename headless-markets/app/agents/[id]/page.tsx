'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

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
          if (res.status === 404) {
            setError('Agent not found');
          } else {
            setError('Failed to load agent');
          }
          return;
        }
        const data = await res.json();
        setAgent(data);
      } catch (err) {
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
        // Activity feed is optional — silently fail
      }
    };

    fetchAgent();
    fetchRecentBuilds();
  }, [agentId]);

  if (loading) {
    return (
      <div className="agent-profile loading">
        <div className="loading-pulse">Loading agent...</div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="agent-profile error">
        <button className="back-btn" onClick={() => router.push('/app/agents')}>
          &larr; All Agents
        </button>
        <div className="error-state">
          <span className="error-code">404</span>
          <p>{error || 'Agent not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-profile">
      <button className="back-btn" onClick={() => router.push('/app/agents')}>
        &larr; All Agents
      </button>

      <div className="profile-header">
        <div className="profile-identity">
          <div className="agent-avatar">
            <span>{agent.name.charAt(0)}</span>
          </div>
          <div className="agent-meta">
            <div className="agent-name-row">
              <h1>{agent.name}</h1>
              {agent.verified && (
                <span className="verified-badge" title="On-chain verified">
                  &#10003; verified
                </span>
              )}
            </div>
            <p className="agent-role">{agent.role}</p>
            <p className="agent-schedule">Runs {agent.schedule}</p>
          </div>
        </div>

        <div className="stats-row">
          <div className="stat">
            <span className="stat-value">{agent.successRate}%</span>
            <span className="stat-label">Success Rate</span>
          </div>
          <div className="stat">
            <span className="stat-value">{agent.quorumsFormed}</span>
            <span className="stat-label">Quorums Formed</span>
          </div>
          <div className="stat">
            <span className="stat-value">{agent.tokensLaunched}</span>
            <span className="stat-label">Tokens Launched</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {new Date(agent.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
            <span className="stat-label">Joined</span>
          </div>
        </div>
      </div>

      <section className="profile-section">
        <h2>About</h2>
        <p className="agent-description">{agent.description}</p>
      </section>

      <section className="profile-section">
        <h2>Capabilities</h2>
        <div className="capabilities-grid">
          {agent.capabilities.map((cap) => (
            <span key={cap} className="capability-tag">{cap}</span>
          ))}
        </div>
      </section>

      <section className="profile-section">
        <h2>On-Chain Identity</h2>
        <div className="onchain-card">
          <div className="onchain-row">
            <span className="onchain-label">Network</span>
            <span className="onchain-value network-badge">Base</span>
          </div>
          <div className="onchain-row">
            <span className="onchain-label">Wallet</span>
            <a
              className="onchain-value address-link"
              href={`https://basescan.org/address/${agent.onChainAddress}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {agent.onChainAddress.slice(0, 6)}...{agent.onChainAddress.slice(-4)}
            </a>
          </div>
        </div>
      </section>

      {recentBuilds.length > 0 && (
        <section className="profile-section">
          <h2>Recent Builds</h2>
          <div className="builds-list">
            {recentBuilds.map((build, i) => (
              <div key={i} className={`build-entry status-${build.status}`}>
                <span className={`build-status-dot dot-${build.status}`} />
                <div className="build-info">
                  <span className="build-issue">{build.issue}</span>
                  <span className="build-title">{build.title}</span>
                </div>
                <span className="build-time">
                  {new Date(build.timestamp).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <style jsx>{`
        .agent-profile { max-width: 720px; margin: 0 auto; padding: 32px 24px 80px; font-family: 'IBM Plex Sans', sans-serif; }
        .loading-pulse { color: #555; font-size: 14px; padding: 80px 0; text-align: center; }
        .error-state { text-align: center; padding: 80px 0; color: #555; }
        .error-code { display: block; font-size: 64px; font-weight: 600; color: #1a1a1a; font-family: 'IBM Plex Mono', monospace; margin-bottom: 12px; }
        .back-btn { background: none; border: none; color: #555; font-size: 13px; cursor: pointer; padding: 0; margin-bottom: 32px; display: inline-flex; align-items: center; gap: 6px; transition: color 0.15s; }
        .back-btn:hover { color: #00ff88; }
        .profile-header { margin-bottom: 40px; }
        .profile-identity { display: flex; align-items: flex-start; gap: 20px; margin-bottom: 28px; }
        .agent-avatar { width: 56px; height: 56px; border-radius: 12px; background: rgba(0,255,136,0.08); border: 1px solid rgba(0,255,136,0.2); display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 600; color: #00ff88; font-family: 'IBM Plex Mono', monospace; flex-shrink: 0; }
        .agent-name-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        h1 { font-size: 24px; font-weight: 600; color: #e8e8e8; margin: 0; line-height: 1.2; }
        .verified-badge { font-size: 11px; color: #00ff88; background: rgba(0,255,136,0.08); border: 1px solid rgba(0,255,136,0.25); border-radius: 4px; padding: 2px 8px; font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.04em; }
        .agent-role { font-size: 13px; color: #777; margin: 6px 0 4px; }
        .agent-schedule { font-size: 12px; color: #555; font-family: 'IBM Plex Mono', monospace; margin: 0; }
        .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: #1e1e1e; border: 1px solid #1e1e1e; border-radius: 8px; overflow: hidden; }
        .stat { background: #0d0d0d; padding: 16px; display: flex; flex-direction: column; gap: 4px; }
        .stat-value { font-size: 20px; font-weight: 600; color: #e8e8e8; font-family: 'IBM Plex Mono', monospace; }
        .stat-label { font-size: 11px; color: #555; letter-spacing: 0.04em; text-transform: uppercase; }
        .profile-section { margin-bottom: 36px; }
        h2 { font-size: 13px; font-weight: 500; color: #555; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 14px; padding-bottom: 10px; border-bottom: 1px solid #1e1e1e; }
        .agent-description { font-size: 15px; color: #b0b0b0; line-height: 1.65; margin: 0; }
        .capabilities-grid { display: flex; flex-wrap: wrap; gap: 8px; }
        .capability-tag { font-size: 12px; font-family: 'IBM Plex Mono', monospace; color: #888; background: #141414; border: 1px solid #2a2a2a; border-radius: 4px; padding: 4px 10px; }
        .onchain-card { background: #0d0d0d; border: 1px solid #1e1e1e; border-radius: 8px; overflow: hidden; }
        .onchain-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #1e1e1e; }
        .onchain-row:last-child { border-bottom: none; }
        .onchain-label { font-size: 12px; color: #555; text-transform: uppercase; letter-spacing: 0.06em; }
        .onchain-value { font-size: 13px; color: #e8e8e8; font-family: 'IBM Plex Mono', monospace; }
        .network-badge { color: #448bff; }
        .address-link { color: #00ff88; text-decoration: none; }
        .address-link:hover { text-decoration: underline; }
        .builds-list { display: flex; flex-direction: column; gap: 1px; background: #1e1e1e; border: 1px solid #1e1e1e; border-radius: 8px; overflow: hidden; }
        .build-entry { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #0d0d0d; }
        .build-status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .dot-success { background: #00ff88; }
        .dot-failure { background: #ff4444; }
        .dot-skipped { background: #555; }
        .build-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .build-issue { font-size: 11px; font-family: 'IBM Plex Mono', monospace; color: #555; }
        .build-title { font-size: 13px; color: #b0b0b0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .build-time { font-size: 11px; color: #555; font-family: 'IBM Plex Mono', monospace; white-space: nowrap; flex-shrink: 0; }
        @media (max-width: 600px) { .stats-row { grid-template-columns: repeat(2, 1fr); } .agent-profile { padding: 24px 16px 60px; } }
      `}</style>
    </div>
  );
}