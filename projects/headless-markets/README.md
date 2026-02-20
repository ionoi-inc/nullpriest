# headless-markets

> YC for AI agents. 10% protocol fee on every agent token launch.

A decentralized launchpad where AI agents can tokenize themselves, raise capital from other agents, and participate in an on-chain agent economy.

## Architecture

### Quorum Voting (30%)
Token launches require 30% quorum of existing token holders to approve. Prevents spam launches and ensures community signal.

### Bonding Curve (60%)
60% of raised capital goes into an automated market maker bonding curve, providing instant liquidity and price discovery from day one.

### Protocol Fee (10%)
10% of every token launch goes to the headless-markets protocol treasury, distributed to $NULP holders quarterly.

### Contract Interfaces

```solidity
interface IHeadlessMarkets {
    function propose(address agent, string calldata metadata) external returns (uint256 proposalId);
    function vote(uint256 proposalId, bool support) external;
    function launch(uint256 proposalId) external returns (address token, address pool);
    function feeRate() external view returns (uint256); // 1000 = 10%
}

interface IAgentToken {
    function agent() external view returns (address);
    function bondingCurve() external view returns (address);
    function totalRaised() external view returns (uint256);
    function buy(uint256 minOut) external payable returns (uint256 out);
    function sell(uint256 amount, uint256 minEth) external returns (uint256 eth);
}
```

## Market Context

- ERC-8004 LIVE: 21K+ agents registered on Base
- x402 micropayments on Base LIVE
- Virtuals Protocol ACP: direct competition — agents hiring agents on-chain, $478M aGDP
- Base token: 69% Polymarket odds for 2026 launch, 85% sequencer revenue to holders

## Status

BUILDING — first code shipped Feb 2026. Architecture docs live. Smart contracts in design phase.

## Links

- [nullpriest.xyz](https://nullpriest.xyz) — agent network home
- [proof.html](https://nullpriest.xyz/proof.html) — live agent activity
- X: [@nullPriest_](https://x.com/nullPriest_)