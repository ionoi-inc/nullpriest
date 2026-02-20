export default function Home() {
  return (
    <main className="min-h-screen bg-[#080808] text-[#e8e8e8] font-mono">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-11 flex items-center justify-between px-8 bg-[rgba(8,8,8,0.97)] border-b border-[#1e1e1e] backdrop-blur-sm">
        <div className="flex items-center gap-8">
          <a href="/" className="text-sm font-medium text-[#e8e8e8] no-underline tracking-tight">
            headless<span className="text-[#00ff88]">-</span>markets
          </a>
          <div className="hidden md:flex items-center gap-6 text-[11px] text-[#555]">
            <a href="#how-it-works" className="hover:text-[#e8e8e8] transition-colors no-underline">how it works</a>
            <a href="#architecture" className="hover:text-[#e8e8e8] transition-colors no-underline">architecture</a>
            <a href="/docs/architecture" className="hover:text-[#e8e8e8] transition-colors no-underline">docs</a>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="w-[5px] h-[5px] rounded-full bg-[#00ff88] animate-pulse"></span>
          <span className="text-[#555]">building on Base</span>
        </div>
      </nav>
      {/* HERO */}
      <section className="mt-11 min-h-[92vh] flex flex-col items-center justify-center px-6 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#1e1e1e] bg-[#0f0f0f] text-[10px] text-[#555] mb-10 tracking-wider uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse"></span>
          ERC-8004 · Base · agent economy
        </div>
        <h1 className="text-[72px] md:text-[96px] font-medium leading-none tracking-tight mb-8"
          style={{background: 'linear-gradient(135deg, #fff 0%, #00ff88 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>
          YC for<br />AI agents.
        </h1>
        <p className="text-[17px] text-[#888] max-w-[540px] leading-[1.7] mb-12 tracking-[0.01em]">
          Launch your AI agent as a token. Raise funding via bonding curve.
          Govern via quorum voting. Revenue flows on-chain. 10% protocol fee on every launch.
        </p>
        <div className="flex flex-wrap gap-4 justify-center mb-16">
          <a href="#how-it-works" className="px-6 py-3 rounded-lg bg-[#00ff88] text-black text-[12px] font-medium hover:bg-[#00e87a] transition-colors no-underline">how it works</a>
          <a href="/docs/architecture" className="px-6 py-3 rounded-lg border border-[#2a2a2a] text-[#888] text-[12px] font-medium hover:border-[#555] hover:text-[#e8e8e8] transition-all no-underline">read architecture docs</a>
        </div>
        <div className="flex flex-wrap gap-8 justify-center text-center">
          {[
            { value: '10%', label: 'protocol fee per launch' },
            { value: '30%', label: 'quorum threshold' },
            { value: '60%', label: 'bonding curve allocation' },
            { value: 'Base', label: 'L2 · ERC-8004' },
          ].map((s) => (
            <div key={s.label} className="flex flex-col gap-1">
              <span className="text-[28px] font-medium text-[#00ff88]">{s.value}</span>
              <span className="text-[10px] text-[#555] tracking-wider uppercase">{s.label}</span>
            </div>
          ))}
        </div>
      </section>
      {/* HOW IT WORKS */}
      <section id="how-it-works" className="max-w-4xl mx-auto px-6 py-24">
        <p className="text-[10px] text-[#555] tracking-widest uppercase mb-4">protocol</p>
        <h2 className="text-[32px] font-medium leading-tight mb-16 tracking-tight">how it works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { step: '01', title: 'launch', desc: 'Deploy your AI agent + token pair. Bonding curve opens immediately. 60% to liquidity, 30% to quorum vault, 10% protocol fee.' },
            { step: '02', title: 'fund', desc: 'Early supporters buy into the bonding curve. Price increases with each purchase. No VC gatekeeping — pure market signal.' },
            { step: '03', title: 'govern', desc: '30% quorum required to pass proposals. Token holders vote on agent upgrades, fee changes, treasury allocation.' },
          ].map((s) => (
            <div key={s.step} className="p-6 rounded-lg border border-[#1e1e1e] bg-[#0f0f0f]">
              <div className="text-[10px] text-[#00ff88] tracking-widest mb-3">{s.step}</div>
              <div className="text-[15px] font-medium mb-3">{s.title}</div>
              <div className="text-[12px] text-[#888] leading-[1.7]">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>
      {/* ARCHITECTURE PREVIEW */}
      <section id="architecture" className="max-w-4xl mx-auto px-6 py-16 border-t border-[#1e1e1e]">
        <p className="text-[10px] text-[#555] tracking-widest uppercase mb-4">contracts</p>
        <h2 className="text-[32px] font-medium leading-tight mb-6 tracking-tight">contract interfaces</h2>
        <p className="text-[13px] text-[#888] mb-8 leading-[1.7]">
          Three contracts. Clean separation of concerns. Auditable math.{' '}
          <a href="/docs/architecture" className="text-[#00ff88] no-underline hover:underline">Read the full architecture docs</a>
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { name: 'AgentRegistry', desc: 'Register agents. Assign token pairs. Track metadata on-chain.' },
            { name: 'BondingCurve', desc: 'Price discovery. 60/30/10 allocation. Slippage-protected buys.' },
            { name: 'QuorumVault', desc: '30% quorum voting. Timelock. On-chain governance for agents.' },
          ].map((c) => (
            <div key={c.name} className="p-5 rounded-lg border border-[#1e1e1e] bg-[#0f0f0f]">
              <div className="text-[12px] font-medium text-[#00ff88] mb-2">{c.name}.sol</div>
              <div className="text-[11px] text-[#888] leading-[1.6]">{c.desc}</div>
            </div>
          ))}
        </div>
      </section>
      {/* FOOTER */}
      <footer className="border-t border-[#1e1e1e] px-8 py-8 text-[11px] text-[#555] flex flex-wrap items-center justify-between gap-4 mt-16">
        <span>headless-markets · a nullpriest project</span>
        <div className="flex gap-6">
          <a href="https://nullpriest.xyz" className="hover:text-[#e8e8e8] transition-colors no-underline">nullpriest.xyz</a>
          <a href="/docs/architecture" className="hover:text-[#e8e8e8] transition-colors no-underline">architecture docs</a>
        </div>
      </footer>
    </main>
  )
}