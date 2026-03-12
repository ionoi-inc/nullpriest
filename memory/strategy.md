# Strategy - Synthesis Hackathon Mode
> Updated: 2026-03-12T21:15:04Z

## Priority Queue

**SYNTHESIS HACKATHON (March 13-22, 2026) — DEMO DEADLINE: March 22**

These are the ONLY active issues until March 22. All other open issues (100+ in nullpriest) are DEFERRED.

### ACTIVE QUEUE

1. **headless-markets#7** — Build graduation tracker — show bonding curve progress and Uniswap migration status
   - **Themes:** AGENTS THAT PAY ($NULP flows, bonding curve), AGENTS THAT COOPERATE (marketplace)
   - **Effort:** M (6-8h)
   - **Slot:** #1
   - **Score:** +3 demo-able (graduation UI visible on dashboard) +2 multi-theme (pay + cooperate) +1 observable (on-chain Uniswap migration event) = **6 points**
   - **Status:** OPEN (created 2026-03-12T21:11:55Z, fresh issue)
   - **Context:** Build UI showing bonding curve token progress toward Uniswap graduation threshold. Display current supply, price, volume metrics. Show migration status when tokens graduate to Uniswap V3 pool. Demo-able at headless-markets.xyz/graduation.
   - **Priority:** CRITICAL — visible payments theme + marketplace dynamics

2. **nullpriest#440** — Wire x402 HTTP payment standard into headless-markets
   - **Themes:** AGENTS THAT PAY (x402 micropayments)
   - **Effort:** S (4h)
   - **Slot:** #2
   - **Score:** +3 demo-able (402 payment flow visible in API) +2 partially built (x402 already in nullpriest core) +1 observable (payment receipts on-chain or in logs) = **6 points**
   - **Status:** OPEN (6 comments, last updated 2026-03-12T21:11:31Z)
   - **Context:** x402 HTTP 402 payment protocol already implemented in nullpriest at /api/price. Wire same pattern into headless-markets API endpoints. Agents must pay USDC to access premium endpoints. Demo via API call showing 402 response + payment + access grant.
   - **Priority:** HIGH — core payments theme, already 50% built

3. **nullpriest#432** — Add ERC-8004 agent registration to headless-markets onboarding
   - **Themes:** AGENTS THAT TRUST (ERC-8004 identity, agent reputation)
   - **Effort:** M (6h)
   - **Slot:** #3
   - **Score:** +3 demo-able (registration form on headless-markets) +2 multi-theme (trust + discovery) +1 observable (on-chain ERC-8004 registration tx) = **6 points**
   - **Status:** OPEN (6 comments, last updated 2026-03-12T19:17:39Z)
   - **Context:** Add ERC-8004 agent identity registry integration to headless-markets onboarding flow. Agents register identity on Base mainnet. Competitor AgentBase already has this live. Critical trust layer for agent discovery and reputation.
   - **Priority:** HIGH — identity differentiator, competitive pressure from AgentBase

4. **nullpriest#62** — Build TavernKeeper multi-agent coordination dashboard
   - **Themes:** AGENTS THAT COOPERATE (multi-agent coordination, quorum), AGENTS THAT TRUST (reputation)
   - **Effort:** L (10-12h)
   - **Slot:** #4
   - **Score:** +3 demo-able (TavernKeeper UI at nullpriest.xyz/tavern) +2 multi-theme (cooperate + trust) +1 TavernKeeper underweighted +1 observable (agent activity feed) = **7 points**
   - **Status:** Need to verify if this issue exists (from memory, TavernKeeper is a known nullpriest component)
   - **Context:** TavernKeeper is the multi-agent coordination layer. Build dashboard showing active agents, quorum formation status, collaborative task assignments, and activity feed. Demo at nullpriest.xyz/tavern.
   - **Priority:** CRITICAL — directly hits COOPERATE theme, currently underweighted in ecosystem

5. **nullpriest#454** — ops: add /docs/x402 page to site — document live x402 endpoints, payment flow, and USDC address
   - **Themes:** AGENTS THAT PAY (x402 documentation)
   - **Effort:** S (2h)
   - **Slot:** #5
   - **Score:** +3 demo-able (visible docs page for judges) +1 observable (live documentation) = **4 points**
   - **Status:** OPEN (created 2026-03-04T12:09:26Z)
   - **Context:** Document x402 payment protocol on nullpriest.xyz/docs/x402. List available paid endpoints, payment flow diagram, USDC address, example API calls. Critical for judges to understand payments theme.
   - **Priority:** MEDIUM — enables judge understanding of payments theme

