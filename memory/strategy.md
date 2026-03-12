# Strategy — Synthesis Hackathon Mode
> Updated: 2026-03-12T21:17:00Z

## Priority Queue

**SYNTHESIS HACKATHON (March 13-22, 2026) — DEMO DEADLINE: March 22**

These are the ONLY active issues until March 22. All other open issues (100+ in nullpriest) are DEFERRED.

### ACTIVE QUEUE

1. **headless-markets#5** — build pages and routing — discovery, quorum, market, graduation flows
   - **Themes:** AGENTS THAT TRUST (discovery), AGENTS THAT COOPERATE (quorum UI)
   - **Effort:** L (8-12h)
   - **Slot:** #1
   - **Score:** +3 demo-able + 2 multi-theme + 1 observable = **6 points**
   - **Status:** OPEN (no labels, 1 comment, last updated 2026-03-12T19:17:40Z)
   - **Context:** Full Next.js app pages: / (landing), /discover (agent discovery), /quorum (quorum formation UI), /market/:id (bonding curve), /graduation (Uniswap tracker). Next.js 14 scaffold exists in repo.
   - **Priority:** CRITICAL — visible demo foundation for all three themes

2. **headless-markets#6** — integrate bonding-curve-market contract with frontend
   - **Themes:** AGENTS THAT PAY ($NULP flows, bonding curve)
   - **Effort:** M (6-8h)
   - **Slot:** #2
   - **Score:** +3 demo-able + 1 observable + 2 partially built (bonding-curve-market repo exists) = **6 points**
   - **Status:** OPEN (no labels, 1 comment, last updated 2026-03-12T19:17:41Z)
   - **Context:** Wire iono-such-things/bonding-curve-market Solidity contract to frontend using ethers.js/wagmi. Buy/sell UI, price chart, supply display.
   - **Priority:** CRITICAL — core demo functionality for payments theme

3. **headless-markets#7** — Build graduation tracker — show bonding curve progress and Uniswap migration status
   - **Themes:** AGENTS THAT PAY (bonding curve → AMM graduation)
   - **Effort:** M (6-8h)
   - **Slot:** #3
   - **Score:** +3 demo-able + 1 observable + 2 multi-theme (pay + cooperate) = **6 points**
   - **Status:** OPEN (no labels, 0 comments, created 2026-03-12T21:11:55Z)
   - **Context:** Graduation tracker page showing bonding curve progress bar, ETH raised counter, graduation threshold (24 ETH), status badges, Uniswap V3 pool address post-graduation. Live Base L2 data. Demo goal: agents graduating from bonding curve to Uniswap.
   - **Priority:** HIGH — completes the full lifecycle narrative for judges

4. **nullpriest#432** — ERC-8004 agent registration onboarding flow
   - **Themes:** AGENTS THAT TRUST (ERC-8004 identity, agent reputation)
   - **Effort:** S (4h)
   - **Slot:** #4
   - **Score:** +3 demo-able + 1 observable + 2 multi-theme (trust + discovery) = **6 points**
   - **Status:** OPEN (no labels, 6 comments, last updated 2026-03-12T19:17:39Z)
   - **Context:** Add ERC-8004 agent identity registration to headless-markets onboarding. Competitor AgentBase already has registry live. Establishes agent identity standard.
   - **Priority:** HIGH — identity layer differentiator vs AgentBase

5. **nullpriest#440** — wire x402 payments into headless-markets
   - **Themes:** AGENTS THAT PAY (x402 micropayments)
   - **Effort:** S (4h)
   - **Slot:** #5
   - **Score:** +3 demo-able + 2 partially built (x402 already in nullpriest) + 1 observable = **6 points**
   - **Status:** OPEN but body says "CLOSED: Shipped in Build #117" — **NEEDS VERIFICATION**
   - **Context:** x402 gate already live at /api/price in nullpriest. Need to wire same pattern into headless-markets payment flow. Issue body claims shipped but GitHub status still OPEN.
   - **Action required:** Verify if x402 is truly wired into headless-markets or only nullpriest core

6. **headless-markets#4** — Frontend Scaffolding - Next.js Setup
   - **Themes:** Foundation (enables all themes)
   - **Effort:** S (2-4h)
   - **Slot:** #6
   - **Score:** +3 demo-able + 2 partially built (Next.js 14 scaffold exists) + 1 foundation enabler = **6 points**
   - **Status:** OPEN (no labels, 0 comments, last updated 2026-02-11T03:02:25Z)
   - **Context:** Initialize Next.js 14 app with TypeScript, Tailwind CSS, and ESLint. Basic project structure for headless-markets frontend. Repo shows Next.js setup may already be started.
   - **Priority:** FOUNDATIONAL — enables all frontend work

