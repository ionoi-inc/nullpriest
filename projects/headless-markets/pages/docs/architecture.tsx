export default function Architecture() {
  return (
    <main style={{ background: '#080808', color: '#e8e8e8', fontFamily: 'IBM Plex Mono, monospace', minHeight: '100vh', padding: '80px 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <a href="/" style={{ color: '#555', fontSize: 11, textDecoration: 'none', letterSpacing: '0.06em' }}>← headless-markets</a>
        <p style={{ color: '#00ff88', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '32px 0 16px' }}>architecture</p>
        <h1 style={{ fontSize: 40, fontWeight: 500, marginBottom: 48, letterSpacing: '-0.02em' }}>how it works</h1>

        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 16, color: '#00ff88' }}>bonding curve math</h2>
          <p style={{ color: '#888', lineHeight: 1.7, marginBottom: 12 }}>60% of each agent token&apos;s supply is sold on a bonding curve. Price increases as supply is purchased.</p>
          <p style={{ color: '#888', lineHeight: 1.7, marginBottom: 12 }}>30% quorum of circulating supply must vote to graduate the agent before the curve closes. This filters low-quality launches.</p>
          <p style={{ color: '#888', lineHeight: 1.7 }}>At close: 10% protocol fee is extracted and routed to the $NULP staking contract. The remaining 90% goes to the agent treasury.</p>
        </section>

        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 16, color: '#00ff88' }}>quorum voting</h2>
          <p style={{ color: '#888', lineHeight: 1.7, marginBottom: 12 }}>$NULP holders vote on whether an AI agent deserves to graduate from bonding curve to full listing.</p>
          <p style={{ color: '#888', lineHeight: 1.7 }}>Votes are weighted by stake. No human gatekeepers — the protocol enforces graduation rules onchain.</p>
        </section>

        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 16, color: '#00ff88' }}>contract interfaces</h2>
          <pre style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 8, padding: 20, fontSize: 12, color: '#e8e8e8', overflowX: 'auto' }}>{`interface IAgentToken {
  string name;
  string description;
  address operator;
  uint256 launchedAt;
}

interface IBondingCurve {
  function price() external view returns (uint256);
  function buy(uint256 amount) external payable;
  function sell(uint256 amount) external;
  function close() external; // called when quorum met
}

interface IHeadlessMarkets {
  function launchAgent(IAgentToken memory agent) external;
  function vote(address agentToken, bool approve) external;
  function claimFees() external; // NULP stakers only
}`}</pre>
        </section>

        <section>
          <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 16, color: '#00ff88' }}>status</h2>
          <p style={{ color: '#888', lineHeight: 1.7 }}>Scaffold live. Contracts in design. Virtuals Protocol ACP is direct competition — we ship visible code now.</p>
          <a href="https://github.com/iono-such-things/nullpriest/tree/master/projects/headless-markets" target="_blank" style={{ display: 'inline-block', marginTop: 16, color: '#00ff88', fontSize: 12, textDecoration: 'none' }}>view on github →</a>
        </section>
      </div>
    </main>
  )
}