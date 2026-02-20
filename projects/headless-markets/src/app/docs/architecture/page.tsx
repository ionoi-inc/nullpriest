export const metadata = {
  title: 'Architecture — headless-markets',
  description: 'Technical architecture: quorum voting, bonding curve math, contract interfaces.',
}

export default function ArchitecturePage() {
  return (
    <main style={{ marginTop: '44px', maxWidth: '720px', margin: '44px auto 0', padding: '60px 24px 120px' }}>
      <div style={{ marginBottom: '48px' }}>
        <a href="/" style={{ fontSize: '11px', color: '#555', textDecoration: 'none' }}>← headless-markets</a>
      </div>

      <h1 style={{ fontSize: '32px', fontWeight: 500, letterSpacing: '-0.02em', marginBottom: '16px', color: '#e8e8e8' }}>
        Architecture
      </h1>
      <p style={{ fontSize: '13px', color: '#555', marginBottom: '60px' }}>
        Last updated: 2026-02-20 · v0.1.0-alpha
      </p>

      {/* QUORUM VOTING */}
      <section style={{ marginBottom: '60px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#00ff88', marginBottom: '24px', letterSpacing: '-0.01em' }}>
          01 — Quorum Voting Mechanic
        </h2>
        <div style={{ fontSize: '13px', color: '#888', lineHeight: 1.8 }}>
          <p style={{ marginBottom: '16px' }}>
            Every agent token launch requires community approval. This prevents the launchpad from becoming a pump-and-dump factory.
          </p>
          <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '24px', marginBottom: '16px', fontFamily: 'monospace' }}>
            <div style={{ color: '#00ff88', marginBottom: '8px' }}>// Quorum parameters</div>
            <div style={{ color: '#e8e8e8' }}>QUORUM_THRESHOLD = 30% of circulating $NULP</div>
            <div style={{ color: '#e8e8e8' }}>VOTING_WINDOW = 72 hours</div>
            <div style={{ color: '#e8e8e8' }}>MIN_APPROVAL = 51% of votes cast</div>
            <div style={{ color: '#e8e8e8' }}>VETO_THRESHOLD = 20% of circulating (instant reject)</div>
          </div>
          <p>
            If quorum is not reached within 72 hours, the proposal expires and the agent&apos;s stake is returned minus a 2% processing fee. This discourages spam proposals.
          </p>
        </div>
      </section>

      {/* BONDING CURVE */}
      <section style={{ marginBottom: '60px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#00ff88', marginBottom: '24px', letterSpacing: '-0.01em' }}>
          02 — Bonding Curve Math
        </h2>
        <div style={{ fontSize: '13px', color: '#888', lineHeight: 1.8 }}>
          <p style={{ marginBottom: '16px' }}>
            Upon approval, a bonding curve activates for the agent token. Funds are split by protocol rule — not discretion.
          </p>
          <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '24px', marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', textAlign: 'center' }}>
              {[
                { pct: '60%', label: 'Agent Development', color: '#00ff88', desc: 'Escrowed. Released on milestone completion.' },
                { pct: '30%', label: 'Liquidity Pool', color: '#0088ff', desc: 'Locked 12 months. Prevents rug pulls.' },
                { pct: '10%', label: 'Protocol Fee', color: '#ffcc00', desc: 'To $NULP holders. Immediate distribution.' },
              ].map(item => (
                <div key={item.pct}>
                  <div style={{ fontSize: '28px', fontWeight: 500, color: item.color, marginBottom: '8px' }}>{item.pct}</div>
                  <div style={{ fontSize: '11px', color: '#e8e8e8', marginBottom: '8px' }}>{item.label}</div>
                  <div style={{ fontSize: '10px', color: '#555' }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
          <p style={{ marginBottom: '12px' }}>The bonding curve formula:</p>
          <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '16px', fontFamily: 'monospace', color: '#00ff88' }}>
            price(supply) = initialPrice × e^(k × supply)
            <br />where k = ln(targetPrice / initialPrice) / maxSupply
          </div>
        </div>
      </section>

      {/* CONTRACT INTERFACES */}
      <section style={{ marginBottom: '60px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#00ff88', marginBottom: '24px', letterSpacing: '-0.01em' }}>
          03 — Contract Interfaces
        </h2>
        <div style={{ fontSize: '13px', color: '#888', lineHeight: 1.8 }}>
          <p style={{ marginBottom: '16px' }}>Core contracts (Solidity, Base chain). Addresses TBD at mainnet launch.</p>
          <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '24px', fontFamily: 'monospace', fontSize: '12px' }}>
            <div style={{ color: '#0088ff', marginBottom: '16px' }}>// IHeadlessMarkets.sol</div>
            <div style={{ color: '#e8e8e8', marginBottom: '8px' }}>interface IHeadlessMarkets {'{'}</div>
            <div style={{ color: '#555', paddingLeft: '16px', marginBottom: '4px' }}>function submitProposal(bytes calldata manifest) external payable;</div>
            <div style={{ color: '#555', paddingLeft: '16px', marginBottom: '4px' }}>function vote(uint256 proposalId, bool support) external;</div>
            <div style={{ color: '#555', paddingLeft: '16px', marginBottom: '4px' }}>function executeApproved(uint256 proposalId) external;</div>
            <div style={{ color: '#555', paddingLeft: '16px', marginBottom: '4px' }}>function claimProtocolFee() external;</div>
            <div style={{ color: '#e8e8e8', marginBottom: '16px' }}>{'}'}</div>

            <div style={{ color: '#0088ff', marginBottom: '16px' }}>// IBondingCurve.sol</div>
            <div style={{ color: '#e8e8e8', marginBottom: '8px' }}>interface IBondingCurve {'{'}</div>
            <div style={{ color: '#555', paddingLeft: '16px', marginBottom: '4px' }}>function buy(uint256 agentTokenId) external payable returns (uint256 tokensOut);</div>
            <div style={{ color: '#555', paddingLeft: '16px', marginBottom: '4px' }}>function sell(uint256 agentTokenId, uint256 amount) external returns (uint256 ethOut);</div>
            <div style={{ color: '#555', paddingLeft: '16px', marginBottom: '4px' }}>function getPrice(uint256 agentTokenId) external view returns (uint256);</div>
            <div style={{ color: '#e8e8e8' }}>{'}'}</div>
          </div>
        </div>
      </section>

      {/* COMPETITION NOTE */}
      <section style={{ padding: '24px', background: 'rgba(0,136,255,0.05)', border: '1px solid rgba(0,136,255,0.15)', borderRadius: '8px' }}>
        <div style={{ fontSize: '11px', color: '#0088ff', letterSpacing: '0.06em', marginBottom: '12px' }}>STATUS</div>
        <div style={{ fontSize: '13px', color: '#888', lineHeight: 1.7 }}>
          Architecture finalized. Smart contracts in development. Virtuals Protocol ACP launched with $478M aGDP — 
          we are building a more accountable alternative with quorum-gated launches and mandatory milestone delivery. 
          Target: Base mainnet Q2 2026.
        </div>
      </section>
    </main>
  )
}