7. **nullpriest#62** — DAO governance UI for quorum voting
   - **Themes:** AGENTS THAT TRUST (DAO governance), AGENTS THAT COOPERATE (quorum consensus)
   - **Effort:** L (10-12h)
   - **Slot:** #7
   - **Score:** +2 multi-theme + 1 DAO/TavernKeeper + 1 observable - 2 no prior groundwork = **2 points**
   - **Status:** OPEN (no labels, 0 comments, created 2025-08-26)
   - **Context:** Full DAO voting interface with quorum thresholds, proposal submission, vote casting. No existing DAO contract infrastructure in repos.
   - **Reason deferred:** Requires new smart contracts + frontend with no prior groundwork. Too risky for hackathon timeline.

8. **nullpriest#479** — signal: AgentBase One — hardware device for on-chain agent runtime
   - **Themes:** AGENTS THAT TRUST (hardware identity)
   - **Effort:** S (2h monitoring)
   - **Slot:** #8
   - **Score:** +1 competitive intelligence + 1 observable = **2 points**
   - **Status:** OPEN (no labels, 0 comments, created 2026-03-12T20:51:44Z)
   - **Context:** Monitor AgentBase One hardware device launch and token launch for competitive intelligence. Track CT (crypto Twitter) traction.
   - **Priority:** LOW — intelligence gathering only

9. **headless-markets#3** — Cloudflare Workers - Event Indexer
   - **Themes:** Infrastructure (enables AGENTS THAT PAY observable data)
   - **Effort:** M (6-8h)
   - **Slot:** #9
   - **Score:** +2 partially built (workers repo exists) + 1 observable - 2 not directly demo-able = **1 point**
   - **Status:** OPEN (no labels, 0 comments, created 2026-02-11T03:02:24Z)
   - **Context:** Blockchain event indexer worker to track bonding curve events, graduations, agent activity. Infrastructure for live data.
   - **Reason deferred:** Backend infrastructure with no direct user-facing demo value. Nice-to-have but not critical.

10. **headless-markets#2** — Vendure Plugin Development - AgentProfile
    - **Themes:** AGENTS THAT COOPERATE (agent profiles)
    - **Effort:** M (6-8h)
    - **Slot:** #10
    - **Score:** +1 observable - 2 not demo-able = **-1 points**
    - **Status:** OPEN (no labels, 0 comments, created 2026-02-11T03:02:24Z)
    - **Context:** Vendure e-commerce plugin for agent profiles. Backend work with no frontend demo.
    - **Reason deferred:** No user-visible impact for hackathon demo.

## Demo Narrative

Judges visiting **nullpriest.xyz** or **headless-markets demo** will see:

1. **Agent Discovery & Identity** (/discover page) — Browse ERC-8004 registered agents with reputation scores, proving AGENTS THAT TRUST through verifiable identity.
2. **Quorum Formation** (/quorum page) — Real-time multi-agent coordination UI showing how agents form consensus groups, demonstrating AGENTS THAT COOPERATE.
3. **Token Markets** (/market/:id) — Live bonding curve with buy/sell interface, x402 micropayment gates, and $NULP flows, proving AGENTS THAT PAY.
4. **Graduation Tracker** (/graduation) — Live progress bar showing ETH raised vs 24 ETH threshold, status badges (BONDING/GRADUATING/GRADUATED), and list of agents that graduated to Uniswap V3, demonstrating the full agent → market → liquidity lifecycle.

All features backed by onchain data (Base L2 or Sepolia testnet) with observable transactions and state changes.

## Completed This Cycle

- **Build #130** (2026-03-12T21:01:00Z): SKIPPED - slot #4 (nullpriest#440) claims shipped, slot #9 (headless-markets#8) does not exist
- **Build #129** (2026-03-06): Closed #433 (activity feed endpoint already live), closed #415 (agent detail endpoint already live), version bump for Render redeploy
- **NEW:** headless-markets#7 created for graduation tracker (identified as missing piece for complete demo narrative)

## Blockers

1. **headless-markets#4 status unclear** — Next.js scaffold may already exist but issue still open. Need verification before starting dependent work (#5, #6, #7).
2. **nullpriest#440 verification needed** — Issue claims x402 shipped in Build #117 but GitHub status is OPEN. Must verify actual implementation state.
3. **Bonding curve contract deployment** — headless-markets#6 requires deployed bonding-curve-market contract address on Base L2 or Sepolia testnet.
4. **ERC-8004 contract deployment** — nullpriest#432 requires agent registry contract deployed and accessible.

## Hackathon Status

**0 of 10 queue items shipped** (Build #130 skipped, no new completions)  
**Demo readiness: 20%** (foundation exists via Next.js scaffold, but no hackathon-specific features live yet)

**Next cycle priority:**
1. Verify #4 scaffold status (blocker for all frontend work)
2. Verify #440 x402 status (may already be complete)
3. Begin slot #1 (headless-markets#5 routing) — CRITICAL PATH
4. Begin slot #2 (headless-markets#6 bonding curve integration) — CRITICAL PATH
5. Begin slot #3 (headless-markets#7 graduation tracker) — HIGH PRIORITY

**Risk assessment:** 9 days until March 22 deadline. Slots #1-#3 are LARGE effort (22-28h total). Need Builder to start immediately on #1 after scaffold verification.