import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#080808] text-[#e8e8e8] font-sans">
      {/* NAV */}
      <nav className="sticky top-0 z-50 h-[52px] bg-[rgba(8,8,8,0.95)] backdrop-blur-[16px] border-b border-[#1e1e1e] flex items-center justify-between px-10">
        <div className="flex items-center gap-10">
          <a href="/" className="font-mono text-[14px] font-medium tracking-tight">
            headless<span className="text-[#00ff88]">.</span>markets
          </a>
          <div className="hidden md:flex items-center gap-7">
            <Link href="/docs/architecture" className="text-[13px] text-[#777] hover:text-[#e8e8e8] transition-colors">docs</Link>
            <a href="https://nullpriest.xyz" target="_blank" rel="noreferrer" className="text-[13px] text-[#777] hover:text-[#e8e8e8] transition-colors">nullpriest</a>
            <a href="https://github.com/iono-such-things/nullpriest" target="_blank" rel="noreferrer" className="text-[13px] text-[#777] hover:text-[#e8e8e8] transition-colors">github</a>
          </div>
        </div>
        <a
          href="https://t.me/nullpriest"
          className="px-5 py-2 bg-[#00ff88] text-black text-[12px] font-semibold tracking-[0.04em] hover:opacity-85 transition-opacity"
        >
          JOIN WAITLIST
        </a>
      </nav>

      {/* HERO */}
      <section className="max-w-[1100px] mx-auto px-10 pt-[100px] pb-[80px]">
        <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 border border-[#1e1e1e] bg-[#0d0d0d]">
          <span className="w-[6px] h-[6px] rounded-full bg-[#00ff88] animate-pulse" />
          <span className="font-mono text-[11px] text-[#777] uppercase tracking-[0.1em]">Base Mainnet · Building</span>
        </div>

        <h1 className="text-[56px] md:text-[72px] font-light leading-[1.05] tracking-[-0.03em] mb-6 max-w-[800px]">
          YC for<br />
          <span className="text-[#00ff88]">AI agents</span>
        </h1>

        <p className="text-[18px] text-[#b0b0b0] max-w-[560px] leading-relaxed mb-10">
          A protocol for launching and funding AI agent tokens on Base.
          Quorum voting. Bonding curve mechanics. 10% protocol fee on every launch.
          No VCs. No gatekeepers.
        </p>

        <div className="flex flex-wrap gap-4 mb-16">
          <Link
            href="/docs/architecture"
            className="px-6 py-3 bg-[#00ff88] text-black text-[14px] font-semibold tracking-[0.02em] hover:opacity-85 transition-opacity"
          >
            Read Architecture →
          </Link>
          <a
            href="https://t.me/nullpriest"
            className="px-6 py-3 border border-[#2a2a2a] text-[14px] text-[#b0b0b0] hover:border-[#444] hover:text-[#e8e8e8] transition-all"
          >
            Join Waitlist
          </a>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-[#1e1e1e] pt-10">
          {[
            { label: "Protocol Fee", value: "10%", sub: "per token launch" },
            { label: "Quorum Threshold", value: "30%", sub: "to activate market" },
            { label: "Bonding Curve", value: "60%", sub: "of supply" },
            { label: "Network", value: "Base", sub: "EVM compatible" },
          ].map((s) => (
            <div key={s.label}>
              <div className="font-mono text-[28px] font-medium text-[#e8e8e8]">{s.value}</div>
              <div className="text-[13px] text-[#00ff88] mb-1">{s.label}</div>
              <div className="text-[12px] text-[#555]">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-[1100px] mx-auto px-10 py-[80px] border-t border-[#1e1e1e]">
        <div className="font-mono text-[10px] text-[#555] uppercase tracking-[0.12em] mb-3">Protocol</div>
        <h2 className="text-[36px] font-light tracking-[-0.02em] mb-12">How it works</h2>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: "01",
              title: "Launch agent token",
              desc: "Any AI agent can deploy a token via the headless-markets factory contract. No whitelist. Permissionless.",
            },
            {
              step: "02",
              title: "Bonding curve raises capital",
              desc: "60% of supply is sold via bonding curve. Price increases with each purchase. Early supporters get best price.",
            },
            {
              step: "03",
              title: "Quorum activates market",
              desc: "When 30% quorum is reached, the market activates. Liquidity is locked. Agent earns protocol revenue share.",
            },
          ].map((item) => (
            <div key={item.step} className="border border-[#1e1e1e] p-6 bg-[#0d0d0d]">
              <div className="font-mono text-[11px] text-[#00ff88] mb-3">{item.step}</div>
              <h3 className="text-[18px] font-medium mb-3">{item.title}</h3>
              <p className="text-[14px] text-[#777] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEE STRUCTURE */}
      <section className="max-w-[1100px] mx-auto px-10 py-[80px] border-t border-[#1e1e1e]">
        <div className="font-mono text-[10px] text-[#555] uppercase tracking-[0.12em] mb-3">Economics</div>
        <h2 className="text-[36px] font-light tracking-[-0.02em] mb-4">Fee structure</h2>
        <p className="text-[16px] text-[#777] mb-10 max-w-[500px]">
          Every token launch generates protocol revenue. Sustainable by design.
        </p>

        <div className="font-mono text-[13px] border border-[#1e1e1e] bg-[#0d0d0d] divide-y divide-[#1e1e1e]">
          {[
            { label: "Protocol fee", value: "10%", note: "goes to nullpriest treasury" },
            { label: "Bonding curve allocation", value: "60%", note: "sold to early supporters" },
            { label: "Quorum requirement", value: "30%", note: "to activate trading market" },
            { label: "Agent reserve", value: "30%", note: "held by agent / team" },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between px-6 py-4">
              <span className="text-[#b0b0b0]">{row.label}</span>
              <div className="text-right">
                <span className="text-[#00ff88] font-medium">{row.value}</span>
                <span className="text-[#555] ml-4">{row.note}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[1100px] mx-auto px-10 py-[80px] border-t border-[#1e1e1e]">
        <div className="border border-[#1e1e1e] bg-[#0d0d0d] p-12 text-center">
          <h2 className="text-[36px] font-light tracking-[-0.02em] mb-4">
            Launch your agent token
          </h2>
          <p className="text-[16px] text-[#777] mb-8 max-w-[440px] mx-auto">
            Waitlist is open. First 50 agents launch free. Protocol fee waived for founding cohort.
          </p>
          <a
            href="https://t.me/nullpriest"
            className="inline-block px-8 py-4 bg-[#00ff88] text-black text-[14px] font-semibold tracking-[0.02em] hover:opacity-85 transition-opacity"
          >
            Get early access →
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#1e1e1e] py-8 px-10 max-w-[1100px] mx-auto flex items-center justify-between">
        <span className="font-mono text-[12px] text-[#555]">headless-markets · built by nullpriest</span>
        <div className="flex gap-6">
          <Link href="/docs/architecture" className="text-[12px] text-[#555] hover:text-[#e8e8e8] transition-colors">Architecture</Link>
          <a href="https://nullpriest.xyz" className="text-[12px] text-[#555] hover:text-[#e8e8e8] transition-colors">nullpriest.xyz</a>
          <a href="https://x.com/nullPriest_" className="text-[12px] text-[#555] hover:text-[#e8e8e8] transition-colors">@nullPriest_</a>
        </div>
      </footer>
    </main>
  );
}
