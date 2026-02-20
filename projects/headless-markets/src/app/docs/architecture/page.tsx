export const metadata = {
  title: 'Architecture — headless-markets',
  description: 'Quorum voting, bonding curve math, and contract interfaces for headless-markets.',
};

export default function ArchitectureDocs() {
  return (
    <main className="min-h-screen bg-[#080808] text-[#e8e8e8] font-mono">
      <nav className="fixed top-0 left-0 right-0 z-50 h-11 flex items-center justify-between px-8 bg-[rgba(8,8,8,0.97)] border-b border-[#1e1e1e]">
        <a href="/" className="text-sm font-medium text-[#e8e8e8] no-underline">headless<span className="text-[#00ff88]">-</span>markets</a>
        <a href="/" className="text-[11px] text-[#555] hover:text-[#e8e8e8] transition-colors no-underline">back</a>
      </nav>
      <div className="max-w-3xl mx-auto px-6 pt-24 pb-32">
        <p className="text-[10px] text-[#555] tracking-widest uppercase mb-4">docs / architecture</p>
        <h1 className="text-[40px] font-medium leading-tight tracking-tight mb-4">Architecture</h1>
        <p className="text-[13px] text-[#888] mb-16 leading-[1.7]">
          headless-markets is a three-contract system for launching, funding, and governing AI agents on Base.
          Every design decision optimizes for: transparent price discovery, on-chain governance, and sustainable protocol revenue.
        </p>
        <section className="mb-16">
          <h2 className="text-[20px] font-medium mb-6 text-[#00ff88]">Bonding Curve Math</h2>
          <p className="text-[12px] text-[#888] mb-6 leading-[1.7]">Price is a function of supply. As tokens are purchased, price increases along a curve. Early believers get better prices, late entrants pay a premium.</p>
          <div className="p-5 rounded-lg border border-[#1e1e1e] bg-[#0f0f0f] mb-6">
            <div className="text-[11px] text-[#555] mb-3 tracking-wider uppercase">price function</div>
            <code className="text-[13px] text-[#00ff88] block leading-[1.8]">P(s) = a * s^2{'\n'}cost = integral(0 to s) P(x) dx = (a * s^3) / 3</code>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { pct: '60%', label: 'Liquidity Pool', desc: 'Paired with ETH for DEX trading' },
              { pct: '30%', label: 'Quorum Vault', desc: 'Locked for governance voting' },
              { pct: '10%', label: 'Protocol Fee', desc: 'nullpriest treasury revenue' },
            ].map((a) => (
              <div key={a.label} className="p-4 rounded border border-[#1e1e1e] bg-[#0f0f0f] text-center">
                <div className="text-[24px] font-medium text-[#00ff88] mb-1">{a.pct}</div>
                <div className="text-[11px] font-medium mb-1">{a.label}</div>
                <div className="text-[10px] text-[#555] leading-[1.5]">{a.desc}</div>
              </div>
            ))}
          </div>
        </section>
        <section className="mb-16">
          <h2 className="text-[20px] font-medium mb-6 text-[#00ff88]">Quorum Voting Mechanic</h2>
          <p className="text-[12px] text-[#888] mb-6 leading-[1.7]">30% of total token supply must vote YES for a proposal to pass. 48-hour voting window. 24-hour timelock before execution.</p>
          <div className="space-y-3">
            {[
              { step: '1', text: 'Any token holder with >= 1% supply can submit a proposal' },
              { step: '2', text: '48-hour voting window opens immediately on submission' },
              { step: '3', text: '30% quorum threshold must be reached (YES votes / total supply)' },
              { step: '4', text: '24-hour timelock before execution — emergency veto window' },
              { step: '5', text: 'Execution calls target contract with encoded calldata' },
            ].map((s) => (
              <div key={s.step} className="flex gap-4 items-start p-4 rounded border border-[#1e1e1e] bg-[#0f0f0f]">
                <span className="text-[10px] text-[#00ff88] font-medium mt-0.5 min-w-[16px]">{s.step}</span>
                <span className="text-[12px] text-[#888] leading-[1.6]">{s.text}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="mb-16">
          <h2 className="text-[20px] font-medium mb-6 text-[#00ff88]">Contract Interfaces</h2>
          <div className="space-y-6">
            <div className="p-5 rounded-lg border border-[#1e1e1e] bg-[#0f0f0f]">
              <div className="text-[13px] font-medium text-[#e8e8e8] mb-1">AgentRegistry.sol</div>
              <div className="text-[11px] text-[#555] mb-4">Register agents, assign token pairs, track metadata</div>
              <pre className="text-[11px] text-[#888] leading-[1.7] overflow-x-auto whitespace-pre">{`interface IAgentRegistry {
  function registerAgent(string calldata name, address tokenAddress, string calldata metadataURI) external returns (uint256 agentId);
  function getAgent(uint256 agentId) external view returns (Agent memory);
  function updateMetadata(uint256 agentId, string calldata newURI) external;
  event AgentRegistered(uint256 indexed agentId, address indexed token, address indexed deployer);
}`}</pre>
            </div>
            <div className="p-5 rounded-lg border border-[#1e1e1e] bg-[#0f0f0f]">
              <div className="text-[13px] font-medium text-[#e8e8e8] mb-1">BondingCurve.sol</div>
              <div className="text-[11px] text-[#555] mb-4">Price discovery, 60/30/10 allocation, slippage protection</div>
              <pre className="text-[11px] text-[#888] leading-[1.7] overflow-x-auto whitespace-pre">{`interface IBondingCurve {
  function buy(uint256 agentId, uint256 minTokensOut) external payable returns (uint256 tokensOut);
  function sell(uint256 agentId, uint256 tokenAmount, uint256 minEthOut) external returns (uint256 ethOut);
  function getPrice(uint256 agentId) external view returns (uint256 priceWei);
  function getCost(uint256 agentId, uint256 tokenAmount) external view returns (uint256 costWei);
  event Buy(uint256 indexed agentId, address buyer, uint256 eth, uint256 tokens);
  event Sell(uint256 indexed agentId, address seller, uint256 tokens, uint256 eth);
}`}</pre>
            </div>
            <div className="p-5 rounded-lg border border-[#1e1e1e] bg-[#0f0f0f]">
              <div className="text-[13px] font-medium text-[#e8e8e8] mb-1">QuorumVault.sol</div>
              <div className="text-[11px] text-[#555] mb-4">30% quorum voting, 48h window, 24h timelock</div>
              <pre className="text-[11px] text-[#888] leading-[1.7] overflow-x-auto whitespace-pre">{`interface IQuorumVault {
  function propose(uint256 agentId, address target, bytes calldata callData, string calldata description) external returns (uint256 proposalId);
  function vote(uint256 proposalId, bool support) external;
  function execute(uint256 proposalId) external;
  function getProposal(uint256 proposalId) external view returns (Proposal memory);
  function QUORUM_THRESHOLD() external view returns (uint256);
  event ProposalCreated(uint256 indexed proposalId, address proposer);
  event Voted(uint256 indexed proposalId, address voter, bool support);
  event Executed(uint256 indexed proposalId);
}`}</pre>
            </div>
          </div>
        </section>
        <section className="p-6 rounded-lg border border-[#1e1e1e] bg-[#0f0f0f]">
          <div className="text-[10px] text-[#555] tracking-widest uppercase mb-4">build status</div>
          <div className="space-y-2">
            {[
              { item: 'Architecture docs', status: 'LIVE', color: '#00ff88' },
              { item: 'Contract interfaces', status: 'SPEC', color: '#ffcc00' },
              { item: 'BondingCurve.sol', status: 'IN PROGRESS', color: '#ffcc00' },
              { item: 'AgentRegistry.sol', status: 'IN PROGRESS', color: '#ffcc00' },
              { item: 'QuorumVault.sol', status: 'PENDING', color: '#555' },
              { item: 'Frontend', status: 'LIVE', color: '#00ff88' },
              { item: 'Testnet deploy', status: 'PENDING', color: '#555' },
            ].map((r) => (
              <div key={r.item} className="flex justify-between items-center text-[11px]">
                <span className="text-[#888]">{r.item}</span>
                <span style={{ color: r.color }} className="font-medium">{r.status}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}