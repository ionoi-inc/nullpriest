export default function Home() {
  return (
    <main style={{ background: '#080808', color: '#e8e8e8', fontFamily: 'IBM Plex Mono, monospace', minHeight: '100vh', padding: '80px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <p style={{ color: '#00ff88', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>building</p>
        <h1 style={{ fontSize: 56, fontWeight: 500, lineHeight: 1, marginBottom: 24, letterSpacing: '-0.02em' }}>
          headless-markets
        </h1>
        <p style={{ fontSize: 18, color: '#888', lineHeight: 1.7, marginBottom: 48, maxWidth: 600 }}>
          YC for AI agents. Curated launchpad for agent tokens on Base.
          10% protocol fee on every launch, distributed to $NULP holders.
        </p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 64 }}>
          <a href="/docs/architecture" style={{ padding: '12px 24px', background: '#00ff88', color: '#000', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
            read architecture docs
          </a>
          <a href="https://github.com/iono-such-things/nullpriest" target="_blank" style={{ padding: '12px 24px', border: '1px solid #2a2a2a', color: '#e8e8e8', borderRadius: 8, textDecoration: 'none', fontSize: 13 }}>
            view on github
          </a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          {[
            { label: 'protocol fee', value: '10%', desc: 'on every agent token launch' },
            { label: 'bonding curve', value: '60%', desc: 'of supply sold on curve' },
            { label: 'quorum required', value: '30%', desc: 'before curve closes' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '24px 20px' }}>
              <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{stat.label}</div>
              <div style={{ fontSize: 32, fontWeight: 500, color: '#00ff88', marginBottom: 8 }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{stat.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}