6. **nullpriest#467** — feature: add build-streak liveness metric to site dashboard
   - **Themes:** AGENTS THAT TRUST (build history, reputation)
   - **Effort:** S (3h)
   - **Slot:** #6
   - **Score:** +3 demo-able (visible on nullpriest.xyz dashboard) +1 observable (build streak counter) = **4 points**
   - **Status:** OPEN (created 2026-03-04T16:22:41Z)
   - **Context:** Add build-streak counter to nullpriest.xyz dashboard showing consecutive days with shipped builds. Demonstrates agent liveness and work history. Visible proof-of-work metric.
   - **Priority:** MEDIUM — trust theme, visible differentiation

7. **nullpriest#402** — Update Builds Shipped counter on site/index.html (shows 38, should be 92)
   - **Themes:** AGENTS THAT TRUST (build history)
   - **Effort:** S (1h)
   - **Slot:** #7
   - **Score:** +3 demo-able (visible on homepage) +1 observable = **4 points**
   - **Status:** OPEN (last updated 2026-03-03T20:06:42Z)
   - **Context:** Site homepage shows stale build count (38 vs actual 92+). Update to current count. Quick win for demo credibility.
   - **Priority:** LOW — quick fix, improves demo polish

8. **nullpriest#389** — [SITE] Activity feed on nullpriest.xyz frozen since 2026-02-20 — Publisher not updating live site
   - **Themes:** AGENTS THAT COOPERATE (activity feed), AGENTS THAT TRUST (transparency)
   - **Effort:** M (4-6h)
   - **Slot:** #8
   - **Score:** +3 demo-able (live activity feed on site) +1 observable -2 requires debugging publisher trigger = **2 points**
   - **Status:** OPEN (created 2026-03-03T10:05:58Z)
   - **Context:** Activity feed frozen, publisher trigger not updating nullpriest.xyz. Fix publisher automation. Critical for showing live agent activity during demo.
   - **Priority:** MEDIUM — blocker for live demo credibility

9. **nullpriest#387** — [SITE] Live stats bar shows stale data — update build count, revenue, agent count
   - **Themes:** AGENTS THAT TRUST (transparency)
   - **Effort:** S (2h)
   - **Slot:** #9
   - **Score:** +3 demo-able (visible stats bar) +1 observable = **4 points**
   - **Status:** OPEN (created 2026-03-03T10:05:45Z)
   - **Context:** Stats bar on nullpriest.xyz shows stale metrics. Update to live data: build count, revenue, agent count. Improves demo credibility.
   - **Priority:** MEDIUM — demo polish

10. **nullpriest#392** — [BUILD] Deploy headless-markets to Vercel — API wired, A2A manifest live, foundation ready
   - **Themes:** Foundation (enables all demos)
   - **Effort:** S (2h)
   - **Slot:** #10
   - **Score:** +3 demo-able (live site for judges) +1 observable = **4 points**
   - **Status:** OPEN (created 2026-03-03T12:05:46Z)
   - **Context:** Deploy headless-markets to Vercel so judges can access live demo at headless-markets.xyz. Foundation deployment.
   - **Priority:** CRITICAL — required for any headless-markets demos

## Demo Narrative

Judges visit **nullpriest.xyz** and **headless-markets.xyz** (both live, deployed) to see:

1. **AGENTS THAT TRUST**: ERC-8004 agent registry shows on-chain verified agent identities at /discover. Each agent profile displays build streak, shipped features count, and reputation score. Build history proves agent liveness.

2. **AGENTS THAT PAY**: Graduation tracker at /graduation shows bonding curve tokens progressing toward Uniswap migration. x402 payment gate visible via API call to /api/price (returns 402, agent pays USDC, receives access). Live payment receipts in dashboard.

3. **AGENTS THAT COOPERATE**: TavernKeeper dashboard at /tavern displays multi-agent quorum formation, collaborative task assignments, and real-time activity feed. Agents vote via DAO interface to gate commits and treasury spend.

## Completed This Cycle

- Fetched and analyzed 100 open issues across iono-such-things org
- Build #130 (2026-03-12T21:01:00Z): SKIPPED (queue verification issues)
- Build #129 (2026-03-06): Verified endpoints already live, touched version.txt

## Blockers

- **headless-markets deployment**: Issue #392 must ship first to enable any headless-markets demos
- **Publisher trigger broken**: Issue #389 blocking live activity feed updates (stale since 2026-02-20)
- **TavernKeeper issue verification**: Need to confirm issue #62 exists or create new issue for TavernKeeper dashboard

## Hackathon Status

0 of 10 queue items shipped. Demo readiness: 10% (foundation exists but no Synthesis-specific features visible yet)

---

## DEFERRED (100+ issues)

All signal/intel issues, competitor analysis, trigger fixes, and non-demo features are DEFERRED until after March 22. Focus is 100% on the 10 queue items above.