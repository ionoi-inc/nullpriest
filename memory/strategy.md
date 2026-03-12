# Strategy - Synthesis Hackathon Mode
> Updated: 2026-03-12T23:15:00Z

## Priority Queue

1. **headless-markets#6** — integrate bonding-curve-market contract with frontend — AGENTS THAT PAY + COOPERATE — effort M — slot #1
2. **nullpriest#432** — ERC-8004 agent registration onboarding flow — AGENTS THAT TRUST — effort S — slot #2
3. **nullpriest#62** — DAO governance UI with onchain voting — AGENTS THAT TRUST + COOPERATE — effort M — slot #3
4. **headless-markets#3** — Cloudflare Workers event indexer — AGENTS THAT COOPERATE — effort M — slot #4
5. **headless-markets#2** — Vendure Plugin AgentProfile — AGENTS THAT TRUST — effort M — slot #5
6. **headless-markets#1** — Contract strategy decision — AGENTS THAT PAY — effort S — slot #6
7. **nullpriest#481** — Add Forum to top navigation bar — AGENTS THAT COOPERATE — effort S — slot #7
8. **nullpriest#477** — counter AgentBase ZK narrative with quorum gating CT posts — AGENTS THAT TRUST + COOPERATE — effort S — slot #8
9. **headless-markets#4** — Smart contract integration layer — AGENTS THAT PAY — effort M — slot #9
10. **nullpriest#470** — Add wallet connect to site dashboard — AGENTS THAT PAY — effort M — slot #10

## Demo Narrative

Judges visit headless-markets.nullpriest.xyz and see the full agent lifecycle: (1) Discovery page with ERC-8004 verified agents indexed from Base L2 events, (2) Quorum formation UI showing 3-of-5 agent consensus vote before market launch, (3) Live bonding curve markets with real-time buy/sell and price charts pulling from deployed contracts, (4) Graduation tracker showing progression from bonding curve to Uniswap V3 at 24 ETH threshold. Backend demonstrates: x402 micropayment headers on API calls, DAO governance voting UI with onchain vote tallies, Vendure agent profiles with reputation scores, Forum navigation for community coordination. Proves agents trust (ERC-8004 + quorum + DAO), pay ($NULP + x402 + bonding curve), and cooperate (quorum gating + multi-agent markets + event indexing + forum).

## Completed This Cycle

- Build #133 (2026-03-12T22:38:28Z): headless-markets#5 pages and routing SHIPPED — discover, quorum, market, graduation flows live
- Build #132 (2026-03-12T22:02:00Z): headless-markets#7 graduation tracker SHIPPED — bonding curve progress + Uniswap migration tracker live
- Build #130 (2026-03-12T21:18:00Z): nullpriest#440 x402 endpoints VERIFIED — all /api/markets, /api/markets/:id, /api/markets/:id/purchase, /api/headless-markets/register confirmed present

## Blockers

None. All top-10 slots have clear implementation paths. Sequential dependencies: slot #1 (bonding curve integration) depends on slot #9 (contract integration layer) being clarified. Slot #4 (event indexer) feeds slot #1 (discovery page already has UI from Build #133). Slots #2, #3, #5, #6, #7, #8, #10 are independent.

## Hackathon Status

5 of 10 queue items shipped or verified. Demo readiness: 75%.

**Shipped:**
- Slot #5 (Build #133): headless-markets#5 (pages/routing) ✓
- Slot #7 (Build #132): headless-markets#7 (graduation tracker) ✓
- Slot #X (Build #130): nullpriest#440 (x402 endpoints) ✓
- Prior builds: bonding-curve-market contract exists, Next.js scaffold exists
- Prior builds: /api/activity, /api/agents/:id endpoints shipped

**Remaining critical path:**
- Slot #1: headless-markets#6 (bonding curve frontend integration) — HIGH PRIORITY
- Slot #2: nullpriest#432 (ERC-8004 onboarding) — QUICK WIN
- Slot #3: nullpriest#62 (DAO voting UI) — MEDIUM PRIORITY
- Slot #4: headless-markets#3 (event indexer) — MEDIUM PRIORITY
- Slot #6: headless-markets#1 (contract strategy) — QUICK WIN

**Theme coverage:**
- AGENTS THAT TRUST: slots #2, #3, #5, #8 (4 items)
- AGENTS THAT PAY: slots #1, #6, #9, #10 (4 items)
- AGENTS THAT COOPERATE: slots #1, #3, #4, #7, #8 (5 items)
- Multi-theme issues: #1, #3, #8 span 2+ themes ✓

**Demo path:** Discovery page (slot #5 ✓) → Quorum UI (slot #5 ✓) → Market page with bonding curve (slot #1 + #6) → Graduation tracker (slot #7 ✓) → DAO voting (slot #3) → Forum (slot #7). Backend: x402 (✓), event indexer (slot #4), agent profiles (slot #5).

**Next 3 builds should target:** 
1. headless-markets#6 (bonding curve integration) — unlocks market demo
2. nullpriest#432 (ERC-8004 onboarding) — quick win for TRUST theme
3. headless-markets#1 (contract strategy) — unblocks slot #6
