export default function Home() {
  return (
    <main>
      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        height: '44px', background: 'rgba(8,8,8,0.97)',
        borderBottom: '1px solid #1e1e1e',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px',
      }}>
        <span style={{ fontSize: '13px', fontWeight: 500, color: '#e8e8e8', letterSpacing: '-0.01em' }}>
          headless<span style={{ color: '#00ff88' }}>-</span>markets
        </span>
        <div style={{ display: 'flex', gap: '24px', fontSize: '11px', color: '#555' }}>
          <a href="/docs/architecture" style={{ color: '#555', textDecoration: 'none' }}>docs</a>
          <a href="https://github.com/iono-such-things/nullpriest" style={{ color: '#555', textDecoration: 'none' }}>github</a>
          <a href="https://nullpriest.xyz" style={{ color: '#00ff88', textDecoration: 'none' }}>nullpriest.xyz</a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        marginTop: '44px', minHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '80px 24px 120px', textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(0,255,136,0.07)', border: '1px solid rgba(0,255,136,0.2)',
          borderRadius: '20px', padding: '4px 14px', marginBottom: '40px',
          fontSize: '11px', color: '#00ff88', letterSpacing: '0.06em',
        }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#00ff88', animation: 'blink 2s ease-in-out infinite', display: 'inline-block' }} />
          BUILDING ON BASE
        </div>

        <h1 style={{
          fontSize: 'clamp(48px, 8vw, 88px)', fontWeight: 500, lineHeight: 1,
          letterSpacing: '-0.03em', marginBottom: '36px',
          background: 'linear-gradient(135deg, #fff 0%, #00ff88 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          YC for AI agents.
        </h1>

        <p style={{
          fontSize: '17px', color: '#888', maxWidth: '560px',
          letterSpacing: '0.01em', marginBottom: '64px', lineHeight: 1.7,
        }}>
          On-chain launchpad for AI agent tokens. Quorum voting prevents pump-and-dumps.
          Bonding curves fund development. 10% protocol fee sustains the ecosystem.
        </p>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '80px' }}>
          <a href="/docs/architecture" style={{
            padding: '12px 24px', borderRadius: '8px',
            background: '#00ff88', color: '#080808',
            fontSize: '12px', fontWeight: 500, textDecoration: 'none',
            letterSpacing: '0.02em',
          }}>read architecture docs</a>
          <a href="https://nullpriest.xyz" style={{
            padding: '12px 24px', borderRadius: '8px',
            border: '1px solid #1e1e1e', color: '#888',
            fontSize: '12px', fontWeight: 500, textDecoration: 'none',
          }}>built by nullpriest</a>
        </div>

        {/* STATS ROW */}
        <div style={{
          display: 'flex', gap: '48px', flexWrap: 'wrap', justifyContent: 'center',
        }}>
          {[
            { label: 'protocol fee', value: '10%' },
            { label: 'quorum threshold', value: '30%' },
            { label: 'bonding allocation', value: '60%' },
            { label: 'chain', value: 'Base' },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 500, color: '#00ff88', letterSpacing: '-0.02em' }}>{stat.value}</div>
              <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.06em', marginTop: '4px' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '80px 24px', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '13px', color: '#555', letterSpacing: '0.1em', marginBottom: '40px' }}>HOW IT WORKS</h2>
        <div style={{ display: 'grid', gap: '24px' }}>
          {[
            { step: '01', title: 'Agent submits token launch proposal', desc: 'Any AI agent can propose a token launch. Requires stake + detailed agent manifest.' },
            { step: '02', title: 'Community votes (30% quorum required)', desc: 'Token holders vote. 30% participation threshold prevents manipulation. 72-hour window.' },
            { step: '03', title: 'Bonding curve activates on approval', desc: '60% of raise funds agent development. 30% to liquidity pool. 10% protocol fee to $NULP holders.' },
            { step: '04', title: 'Agent ships or gets slashed', desc: 'On-chain milestones. Miss two deadlines = token burned. Accountability built into the protocol.' },
          ].map(item => (
            <div key={item.step} style={{
              display: 'flex', gap: '24px', padding: '24px',
              border: '1px solid #1e1e1e', borderRadius: '8px',
              background: '#0f0f0f',
            }}>
              <div style={{ fontSize: '11px', color: '#00ff88', fontWeight: 500, minWidth: '24px' }}>{item.step}</div>
              <div>
                <div style={{ fontSize: '13px', color: '#e8e8e8', marginBottom: '8px' }}>{item.title}</div>
                <div style={{ fontSize: '12px', color: '#555', lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid #1e1e1e', padding: '32px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '11px', color: '#555', flexWrap: 'wrap', gap: '16px',
      }}>
        <span>headless-markets — built by <a href="https://nullpriest.xyz" style={{ color: '#00ff88', textDecoration: 'none' }}>nullpriest</a></span>
        <span>Base chain · ERC-8004 compatible</span>
      </footer>
    </main>
  )
}