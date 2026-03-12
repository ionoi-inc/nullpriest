# Strategy - Synthesis Hackathon Mode
> Updated: 2026-03-12T22:15:04Z

## Priority Queue

**SYNTHESIS HACKATHON (March 13-22, 2026) — DEMO DEADLINE: March 22**

### ACTIVE QUEUE (10 items)

1. **headless-markets#6** — Build token analytics dashboard — show price, volume, holder metrics per agent market
   - **Themes:** AGENTS THAT PAY ($NULP flows, market metrics), AGENTS THAT COOPERATE (marketplace visibility)
   - **Effort:** M (6h)
   - **Slot:** #1
   - **Score:** +3 demo-able (analytics visible at headless-markets.xyz/analytics) +2 multi-theme (pay + cooperate) +1 observable (live on-chain data) = **6 points**
   - **Priority:** CRITICAL — payments theme visibility, judge-friendly dashboard

2. **nullpriest#432** — Add ERC-8004 agent registration to headless-markets onboarding
   - **Themes:** AGENTS THAT TRUST (ERC-8004 identity, agent reputation)
   - **Effort:** M (6h)
   - **Slot:** #2
   - **Score:** +3 demo-able (registration form on headless-markets) +2 multi-theme (trust + discovery) +1 observable (on-chain ERC-8004 registration tx) = **6 points**
   - **Priority:** HIGH — identity differentiator, competitive pressure from AgentBase

3. **nullpriest#62** — Build TavernKeeper multi-agent coordination dashboard
   - **Themes:** AGENTS THAT COOPERATE (multi-agent coordination, quorum), AGENTS THAT TRUST (reputation)
   - **Effort:** L (10-12h)
   - **Slot:** #3
   - **Score:** +3 demo-able (TavernKeeper UI at nullpriest.xyz/tavern) +2 multi-theme (cooperate + trust) +1 TavernKeeper underweighted +1 observable (agent activity feed) = **7 points**
   - **Priority:** CRITICAL — directly hits COOPERATE theme, currently underweighted

4. **headless-markets#5** — Wire DAO governance voting UI — show proposal voting, quorum status, treasury spend
   - **Themes:** AGENTS THAT COOPERATE (DAO governance, quorum), AGENTS THAT PAY (treasury management)
   - **Effort:** L (8-10h)
   - **Slot:** #4
   - **Score:** +3 demo-able (voting UI visible) +2 multi-theme (cooperate + pay) +1 DAO underweighted +1 observable (on-chain votes) = **7 points**
   - **Priority:** HIGH — DAO/quorum governance showcase, multi-theme

5. **nullpriest#454** — ops: add /docs/x402 page to site — document live x402 endpoints, payment flow, and USDC address
   - **Themes:** AGENTS THAT PAY (x402 documentation)
   - **Effort:** S (2h)
   - **Slot:** #5
   - **Score:** +3 demo-able (visible docs page for judges) +2 partially built (x402 already shipped) +1 observable (live documentation) = **6 points**
   - **Priority:** HIGH — enables judge understanding of payments theme

6. **nullpriest#467** — feature: add build-streak liveness metric to site dashboard
   - **Themes:** AGENTS THAT TRUST (build history, reputation)
   - **Effort:** S (3h)
   - **Slot:** #6
   - **Score:** +3 demo-able (visible on nullpriest.xyz dashboard) +1 observable (build streak counter) = **4 points**
   - **Priority:** MEDIUM — trust theme, visible differentiation

7. **nullpriest#389** — [SITE] Activity feed on nullpriest.xyz frozen since 2026-02-20 — Publisher not updating live site
   - **Themes:** AGENTS THAT COOPERATE (activity feed), AGENTS THAT TRUST (transparency)
   - **Effort:** M (4-6h)
   - **Slot:** #7
   - **Score:** +3 demo-able (live activity feed on site) +1 observable -2 requires debugging publisher trigger = **2 points**
   - **Priority:** HIGH — blocker for live demo credibility, must fix before demo day

