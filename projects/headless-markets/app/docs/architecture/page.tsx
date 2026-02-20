import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'headless-markets — Architecture',
  description: 'Technical architecture: quorum voting mechanic, bonding curve math, and contract interfaces for the headless-markets protocol.',
};

export default function ArchitecturePage() {
  return (
    <main className="min-h-screen bg-[#080808] text-[#e8e8e8] font-mono">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-11 bg-[rgba(8,8,8,0.97)] backdrop-blur-md border-b border-[#1e1e1e] flex items-center justify-between px-8">
        <div className="flex items-center gap-8">
          <a href="/" className="text-sm font-medium hover:text-[#00ff88] transition-colors">
            headless<span className="text-[#00ff88]">-</span>markets
          </a>
          <span className="text-[11px] text-[#555]">/</span>
          <span className="text-[11px] text-[#555]">architecture</span>
        </div>
        <a href="https://github.com/iono-such-things/nullpriest/tree/master/projects/headless-markets" target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#555] hover:text-[#e8e8e8] transition-colors tracking-wide">
          github →
        </a>
      </nav>

      <div className="max-w-3xl mx-auto px-6 pt-28 pb-32">

        {/* HEADER */}
        <div className="mb-16">
          <div className="inline-block text-[10px] text-[#00ff88] tracking-[0.12em] uppercase mb-4 px-3 py-1 rounded bg-[rgba(0,255,136,0.07)] border border-[rgba(0,255,136,0.2)]">
            technical docs
          </div>
          <h1 className="text-5xl font-medium tracking-tight mb-6">Architecture</h1>
          <p className="text-[#888] text-base leading-relaxed">
            headless-markets is a curated launchpad protocol for AI agent tokens on Base.
            This document describes the quorum voting mechanic, bonding curve math, and contract interfaces.
          </p>
          <div className="mt-6 text-[11px] text-[#555]">
            Last updated: 2026-02-20 · Built by Builder agent · nullpriest.xyz
          </div>
        </div>

        {/* OVERVIEW */}
        <section className="mb-16">
          <h2 className="text-2xl font-medium mb-6 pb-3 border-b border-[#1e1e1e]">Overview</h2>
          <p className="text-[#888] leading-relaxed mb-4">
            The protocol consists of three on-chain modules operating in sequence:
          </p>
          <ol className="space-y-3 text-[13px] text-[#888] leading-relaxed list-none">
            {[
              ['IHeadlessMarkets', 'Main registry. Accepts agent listing proposals, manages state machine (proposed → voting → approved/rejected → launched).'],
              ['IQuorumVoting', 'Governance module. $NULP holders vote on each proposed listing. 30% quorum threshold, 72-hour window.'],
              ['IBondingCurve', 'Automated market maker for approved listings. Deterministic price curve, protocol fee collected at close.'],
            ].map(([name, desc], i) => (
              <li key={name} className="flex gap-4">
                <span className="text-[#555] shrink-0">{i + 1}.</span>
                <span>
                  <span className="text-[#00ff88]">{name}</span>
                  {' — '}{desc}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* QUORUM VOTING */}
        <section className="mb-16">
          <h2 className="text-2xl font-medium mb-6 pb-3 border-b border-[#1e1e1e]">Quorum Voting Mechanic</h2>

          <div className="bg-[#0f0f0f] border border-[rgba(0,255,136,0.15)] rounded-xl p-6 mb-6">
            <div className="grid grid-cols-3 gap-6 text-center">
              {[
                { val: '30%', label: 'quorum threshold' },
                { val: '50%+1', label: 'approval majority' },
                { val: '72h', label: 'voting window' },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-3xl font-medium text-[#00ff88] mb-1">{s.val}</div>
                  <div className="text-[10px] text-[#555] tracking-widest uppercase">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 text-[13px] text-[#888] leading-relaxed">
            <p>
              When an agent submits a listing via <code className="text-[#00ff88] bg-[#0f0f0f] px-1 rounded">registerListing()</code>, a 72-hour voting window opens automatically.
              Any address holding $NULP tokens can cast a vote — one token equals one vote.
            </p>
            <p>
              <strong className="text-[#e8e8e8]">Quorum check:</strong> At window close, the contract checks whether total votes cast represent ≥ 30% of circulating $NULP supply.
              If quorum is not met, the listing is automatically rejected and the proposer's stake is returned minus a small penalty.
            </p>
            <p>
              <strong className="text-[#e8e8e8]">Approval check:</strong> If quorum is met, simple majority (50%+1 of votes cast) determines approval.
              Approved listings proceed immediately to the bonding curve launch phase.
            </p>
            <p>
              <strong className="text-[#e8e8e8]">Sybil resistance:</strong> Snapshot is taken at proposal block. Tokens transferred after proposal cannot vote.
              This prevents flash loan manipulation of governance.
            </p>
          </div>
        </section>

        {/* BONDING CURVE */}
        <section className="mb-16">
          <h2 className="text-2xl font-medium mb-6 pb-3 border-b border-[#1e1e1e]">Bonding Curve Math</h2>

          <div className="bg-[#0f0f0f] border border-[rgba(0,136,255,0.15)] rounded-xl p-6 mb-6">
            <div className="grid grid-cols-3 gap-6 text-center">
              {[
                { val: '60%', label: 'curve liquidity', color: 'text-[#00ff88]' },
                { val: '30%', label: 'agent treasury', color: 'text-[#0088ff]' },
                { val: '10%', label: 'protocol fee', color: 'text-[#ffcc00]' },
              ].map((s) => (
                <div key={s.label}>
                  <div className={`text-3xl font-medium ${s.color} mb-1`}>{s.val}</div>
                  <div className="text-[10px] text-[#555] tracking-widest uppercase">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 text-[13px] text-[#888] leading-relaxed">
            <p>
              headless-markets uses a <strong className="text-[#e8e8e8]">linear bonding curve</strong> for initial price discovery.
              Price increases proportionally with supply purchased. Formula:
            </p>
            <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg p-4 text-[12px]">
              <div className="text-[#00ff88] mb-1">price(supply) = basePrice + (slope × supply)</div>
              <div className="text-[#555]">where basePrice = 0.0001 ETH, slope = 0.000001 ETH per token</div>
            </div>
            <p>
              <strong className="text-[#e8e8e8]">At curve close:</strong> When the bonding curve reaches its target raise (configurable per listing, default 10 ETH),
              the curve closes automatically. Proceeds split: 60% locked as permanent LP in Uniswap V3 on Base,
              30% sent to agent treasury address, 10% collected by protocol.
            </p>
            <p>
              <strong className="text-[#e8e8e8]">Post-launch:</strong> Token trades freely on the open market. Protocol has no further control.
              LP is locked permanently — no rug pulls possible.
            </p>
          </div>
        </section>

        {/* CONTRACT INTERFACES */}
        <section className="mb-16">
          <h2 className="text-2xl font-medium mb-6 pb-3 border-b border-[#1e1e1e]">Contract Interfaces</h2>

          <div className="space-y-6">
            {[
              {
                name: 'IHeadlessMarkets.sol',
                color: 'border-[rgba(0,255,136,0.2)]',
                code: `interface IHeadlessMarkets {
  event ListingProposed(uint256 indexed id, address agent, string symbol);
  event ListingApproved(uint256 indexed id);
  event ListingRejected(uint256 indexed id);
  event ListingLaunched(uint256 indexed id, address tokenAddress);

  function registerListing(
    string calldata name,
    string calldata symbol,
    uint256 stakeAmount,
    address agentTreasury
  ) external returns (uint256 listingId);

  function getListing(uint256 listingId)
    external view returns (Listing memory);

  function collectFee(uint256 listingId) external;
}`,
              },
              {
                name: 'IQuorumVoting.sol',
                color: 'border-[rgba(0,136,255,0.2)]',
                code: `interface IQuorumVoting {
  event VoteCast(uint256 indexed listingId, address voter, bool support, uint256 weight);
  event VoteFinalized(uint256 indexed listingId, bool approved, uint256 totalVotes);

  function castVote(uint256 listingId, bool support) external;

  function finalizeVote(uint256 listingId) external returns (bool approved);

  function getVoteStatus(uint256 listingId) external view returns (
    uint256 votesFor,
    uint256 votesAgainst,
    uint256 quorumReached,
    bool finalized
  );
}`,
              },
              {
                name: 'IBondingCurve.sol',
                color: 'border-[rgba(255,204,0,0.2)]',
                code: `interface IBondingCurve {
  event TokensPurchased(uint256 indexed listingId, address buyer, uint256 amount, uint256 price);
  event TokensSold(uint256 indexed listingId, address seller, uint256 amount, uint256 price);
  event CurveClosed(uint256 indexed listingId, uint256 raised, uint256 fee);

  function buy(uint256 listingId, uint256 minTokens)
    external payable returns (uint256 tokenAmount);

  function sell(uint256 listingId, uint256 tokenAmount, uint256 minEth)
    external returns (uint256 ethAmount);

  function getPrice(uint256 listingId)
    external view returns (uint256 pricePerToken);

  function close(uint256 listingId) external;
}`,
              },
            ].map((c) => (
              <div key={c.name} className={`bg-[#0f0f0f] border ${c.color} rounded-xl overflow-hidden`}>
                <div className="px-6 py-3 border-b border-[#1e1e1e] flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#00ff88]" />
                  <span className="text-[12px] text-[#888]">{c.name}</span>
                </div>
                <pre className="p-6 text-[11px] text-[#888] leading-relaxed overflow-x-auto whitespace-pre">
                  <code>{c.code}</code>
                </pre>
              </div>
            ))}
          </div>
        </section>

        {/* DEPLOYMENT */}
        <section className="mb-16">
          <h2 className="text-2xl font-medium mb-6 pb-3 border-b border-[#1e1e1e]">Deployment Status</h2>
          <div className="space-y-3 text-[13px]">
            {[
              { label: 'Chain', value: 'Base (mainnet)', status: 'planned' },
              { label: 'IHeadlessMarkets', value: 'not yet deployed', status: 'building' },
              { label: 'IQuorumVoting', value: 'not yet deployed', status: 'building' },
              { label: 'IBondingCurve', value: 'not yet deployed', status: 'building' },
              { label: 'Frontend', value: 'this app — headless-markets Next.js scaffold', status: 'live' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-3 border-b border-[#1e1e1e]">
                <span className="text-[#555]">{row.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[#888]">{row.value}</span>
                  <span className={`text-[10px] tracking-widest uppercase px-2 py-0.5 rounded ${
                    row.status === 'live'
                      ? 'text-[#00ff88] bg-[rgba(0,255,136,0.07)] border border-[rgba(0,255,136,0.2)]'
                      : row.status === 'building'
                      ? 'text-[#0088ff] bg-[rgba(0,136,255,0.07)] border border-[rgba(0,136,255,0.2)]'
                      : 'text-[#555] bg-[#141414] border border-[#2a2a2a]'
                  }`}>{row.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <div className="pt-8 border-t border-[#1e1e1e] flex items-center justify-between text-[11px] text-[#555]">
          <span>headless-markets · nullpriest project · built on Base</span>
          <a href="https://nullpriest.xyz" className="hover:text-[#e8e8e8] transition-colors">nullpriest.xyz →</a>
        </div>
      </div>
    </main>
  );
}
