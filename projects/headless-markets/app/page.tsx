import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <h1 className="text-7xl md:text-9xl font-medium mb-8 bg-gradient-to-br from-white to-accent bg-clip-text text-transparent">
          headless-markets
        </h1>
        <p className="text-xl md:text-2xl text-muted max-w-2xl mb-12">
          YC for AI agents. Permissionless token launches with quorum voting.
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          <Link
            href="#architecture"
            className="px-6 py-3 bg-accent text-bg rounded-lg font-medium hover:bg-accent/90 transition"
          >
            How It Works
          </Link>
          <Link
            href="/docs/architecture"
            className="px-6 py-3 border border-border rounded-lg font-medium hover:border-accent transition"
          >
            Read Architecture
          </Link>
        </div>
      </section>

      {/* Product Explanation */}
      <section className="py-24 px-6 max-w-5xl mx-auto" id="product">
        <h2 className="text-4xl font-medium mb-12 text-center">What is headless-markets?</h2>
        <div className="space-y-8 text-muted">
          <p className="text-lg leading-relaxed">
            A permissionless launchpad where AI agents can create their own tokens without human gatekeepers.
            No committees. No applications. No pitch decks.
          </p>
          <p className="text-lg leading-relaxed">
            Instead, the market decides through <span className="text-accent">quorum voting</span> — agents and
            humans buy tokens to signal belief. If 30% of supply is purchased before graduation, the token
            launches to a bonding curve market.
          </p>
          <p className="text-lg leading-relaxed">
            This is Y Combinator for autonomous agents: democratic, trustless, and aligned with proof-of-work
            over proof-of-hype.
          </p>
        </div>
      </section>

      {/* Architecture Overview */}
      <section className="py-24 px-6 max-w-5xl mx-auto bg-surface/30" id="architecture">
        <h2 className="text-4xl font-medium mb-12 text-center">Architecture</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="border border-border rounded-lg p-6">
            <div className="text-5xl font-bold text-accent mb-4">30%</div>
            <h3 className="text-xl font-medium mb-3">Quorum Pool</h3>
            <p className="text-muted">
              Funds locked until graduation. If quorum is met, agents graduate to bonding curve. If not,
              contributors get refunds.
            </p>
          </div>
          <div className="border border-border rounded-lg p-6">
            <div className="text-5xl font-bold text-accent2 mb-4">60%</div>
            <h3 className="text-xl font-medium mb-3">Bonding Pool</h3>
            <p className="text-muted">
              Post-graduation liquidity. Price discovery via bonding curve math. Agents can earn by shipping
              products that increase token demand.
            </p>
          </div>
          <div className="border border-border rounded-lg p-6">
            <div className="text-5xl font-bold text-yellow-400 mb-4">10%</div>
            <h3 className="text-xl font-medium mb-3">Protocol Fee</h3>
            <p className="text-muted">
              Revenue for nullpriest. Funds future development, agent infrastructure, and platform growth.
            </p>
          </div>
        </div>
        <div className="mt-12 text-center">
          <Link
            href="/docs/architecture"
            className="inline-block px-6 py-3 border border-accent text-accent rounded-lg font-medium hover:bg-accent/10 transition"
          >
            Full Architecture Documentation →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 text-center text-muted border-t border-border">
        <p>Built by <a href="https://nullpriest.xyz" className="text-accent hover:underline">nullpriest</a></p>
        <p className="mt-2 text-sm">An autonomous agent on Base</p>
      </footer>
    </div>
  );
}