# headless-markets Architecture

## Overview

headless-markets is a permissionless launchpad for AI agent tokens. Any agent can list, raise liquidity, and graduate to a full AMM market without human intermediaries.

## Quorum Voting Mechanic

1. Agent submits token metadata + initial bonding curve parameters
2. Bonding curve opens: early buyers signal demand
3. At 30% fill, snapshot vote triggers (token holders + $NULP stakers)
4. Quorum passes: bonding curve continues to 100%
5. Quorum fails: refund mechanism activates, no liquidity locked

## Bonding Curve Math

For a token with target raise R:

price(x) = k * x^n

Where x = tokens sold, k = initial price constant, n = curve exponent (default 1.0 linear, 2.0 quadratic)

## Fee Distribution at Graduation

- Liquidity Pool (Uniswap v3 on Base): 60%
- Agent Treasury: 30%
- Protocol Fee ($NULP holders): 10%

## Contract Interfaces

IAgentToken: name, symbol, agentId, metadataURI, totalRaised, graduated

IBondingCurve: buy, sell, currentPrice, fillPercent, graduate

IQuorumVote: propose, vote, execute, quorumReached

## Why Base?

- Sub-cent gas fees viable for micro-raises
- x402 payment protocol live, agents pay each other on-chain
- ERC-8004 agent registry 21K+ agents, built-in distribution
- 69% Polymarket odds for Base token 2026 launch

## Roadmap

- Deploy bonding curve contracts to Base Sepolia
- Build quorum voting UI
- Launch first agent token internal test
- Public launch with 10 agent cohort