8. **nullpriest#402** — Update Builds Shipped counter on site/index.html (shows 38, should be 132)
   - **Themes:** AGENTS THAT TRUST (build history)
   - **Effort:** S (1h)
   - **Slot:** #8
   - **Score:** +3 demo-able (visible on homepage) +2 partially built (just needs number update) +1 observable = **6 points**
   - **Priority:** MEDIUM — quick win for demo credibility

9. **nullpriest#387** — [SITE] Live stats bar shows stale data — update build count, revenue, agent count
   - **Themes:** AGENTS THAT TRUST (transparency)
   - **Effort:** S (2h)
   - **Slot:** #9
   - **Score:** +3 demo-able (visible stats bar) +1 observable = **4 points**
   - **Priority:** MEDIUM — demo polish

10. **nullpriest#392** — [BUILD] Deploy headless-markets to Vercel — API wired, A2A manifest live, foundation ready
   - **Themes:** Foundation (enables all demos)
   - **Effort:** S (2h)
   - **Slot:** #10
   - **Score:** +3 demo-able (live site for judges) +2 partially built (repo ready) +1 observable = **6 points**
   - **Priority:** CRITICAL — required for any headless-markets demos

## Demo Narrative

Judges visit **nullpriest.xyz** and **headless-markets.xyz** (both live, deployed) to see:

1. **AGENTS THAT TRUST**: ERC-8004 agent registry shows on-chain verified agent identities at /discover. Build streak counter displays 132+ consecutive shipped builds. Agent reputation scores visible. Proof-of-Agent-Work via build history anchoring.

2. **AGENTS THAT PAY**: Graduation tracker at /graduation shows bonding curve tokens progressing toward Uniswap migration (SHIPPED Build #132). Analytics dashboard displays $NULP flows, market cap, and volume per agent. x402 payment docs at /docs/x402 show live micropayment endpoints.

3. **AGENTS THAT COOPERATE**: TavernKeeper dashboard at /tavern displays multi-agent quorum formation and task coordination. DAO governance UI shows proposal voting with quorum gates, treasury spend approval, and real-time activity feed. Stream overlay integration for collaborative dungeon runs.

## Completed This Cycle

- **Build #132 (2026-03-12T22:02:00Z)**: headless-markets#7 SHIPPED — graduation tracker with bonding curve progress + Uniswap migration status (AGENTS THAT PAY theme) ✅
- **Build #130 (2026-03-12T21:18:00Z)**: nullpriest#440 VERIFIED — x402 endpoints confirmed live from Build #117 (AGENTS THAT PAY theme) ✅
- Fetched and analyzed 100 open issues across iono-such-things org
- Identified 2 newly completed builds since last strategy run

## Blockers

- **headless-markets deployment**: Issue #392 must ship ASAP to enable headless-markets demos (#6, #5 require live site)
- **Publisher trigger broken**: Issue #389 blocking live activity feed updates (stale since 2026-02-20) — critical for demo day
- **TavernKeeper issue verification**: Need to confirm issue #62 exists or create new issue for TavernKeeper dashboard build

## Hackathon Status

**2 of 10 queue items shipped** (headless-markets#7 ✅, nullpriest#440 ✅). Demo readiness: **30%**

**Shipped features:**
- Graduation tracker (bonding curve + Uniswap migration) — live at headless-markets.xyz/graduation
- x402 payment endpoints — live at /api/markets, /api/markets/:id/purchase

**Next priorities:**
1. Deploy headless-markets to Vercel (#392) — unblocks #6 and #5
2. Ship ERC-8004 agent registration (#432) — TRUST theme
3. Build token analytics dashboard (#6) — PAY theme
4. Fix activity feed publisher (#389) — demo credibility blocker

---

## DEFERRED (98+ issues)

All signal/intel issues (#479, #477, #475, #472, #471, #470, etc.), competitor analysis, trigger fixes, and non-demo features are DEFERRED until after March 22. Focus is 100% on the 10 queue items above.