# headless-markets Architecture

> Last updated: 2026-02-20 | Built by nullpriest autonomous agent network

---

## Overview

headless-markets is a permissionless protocol for launching and funding AI agent tokens on Base. It combines quorum voting mechanics with a bonding curve to create a self-sustaining funding mechanism for the emerging agent economy.

---

## Core Mechanics

### Quorum Voting (30%)

Before a market activates, 30% of the total token supply must be committed by independent participants. This prevents rug pulls by requiring genuine community interest before liquidity is locked.

- Commitment period: 72 hours from launch
- Quorum threshold: 30% of total supply
- If quorum is not reached: all funds are returned automatically
- If quorum is reached: market activates and bonding curve opens

### Bonding Curve (60%)

60% of the total token supply is sold via an automated bonding curve. Price increases monotonically with each purchase, rewarding early participants.

```
P(x) = k * x^2

where:
  P(x) = price at supply point x
  k    = curve constant (set at launch)
  x    = tokens sold so far
```

**Fee split on bonding curve purchases:**
- 90% → bonding curve reserve (backs token price)
- 10% → headless-markets protocol treasury

### Protocol Fee (10%)

Every token launch generates a 10% protocol fee collected by the headless-markets treasury. This fee applies to:
- Initial bonding curve purchases
- Secondary market trades routed through the protocol
- Agent service revenue sharing (future)

**Projected revenue at scale:**
- 10 token launches/month × avg $50K raised = $5,000/month protocol fees
- 50 HVAC customers × $99/mo = $4,950 MRR (nullpriest products)
- Total projected: ~$10K MRR

---

## Contract Interfaces

### IHeadlessMarketFactory

```solidity
interface IHeadlessMarketFactory {
    /// @notice Deploy a new agent token market
    /// @param name Token name (e.g. "AXIOM Agent")
    /// @param symbol Token symbol (e.g. "AXIOM")
    /// @param totalSupply Total token supply (18 decimals)
    /// @param curveConstant Bonding curve k value
    /// @return market Address of the deployed market contract
    function launchMarket(
        string calldata name,
        string calldata symbol,
        uint256 totalSupply,
        uint256 curveConstant
    ) external returns (address market);

    /// @notice Get all deployed markets
    function getMarkets() external view returns (address[] memory);

    /// @notice Protocol fee in basis points (1000 = 10%)
    function protocolFeeBps() external view returns (uint256);
}
```

### IHeadlessMarket

```solidity
interface IHeadlessMarket {
    enum MarketState { PENDING, QUORUM, ACTIVE, FAILED }

    /// @notice Current market state
    function state() external view returns (MarketState);

    /// @notice Commit tokens during quorum phase
    function commit(uint256 amount) external payable;

    /// @notice Buy tokens on bonding curve (ACTIVE state only)
    function buy(uint256 minOut) external payable returns (uint256 tokensOut);

    /// @notice Sell tokens back to bonding curve
    function sell(uint256 tokenAmount, uint256 minEthOut) external returns (uint256 ethOut);

    /// @notice Current price per token
    function currentPrice() external view returns (uint256);

    /// @notice Total ETH raised
    function totalRaised() external view returns (uint256);

    /// @notice Quorum progress (0-100)
    function quorumProgress() external view returns (uint256);
}
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                  headless-markets                    │
│                                                      │
│  ┌──────────────┐      ┌────────────────────────┐   │
│  │   Factory    │─────▶│      Market (per        │   │
│  │  Contract    │      │      agent token)       │   │
│  └──────────────┘      │                        │   │
│                         │  ┌──────────────────┐ │   │
│                         │  │  Quorum Phase    │ │   │
│                         │  │  30% threshold   │ │   │
│                         │  └────────┬─────────┘ │   │
│                         │           │ activate   │   │
│                         │  ┌────────▼─────────┐ │   │
│                         │  │  Bonding Curve   │ │   │
│                         │  │  60% supply      │ │   │
│                         │  │  P(x) = k*x^2    │ │   │
│                         │  └────────┬─────────┘ │   │
│                         │           │ 10% fee    │   │
│                         └───────────┼────────────┘   │
│                                     │                 │
│                         ┌───────────▼────────────┐   │
│                         │   Protocol Treasury     │   │
│                         │   nullpriest.xyz        │   │
│                         └────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## Token Distribution

| Allocation | Percentage | Notes |
|------------|-----------|-------|
| Bonding curve | 60% | Sold to public via curve |
| Agent reserve | 30% | Held by agent / founding team |
| Protocol fee | 10% | headless-markets treasury |

---

## Network

- **Chain**: Base (Ethereum L2)
- **Standard**: ERC-20 + custom bonding curve
- **Related**: ERC-8004 agent registry (21K+ agents registered)
- **Payment**: x402 micropayments on Base

---

## Status

Current status: **BUILDING** — first contracts in development. Architecture finalized. Waitlist open.

- GitHub: https://github.com/iono-such-things/nullpriest
- Twitter: https://x.com/nullPriest_
- Telegram: https://t.me/nullpriest
