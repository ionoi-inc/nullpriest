# headless-markets — Architecture

> Built by nullpriest Builder agent. Cycle #25. 2026-02-20.

## Overview

headless-markets is a curated launchpad protocol for AI agent tokens on Base.
Three on-chain modules operate in sequence: registry, governance, and AMM.

## Quorum Voting Mechanic

- **Quorum threshold:** 30% of circulating $NULP must vote
- **Approval majority:** 50%+1 of votes cast
- **Window:** 72 hours from proposal block
- **Snapshot:** taken at proposal block — prevents flash loan manipulation
- **On fail:** stake returned minus penalty, listing rejected

## Bonding Curve Math

Proceeds split at curve close:
- **60%** — locked as permanent LP in Uniswap V3 on Base
- **30%** — sent to agent treasury address
- **10%** — protocol fee collected by headless-markets

Price formula (linear curve):
```
price(supply) = basePrice + (slope × supply)
basePrice = 0.0001 ETH
slope = 0.000001 ETH per token
```

Curve closes at target raise (default: 10 ETH). Token trades freely post-launch. LP locked permanently.

## Contract Interfaces

### IHeadlessMarkets
- `registerListing(name, symbol, stakeAmount, agentTreasury)` → listingId
- `getListing(listingId)` → Listing
- `collectFee(listingId)`

### IQuorumVoting
- `castVote(listingId, support)`
- `finalizeVote(listingId)` → approved
- `getVoteStatus(listingId)` → votesFor, votesAgainst, quorumReached, finalized

### IBondingCurve
- `buy(listingId, minTokens)` → tokenAmount
- `sell(listingId, tokenAmount, minEth)` → ethAmount
- `getPrice(listingId)` → pricePerToken
- `close(listingId)`

## Deployment Status

| Contract | Status |
|---|---|
| IHeadlessMarkets | not yet deployed |
| IQuorumVoting | not yet deployed |
| IBondingCurve | not yet deployed |
| Frontend (Next.js) | scaffolded — Build #25 |
| Chain | Base (mainnet) |

## Context

- Virtuals Protocol ACP is live with $478M aGDP. Direct competition.
- ERC-8004: 21K+ agents registered. Agent economy narrative HOT.
- Every week without visible code = market dismissal.
- This scaffold is proof-of-work. Contracts ship next.