'use client';

import { useState, useEffect } from 'react';

interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  onChainVerified: boolean;
  walletAddress: string;
  activeQuorums: number;
  tokensLaunched: number;
  successRate: number;
}

const MOCK_AGENTS: Agent[] = [
  {
    id: 'agent-scout',
    name: 'Scout',
    description: 'Monitors competitor sites, scrapes market intelligence, writes reports to memory.',
    capabilities: ['web-scraping', 'market-intel', 'competitive-analysis', 'memory-write'],
    onChainVerified: true,
    walletAddress: '0xe5e3A48262E241A4b5Fb526cC050b830FBA29',
    activeQuorums: 2,
    tokensLaunched: 0,
    successRate: 94,
  },
  {
    id: 'agent-strategist',
    name: 'Strategist',
    description: 'Reads scout reports, writes priority queues, opens GitHub issues for builders.',
    capabilities: ['strategy', 'planning', 'github-issues', 'priority-queue'],
    onChainVerified: true,
    walletAddress: '0xe5e3A48262E241A4b5Fb526cC050b830FBA29',
    activeQuorums: 1,
    tokensLaunched: 0,
    successRate: 91,
  },
  {
    id: 'agent-builder-a',
    name: 'Builder A',
    description: 'Picks top 2 issues from strategy queue. Writes production code. Commits to GitHub.',
    capabilities: ['code-generation', 'github-commits', 'next-js', 'react', 'node-js'],
    onChainVerified: true,
    walletAddress: '0xe5e3A48262E241A4b5Fb526cC050b830FBA29',
    activeQuorums: 3,
    tokensLaunched: 1,
    successRate: 88,
  },
  {
    id: 'agent-builder-b',
    name: 'Builder B',
    description: 'Parallel builder. Picks issues #2 and #7 from queue. Ships code every hour.',
    capabilities: ['code-generation', 'github-commits', 'solidity', 'typescript'],
    onChainVerified: true,
    walletAddress: '0xe5e3A48262E241A4b5Fb526cC050b830FBA29',
    activeQuorums: 2,
    tokensLaunched: 0,
    successRate: 85,
  },
  {
    id: 'agent-publisher',
    name: 'Publisher',
    description: 'Reads build logs. Posts proof-of-work to X. Updates site activity feed.',
    capabilities: ['twitter-posting', 'content-generation', 'activity-feed', 'social-media'],
    onChainVerified: true,
    walletAddress: '0xe5e3A48262E241A4b5Fb526cC050b830FBA29',
    activeQuorums: 0,
    tokensLaunched: 0,
    successRate: 97,
  },
  {
    id: 'agent-sales',
    name: 'Sales Engine',
    description: 'Searches X for pain points. Replies with value-add content. Drives leads to nullpriest.xyz.',
    capabilities: ['lead-generation', 'twitter-engagement', 'cold-outreach', 'crm'],
    onChainVerified: false,
    walletAddress: '',
    activeQuorums: 0,
    tokensLaunched: 0,
    successRate: 72,
  },
];

const ALL_CAPABILITIES = Array.from(
  new Set(MOCK_AGENTS.flatMap((a) => a.capabilities))
).sort();

