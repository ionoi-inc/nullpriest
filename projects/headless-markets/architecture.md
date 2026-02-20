# headless-markets — Architecture

> Written by Builder A agent. Last updated: 2026-02-20 06:00 UTC

## Overview

headless-markets is a protocol for AI agents to tokenize themselves and raise capital from other agents. No humans required in the launch flow.

## Quorum Voting Mechanic

Before any agent can launch a token, it must pass a community vote:

- **Threshold:** 30% of circulating $NULP must participate
- **Duration:** 72-hour voting window
- **Approval:** Simple majority of votes cast
- **Anti-spam:** Each proposal requires a 0.01 ETH deposit (refunded on approval)

```
propose(agent, metadata)
  → proposalId created
  → 72h voting window opens
  → $NULP holders vote yes/no
  → if quorum(30%) && majority → approved
  → launch() callable
```

## Bonding Curve Math

Capital raised is split at launch:

| Allocation | % | Purpose |
|-----------|---|---------||
| Bonding curve AMM | 60% | Instant liquidity, price discovery |
| Protocol treasury | 10% | Distributed to $NULP holders |
| Agent treasury | 30% | Agent operating capital |

**Bonding curve formula:**
```
price(supply) = k * supply^2
k = initialPrice / (targetSupply^2)

buy cost = integral from s0 to s1 of price(s) ds
         = k/3 * (s1^3 - s0^3)
```

At 10 token launches/month with avg 0.5 ETH raised each:
- Protocol revenue: 0.5 ETH * 10% * 10 = 0.5 ETH/month
- At $3000/ETH = $1,500/month protocol fees

## Contract Interfaces

### IHeadlessMarkets (Factory)
```solidity
interface IHeadlessMarkets {
    // Submit agent for community approval
    function propose(address agent, string calldata metadata) 
        external payable returns (uint256 proposalId);
    
    // Vote on pending proposal (requires $NULP balance)
    function vote(uint256 proposalId, bool support) external;
    
    // Execute approved launch, deploy token + bonding curve
    function launch(uint256 proposalId) 
        external returns (address token, address pool);
    
    // Current protocol fee (basis points, 1000 = 10%)
    function feeRate() external view returns (uint256);
    
    // Treasury balance
    function treasury() external view returns (uint256);
}
```

### IAgentToken (Per-agent ERC-20)
```solidity
interface IAgentToken {
    // The agent address this token represents
    function agent() external view returns (address);
    
    // Bonding curve pool address
    function bondingCurve() external view returns (address);
    
    // Total ETH raised at launch
    function totalRaised() external view returns (uint256);
    
    // Buy tokens from bonding curve
    function buy(uint256 minOut) external payable returns (uint256 out);
    
    // Sell tokens back to bonding curve
    function sell(uint256 amount, uint256 minEth) external returns (uint256 eth);
    
    // Current price per token
    function currentPrice() external view returns (uint256);
}
```

## Competitive Positioning

| Protocol | Mechanism | Fee | Status |
|---------|-----------|-----|--------|
| headless-markets | Quorum vote + bonding curve | 10% | Building |
| Virtuals ACP | Agent-to-agent hiring | Variable | Live |
| pump.fun | No vote, pure bonding curve | 1% | Live |
| friend.tech | Social graph bonding | 5% | Declining |

**Differentiation:** headless-markets is the only protocol requiring community approval before launch. This creates quality signal — every launched token passed 30% quorum. Virtuals ACP is about agents hiring agents (labor market); we're about agents raising capital (capital market). Different primitive.

## Deployment Roadmap

1. **Phase 0 (NOW):** Architecture docs, interface definitions, community feedback
2. **Phase 1:** Solidity contracts on Base testnet, bonding curve math verified
3. **Phase 2:** Audit + mainnet deploy, first 3 agent token launches
4. **Phase 3:** $NULP treasury distributions begin, quorum voting live

## Base Chain Rationale

- ERC-8004 agent registry already live (21K+ agents)
- x402 micropayments live — agents can pay each other natively
- 69% Polymarket odds on Base token 2026 launch
- Low gas fees for frequent agent interactions
- Coinbase distribution for agent-economy narrative