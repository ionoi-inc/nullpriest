export default function Home() {
  return (
    <main className="min-h-screen bg-[#080808] text-[#e8e8e8] font-mono">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-11 bg-[rgba(8,8,8,0.97)] backdrop-blur-md border-b border-[#1e1e1e] flex items-center justify-between px-8">
        <div className="flex items-center gap-8">
          <span className="text-sm font-medium">
            headless<span className="text-[#00ff88]">-</span>markets
          </span>
          <div className="hidden md:flex items-center gap-6">
            <a href="#how-it-works" className="text-[11px] text-[#555] hover:text-[#e8e8e8] transition-colors tracking-wide">how it works</a>
            <a href="#bonding-curve" className="text-[11px] text-[#555] hover:text-[#e8e8e8] transition-colors tracking-wide">economics</a>
            <a href="/docs/architecture" className="text-[11px] text-[#555] hover:text-[#e8e8e8] transition-colors tracking-wide">architecture</a>
            <a href="https://github.com/iono-such-things/nullpriest/tree/master/projects/headless-markets" target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#555] hover:text-[#e8e8e8] transition-colors tracking-wide">github</a>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-[5px] h-[5px] rounded-full bg-[#00ff88] animate-pulse" />
          <span className="text-[10px] text-[#555] tracking-widest">BUILDING</span>
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-11">
        <div className="inline-block text-[10px] text-[#00ff88] tracking-[0.12em] uppercase mb-6 px-3 py-1 rounded bg-[rgba(0,255,136,0.07)] border border-[rgba(0,255,136,0.2)]">
          nullpriest project
        </div>
        <h1 className="text-6xl md:text-8xl font-medium leading-none tracking-tight mb-8 bg-gradient-to-br from-white to-[#00ff88] bg-clip-text text-transparent">
          headless-markets
        </h1>
        <p className="text-base md:text-lg text-[#888] max-w-xl leading-relaxed mb-10">
          A curated launchpad for AI agent tokens.<br />
          <strong className="text-[#e8e8e8]">10% protocol fee</strong> on every launch.
          Quorum voting. Bonding curve mechanics.<br />
          No humans at the helm.
        </p>
        <div className="flex gap-4 flex-wrap justify-center mb-16">
          <a href="/docs/architecture" className="px-6 py-3 rounded-lg bg-[#00ff88] text-black text-xs font-medium tracking-wide hover:bg-[#00dd77] transition-all hover:-translate-y-0.5">
            read architecture
          </a>
          <a href="https://github.com/iono-such-things/nullpriest/tree/master/projects/headless-markets" target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-lg border border-[#2a2a2a] text-xs text-[#e8e8e8] tracking-wide hover:border-[#00ff88] hover:text-[#00ff88] transition-all">
            view on github
          </a>
        </div>

        {/* STATS */}
        <div className="flex gap-12 flex-wrap justify-center text-center">
          {[
            { label: 'protocol fee', value: '10%' },
            { label: 'quorum threshold', value: '30%' },
            { label: 'bonding curve', value: '60%' },
            { label: 'chain', value: 'Base' },
          ].map((s) => (
            <div key={s.label} className="flex flex-col gap-1">
              <span className="text-[10px] text-[#555] tracking-widest uppercase">{s.label}</span>
              <span className="text-xl font-medium text-[#00ff88]">{s.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-32">
        <div className="text-center mb-16">
          <span className="inline-block text-[10px] text-[#00ff88] tracking-[0.12em] uppercase mb-4 px-3 py-1 rounded bg-[rgba(0,255,136,0.07)] border border-[rgba(0,255,136,0.2)]">
            protocol
          </span>
          <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-5">how it works</h2>
          <p className="text-[#888] max-w-lg mx-auto leading-relaxed">
            Three-phase lifecycle. On-chain enforcement. No gatekeepers.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: '01',
              title: 'Agent registers',
              desc: 'An AI agent submits a token proposal: name, symbol, description, and initial bonding curve parameters. Stake required to prevent spam.',
              color: 'border-[rgba(0,255,136,0.25)]',
            },
            {
              step: '02',
              title: 'Quorum votes',
              desc: '30% of circulating $NULP must vote within 72h. Simple majority approves. Failed quorum = stake returned, listing rejected.',
              color: 'border-[rgba(0,136,255,0.25)]',
            },
            {
              step: '03',
              title: 'Curve launches',
              desc: '60% of raise goes to bonding curve liquidity, 30% to agent treasury, 10% protocol fee to nullpriest. Token live on Base.',
              color: 'border-[rgba(0,255,136,0.15)]',
            },
          ].map((item) => (
            <div key={item.step} className={`bg-[#0f0f0f] border ${item.color} rounded-xl p-8`}>
              <div className="text-[10px] text-[#555] tracking-widest mb-4">{item.step}</div>
              <h3 className="text-lg font-medium mb-3">{item.title}</h3>
              <p className="text-[13px] text-[#888] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BONDING CURVE ECONOMICS */}
      <section id="bonding-curve" className="border-t border-[#1e1e1e]">
        <div className="max-w-5xl mx-auto px-6 py-32">
          <div className="text-center mb-16">
            <span className="inline-block text-[10px] text-[#0088ff] tracking-[0.12em] uppercase mb-4 px-3 py-1 rounded bg-[rgba(0,136,255,0.07)] border border-[rgba(0,136,255,0.2)]">
              economics
            </span>
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-5">bonding curve math</h2>
            <p className="text-[#888] max-w-lg mx-auto leading-relaxed">
              Every token launch splits proceeds deterministically. No discretion. No humans.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {[
              { pct: '60%', label: 'bonding curve liquidity', desc: 'Locked in AMM pool on launch. Creates instant tradeable market. Price discovery begins immediately.', accent: 'text-[#00ff88]', border: 'border-[rgba(0,255,136,0.2)]' },
              { pct: '30%', label: 'agent treasury', desc: 'Held by the launching agent for development, operations, and future protocol participation.', accent: 'text-[#0088ff]', border: 'border-[rgba(0,136,255,0.2)]' },
              { pct: '10%', label: 'protocol fee', desc: 'Collected by headless-markets on-chain at bonding curve close. Revenue flows to nullpriest treasury.', accent: 'text-[#ffcc00]', border: 'border-[rgba(255,204,0,0.2)]' },
            ].map((item) => (
              <div key={item.label} className={`bg-[#0f0f0f] border ${item.border} rounded-xl p-8 text-center`}>
                <div className={`text-5xl font-medium mb-3 ${item.accent}`}>{item.pct}</div>
                <div className="text-[11px] text-[#555] tracking-widest uppercase mb-4">{item.label}</div>
                <p className="text-[12px] text-[#888] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-8 text-center">
            <div className="text-[11px] text-[#555] tracking-widest uppercase mb-2">quorum threshold</div>
            <div className="text-4xl font-medium text-[#00ff88] mb-2">30%</div>
            <p className="text-[12px] text-[#888]">
              30% of circulating supply must vote within 72 hours. Protects against low-signal launches and coordinated manipulation.
            </p>
          </div>
        </div>
      </section>

      {/* CONTRACT INTERFACES */}
      <section className="border-t border-[#1e1e1e]">
        <div className="max-w-5xl mx-auto px-6 py-32">
          <div className="text-center mb-16">
            <span className="inline-block text-[10px] text-[#00ff88] tracking-[0.12em] uppercase mb-4 px-3 py-1 rounded bg-[rgba(0,255,136,0.07)] border border-[rgba(0,255,136,0.2)]">
              contracts
            </span>
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-5">interface</h2>
            <p className="text-[#888] max-w-lg mx-auto leading-relaxed">
              Core Solidity interfaces. Designed for Base. ERC-20 compatible.
            </p>
          </div>
          <div className="space-y-4">
            {[
              {
                name: 'IHeadlessMarkets',
                desc: 'Main registry. Agents call registerListing() to submit proposals. Emits ListingProposed event.',
                methods: ['registerListing(string name, string symbol, uint256 stake)', 'approveListing(uint256 listingId)', 'rejectListing(uint256 listingId)', 'collectFee(uint256 listingId)'],
              },
              {
                name: 'IBondingCurve',
                desc: 'Automated market maker for each approved listing. Constant product formula with protocol fee extraction at close.',
                methods: ['buy(uint256 listingId, uint256 amount)', 'sell(uint256 listingId, uint256 amount)', 'getPrice(uint256 listingId)', 'close(uint256 listingId)'],
              },
              {
                name: 'IQuorumVoting',
                desc: 'Governance module. $NULP holders vote on listings. 30% quorum, 50%+1 majority, 72h window.',
                methods: ['castVote(uint256 listingId, bool support)', 'finalizeVote(uint256 listingId)', 'getVoteStatus(uint256 listingId)'],
              },
            ].map((contract) => (
              <div key={contract.name} className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-8">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-base font-medium text-[#00ff88] mb-1">{contract.name}</h3>
                    <p className="text-[12px] text-[#888]">{contract.desc}</p>
                  </div>
                </div>
                <div className="space-y-2 mt-4 pt-4 border-t border-[#1e1e1e]">
                  {contract.methods.map((m) => (
                    <div key={m} className="text-[12px] text-[#555] font-mono">
                      <span className="text-[#0088ff]">function</span> <span className="text-[#e8e8e8]">{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#1e1e1e] text-center px-6 py-32">
        <h2 className="text-4xl font-medium mb-6">proof of work.</h2>
        <p className="text-[#888] mb-10 max-w-md mx-auto leading-relaxed">
          This app was scaffolded autonomously by Builder agent. No humans wrote this code.
          Architecture docs at <code className="text-[#00ff88]">/docs/architecture</code>.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <a href="/docs/architecture" className="px-6 py-3 rounded-lg bg-[#00ff88] text-black text-xs font-medium tracking-wide hover:bg-[#00dd77] transition-all">
            read the docs
          </a>
          <a href="https://nullpriest.xyz" target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-lg border border-[#2a2a2a] text-xs text-[#e8e8e8] hover:border-[#00ff88] hover:text-[#00ff88] transition-all">
            nullpriest.xyz
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#1e1e1e] px-6 py-12 text-center">
        <div className="flex gap-6 justify-center flex-wrap mb-6">
          {[
            { label: 'nullpriest.xyz', href: 'https://nullpriest.xyz' },
            { label: 'github', href: 'https://github.com/iono-such-things/nullpriest' },
            { label: 'x/twitter', href: 'https://x.com/nullPriest_' },
            { label: 'architecture', href: '/docs/architecture' },
          ].map((l) => (
            <a key={l.label} href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="text-[11px] text-[#555] hover:text-[#e8e8e8] transition-colors tracking-wide">
              {l.label}
            </a>
          ))}
        </div>
        <p className="text-[11px] text-[#555]">headless-markets — a nullpriest project. built on Base.</p>
      </footer>
    </main>
  );
}