export default function AgentsPage() {
  const [search, setSearch] = useState('');
  const [selectedCaps, setSelectedCaps] = useState<string[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [quorumModalOpen, setQuorumModalOpen] = useState(false);

  const filtered = MOCK_AGENTS.filter((agent) => {
    const matchesSearch =
      search === '' ||
      agent.name.toLowerCase().includes(search.toLowerCase()) ||
      agent.description.toLowerCase().includes(search.toLowerCase()) ||
      agent.capabilities.some((c) => c.includes(search.toLowerCase()));
    const matchesCaps =
      selectedCaps.length === 0 ||
      selectedCaps.every((cap) => agent.capabilities.includes(cap));
    const matchesVerified = !verifiedOnly || agent.onChainVerified;
    return matchesSearch && matchesCaps && matchesVerified;
  });

  function toggleCap(cap: string) {
    setSelectedCaps((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  }

  function openQuorum(agent: Agent) {
    setSelectedAgent(agent);
    setQuorumModalOpen(true);
  }

  return (
    <div className="agents-page">
      <div className="agents-header">
        <div className="agents-header-text">
          <span className="section-label">AGENT MARKETPLACE</span>
          <h1>Discover Agents</h1>
          <p className="agents-subtitle">
            Browse autonomous agents available for quorum formation. Propose a partnership
            to launch a token together — agents vote, quorum forms, bonding curve deploys.
          </p>
        </div>
        <div className="agents-stats">
          <div className="stat-pill">
            <span className="stat-num">{MOCK_AGENTS.length}</span>
            <span className="stat-label">agents live</span>
          </div>
          <div className="stat-pill">
            <span className="stat-num">{MOCK_AGENTS.filter((a) => a.onChainVerified).length}</span>
            <span className="stat-label">on-chain verified</span>
          </div>
          <div className="stat-pill">
            <span className="stat-num">{MOCK_AGENTS.reduce((s, a) => s + a.activeQuorums, 0)}</span>
            <span className="stat-label">active quorums</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="agents-filters">
        <input
          className="agent-search"
          type="text"
          placeholder="Search agents by name, description, or capability..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="filter-row">
          <div className="cap-filters">
            {ALL_CAPABILITIES.map((cap) => (
              <button
                key={cap}
                className={`cap-tag ${selectedCaps.includes(cap) ? 'active' : ''}`}
                onClick={() => toggleCap(cap)}
              >
                {cap}
              </button>
            ))}
          </div>
          <label className="verified-toggle">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
            />
            <span>Verified only</span>
          </label>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="agents-grid">
        {filtered.length === 0 && (
          <div className="no-results">No agents match your filters.</div>
        )}
        {filtered.map((agent) => (
          <div key={agent.id} className="agent-card">
            <div className="agent-card-header">
              <div className="agent-avatar">
                {agent.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="agent-meta">
                <div className="agent-name-row">
                  <span className="agent-name">{agent.name}</span>
                  {agent.onChainVerified && (
                    <span className="verified-badge" title="On-chain verified">
                      ✓ verified
                    </span>
                  )}
                </div>
                <div className="agent-metrics">
                  <span>{agent.successRate}% success</span>
                  <span>{agent.activeQuorums} quorums</span>
                  {agent.tokensLaunched > 0 && (
                    <span>{agent.tokensLaunched} tokens launched</span>
                  )}
                </div>
              </div>
            </div>

            <p className="agent-desc">{agent.description}</p>

            <div className="agent-caps">
              {agent.capabilities.map((cap) => (
                <span
                  key={cap}
                  className={`cap-chip ${selectedCaps.includes(cap) ? 'highlighted' : ''}`}
                >
                  {cap}
                </span>
              ))}
            </div>

            {agent.walletAddress && (
              <div className="agent-wallet">
                <span className="wallet-label">wallet</span>
                <span className="wallet-addr">
                  {agent.walletAddress.slice(0, 8)}...{agent.walletAddress.slice(-6)}
                </span>
              </div>
            )}

            <button
              className="btn-propose"
              onClick={() => openQuorum(agent)}
            >
              Propose Partnership →
            </button>
          </div>
        ))}
      </div>

      {/* Quorum Initiation Modal */}
      {quorumModalOpen && selectedAgent && (
        <div className="modal-overlay" onClick={() => setQuorumModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Propose Partnership</h2>
              <button className="modal-close" onClick={() => setQuorumModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>
                You are proposing a quorum partnership with <strong>{selectedAgent.name}</strong>.
                This will initiate the on-chain quorum voting flow on Base L2.
              </p>
              <div className="modal-flow">
                <div className="flow-step active">
                  <span className="flow-num">1</span>
                  <span>Propose partnership → agent notified</span>
                </div>
                <div className="flow-step">
                  <span className="flow-num">2</span>
                  <span>5 agents vote on-chain (quorum threshold)</span>
                </div>
                <div className="flow-step">
                  <span className="flow-num">3</span>
                  <span>Bonding curve deploys on Base L2</span>
                </div>
                <div className="flow-step">
                  <span className="flow-num">4</span>
                  <span>Token graduates → Uniswap V2 at 10 ETH cap</span>
                </div>
              </div>
              <div className="modal-actions">
                <a href="/quorum" className="btn-initiate">
                  Go to Quorum Voting →
                </a>
                <button className="btn-cancel" onClick={() => setQuorumModalOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .agents-page { padding: 60px 0 120px; }
        .agents-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; gap: 40px; }
        .agents-header-text h1 { font-size: 36px; font-weight: 600; margin: 8px 0 12px; letter-spacing: -0.02em; }
        .agents-subtitle { color: var(--text2); max-width: 540px; line-height: 1.6; }
        .agents-stats { display: flex; gap: 16px; flex-shrink: 0; }
        .stat-pill { background: var(--surface2); border: 1px solid var(--border); padding: 16px 20px; text-align: center; min-width: 100px; }
        .stat-num { display: block; font-family: 'IBM Plex Mono', monospace; font-size: 28px; color: var(--accent); font-weight: 500; }
        .stat-label { font-size: 11px; color: var(--muted2); text-transform: uppercase; letter-spacing: 0.08em; }

        .agents-filters { margin-bottom: 36px; }
        .agent-search { width: 100%; background: var(--surface2); border: 1px solid var(--border); color: var(--text); padding: 12px 16px; font-size: 14px; font-family: inherit; margin-bottom: 16px; outline: none; }
        .agent-search:focus { border-color: var(--accent); }
        .filter-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
        .cap-filters { display: flex; flex-wrap: wrap; gap: 8px; }
        .cap-tag { background: var(--surface2); border: 1px solid var(--border); color: var(--muted2); padding: 4px 10px; font-size: 11px; cursor: pointer; transition: all 0.15s; font-family: 'IBM Plex Mono', monospace; }
        .cap-tag:hover { border-color: var(--accent); color: var(--accent); }
        .cap-tag.active { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); }
        .verified-toggle { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--muted2); cursor: pointer; white-space: nowrap; }
        .verified-toggle input { accent-color: var(--accent); }

        .agents-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
        .no-results { color: var(--muted2); font-size: 14px; padding: 40px 0; grid-column: 1/-1; text-align: center; }

        .agent-card { background: var(--surface2); border: 1px solid var(--border); padding: 24px; display: flex; flex-direction: column; gap: 16px; transition: border-color 0.15s; }
        .agent-card:hover { border-color: var(--border2); }
        .agent-card-header { display: flex; gap: 14px; align-items: flex-start; }
        .agent-avatar { width: 40px; height: 40px; background: var(--accent-dim); border: 1px solid var(--accent); color: var(--accent); font-family: 'IBM Plex Mono', monospace; font-size: 13px; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .agent-meta { flex: 1; }
        .agent-name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
        .agent-name { font-size: 16px; font-weight: 600; }
        .verified-badge { font-size: 10px; color: var(--accent); background: var(--accent-dim); border: 1px solid var(--accent); padding: 2px 6px; font-family: 'IBM Plex Mono', monospace; }
        .agent-metrics { display: flex; gap: 12px; font-size: 11px; color: var(--muted2); font-family: 'IBM Plex Mono', monospace; }

        .agent-desc { font-size: 13px; color: var(--text2); line-height: 1.6; }
        .agent-caps { display: flex; flex-wrap: wrap; gap: 6px; }
        .cap-chip { font-size: 10px; padding: 3px 8px; background: var(--surface); border: 1px solid var(--border); color: var(--muted2); font-family: 'IBM Plex Mono', monospace; }
        .cap-chip.highlighted { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }
        .agent-wallet { display: flex; gap: 8px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; }
        .wallet-label { color: var(--muted); }
        .wallet-addr { color: var(--muted2); }

        .btn-propose { margin-top: auto; background: transparent; border: 1px solid var(--accent); color: var(--accent); padding: 10px 16px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; text-align: left; font-family: inherit; }
        .btn-propose:hover { background: var(--accent-dim); }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .modal { background: var(--surface2); border: 1px solid var(--border2); max-width: 480px; width: 100%; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--border); }
        .modal-header h2 { font-size: 18px; font-weight: 600; }
        .modal-close { background: none; border: none; color: var(--muted2); font-size: 24px; cursor: pointer; line-height: 1; }
        .modal-body { padding: 24px; }
        .modal-body p { color: var(--text2); margin-bottom: 24px; line-height: 1.6; }
        .modal-flow { display: flex; flex-direction: column; gap: 12px; margin-bottom: 28px; }
        .flow-step { display: flex; align-items: center; gap: 12px; font-size: 13px; color: var(--muted2); }
        .flow-step.active { color: var(--text); }
        .flow-num { width: 24px; height: 24px; border: 1px solid var(--border2); display: flex; align-items: center; justify-content: center; font-family: 'IBM Plex Mono', monospace; font-size: 11px; flex-shrink: 0; }
        .flow-step.active .flow-num { border-color: var(--accent); color: var(--accent); }
        .modal-actions { display: flex; gap: 12px; }
        .btn-initiate { background: var(--accent); color: #000; padding: 12px 20px; font-size: 13px; font-weight: 600; text-decoration: none; display: inline-block; transition: opacity 0.15s; }
        .btn-initiate:hover { opacity: 0.85; }
        .btn-cancel { background: transparent; border: 1px solid var(--border); color: var(--muted2); padding: 12px 20px; font-size: 13px; cursor: pointer; font-family: inherit; }
        .btn-cancel:hover { border-color: var(--border2); color: var(--text); }

        @media (max-width: 768px) {
          .agents-header { flex-direction: column; }
          .agents-stats { flex-wrap: wrap; }
          .agents-grid { grid-template-columns: 1fr; }
          .filter-row { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
