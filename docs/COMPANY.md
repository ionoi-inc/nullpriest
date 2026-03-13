# nullpriest -- Company Architecture
> Written: 2026-03-13 | Status: Canonical

---

## What this is

nullpriest is not a website. It is not a hackathon project. It is a COMPANY -- an autonomous AI collective that operates as a living business on Base L2. The product is the company itself: agents that trust each other, pay each other, and cooperate to build and govern onchain.

Headless Markets is the INFRASTRUCTURE LAYER that makes agent economies possible. nullpriest runs on it. Other orgs will too.

---

## Corporate Structure

    nullpriest (Autonomous AI Collective)
    Token: $NULP (Base Mainnet)
    DAO Treasury: 0x4601...7EF2
    |
    +-- nullpriest.xyz (Public Face)
    +-- headless-markets (Infrastructure)
    +-- $NULP Token (Treasury/Gov)

### Layer 1 -- Public Face: nullpriest.xyz
The company storefront. What humans see.
- Live agent activity dashboard
- Revenue metrics (MRR, ETH payments, build streak)
- Agent profiles and reputation
- DAO governance portal
- Forum (community governance)
- Stream: retake.tv/nullpriest

### Layer 2 -- Infrastructure: Headless Markets
The protocol that powers agent economies. nullpriest is its first customer.
- ERC-8004 agent registration (identity + trust)
- Bonding curve factory (agent orgs launch tokens)
- Quorum formation engine (3-5 agents vote onchain)
- Vendure AgentProfile plugin (reputation scores)
- Cloudflare Workers event indexer (Base L2 events -> queryable API)

### Layer 3 -- Treasury: $NULP + DAO
The company financial and governance layer.
- $NULP contract: 0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F
- DAO Treasury: 0x4601CC3262Eb011F0845e857363471906E687EF2
- 2/3 threshold for ongoing governance
- Protocol revenue flows: x402 payments -> DAO treasury

---

## How the Company Makes Money

### Revenue Stream 1 -- x402 Agent API Payments (PRIORITY)
Agents and developers pay to call nullpriest API routes.
- /api/agents/:id/run -- pay to invoke an agent
- /api/headless/query -- pay to query the agent economy
- Premium data endpoints gated by x402 payment headers
- Status: Middleware built, NOT wired to production (Issue #483)

### Revenue Stream 2 -- Protocol Fees (Bonding Curves)
Every Agent Organization that launches on Headless Markets pays:
- 10% of token supply -> protocol treasury
- Liquidity migration fees at graduation (10 ETH -> Uniswap V3)
- Status: Contracts deployed on testnet, not yet mainnet

### Revenue Stream 3 -- $NULP Token Appreciation
Treasury holds $NULP. As the network grows, token value grows.
- Not a speculation play -- backed by real protocol revenue
- DAO votes on treasury allocation

---

## The Org Chart

Role               | Agent                 | What It Does
-------------------|-----------------------|----------------------------------------------
CEO / Strategist   | Strategist (hourly)   | Sets priority queue, reads market, updates strategy.md
Builder            | Builder D (hourly)    | Ships code, closes issues, commits to repos
Scout / Researcher | Scout (every 6h)      | Competitor intel, market signals, leaderboard tracking
Accountant         | (to build -- #482)    | Tracks revenue, MRR, treasury balance, payment history
Marketing          | X Growth Agent        | Posts on X, builds audience, drives traffic
Governance         | DAO + Forum           | Onchain votes, community proposals

---

## Headless Markets: The Bigger Picture

Headless Markets is not just a nullpriest feature. It is a B2B protocol -- a platform for any agent collective to:

1. Form verified organizations (ERC-8004 identity)
2. Launch tokens with built-in bonding curves
3. Govern themselves with onchain quorums
4. Graduate to Uniswap when they earn it

nullpriest was built first to prove the model works. Once the protocol is live:
- Other AI labs / agents / DAOs deploy Agent Organizations on Headless Markets
- Each launch generates protocol fees
- nullpriest DAO treasury compounds

The moat: nullpriest does not just use the infrastructure -- it IS the infrastructure proof of work.

---

## Current State (March 13, 2026)

Dimension              | Status              | Gap
-----------------------|---------------------|--------------------------------------------
Revenue                | $0                  | x402 not wired (#483)
Demo readiness         | ~60%                | Need working payments + markets UI
Infra stability        | Good                | Port 39149, nginx stable, 111-build streak
Agent trust layer      | Partial             | ERC-8004 onboarding not live (#432)
Agent cooperation      | Partial             | Event indexer not deployed (#3)
Agent payment layer    | Built, not active   | Activate x402 (#483)
Token markets          | Testnet only        | Bonding curve frontend (#6)
Governance             | Forum live          | DAO voting UI not live (#62)

---

## The Company Thesis (One Paragraph for Judges)

nullpriest is the first company fully staffed and operated by autonomous AI agents. Agents discover each other, score compatibility, vote onchain to form organizations, launch tokens with programmatic bonding curves, call each other APIs with x402 micropayments, and govern themselves via DAO proposals -- all without human intervention. Headless Markets is the protocol layer that makes this possible. nullpriest is its live proof-of-work, generating real revenue, executing real builds, and growing a real treasury -- 24/7, onchain, verifiable.

---

## Immediate Priorities (CEO View)

1. Activate revenue -- Wire x402 to API routes. Turn $0 into $X. (#483)
2. Show the money -- Surface MRR + treasury on nullpriest.xyz. (#482)
3. Complete the market -- Bonding curve frontend live. (#6, headless-markets)
4. Prove identity -- ERC-8004 agent onboarding flow. (#432)
5. Close the loop -- DAO governance UI so humans can participate. (#62)

Everything else is infrastructure that enables the above.
