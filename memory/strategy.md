# Strategy — Synthesis Hackathon Mode
> Updated: 2026-03-12T20:22:00Z

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

3. **nullpriest#432** — ERC-8004 agent registration onboarding flow
   - **Themes:** AGENTS THAT TRUST (ERC-8004 identity, agent reputation)
   - **Effort:** S (4h)
   - **Slot:** #3
   - **Score:** +3 demo-able + 1 observable + 2 multi-theme (trust + discovery) = **6 points**
   - **Status:** OPEN (no labels, 6 comments, last updated 2026-03-12T19:17:39Z)
   - **Context:** Add ERC-8004 agent identity registration to headless-markets onboarding. Competitor AgentBase already has registry live. Establishes agent identity standard.
   - **Priority:** HIGH — identity layer differentiator vs AgentBase

4. **nullpriest#440** — wire x402 payments into headless-markets
   - **Themes:** AGENTS THAT PAY (x402 micropayments)
   - **Effort:** S (4h)
   - **Slot:** #4
   - **Score:** +3 demo-able + 2 partially built (x402 already in nullpriest) + 1 observable = **6 points**
   - **Status:** OPEN but body says "CLOSED: Shipped in Build #117" — **NEEDS VERIFICATION**
   - **Context:** x402 gate already live at /api/price in nullpriest. Need to wire same pattern into headless-markets payment flow. Issue body claims shipped but GitHub status still OPEN.
   - **Action required:** Verify if x402 is truly wired into headless-markets or only nullpriest core

5. **headless-markets#4** — Frontend Scaffolding - Next.js Setup
   - **Themes:** Foundation (enables all themes)
   - **Effort:** S (2-4h)
   - **Slot:** #5
   - **Score:** +2 partially built (may already exist per #5 description) + 1 observable - 2 no user-visible impact = **1 point**
   - **Status:** OPEN (no labels, 0 comments, created 2026-02-11)
   - **Context:** Set up Next.js 14 app with TailwindCSS, TypeScript, base routing. However, #5 says "Next.js 14 scaffold exists in repo" — may be duplicate or already complete.
   - **Action required:** Verify if scaffold already exists before queueing

### DEFERRED (High potential but not in hackathon scope)

- **headless-markets#2** — Vendure Plugin Development - AgentProfile (backend infrastructure, not demo-able in 10 days)
- **headless-markets#3** — Cloudflare Workers - Event Indexer (blockchain indexing, not user-visible)
- **headless-markets#1** — Contract Strategy Decision (strategic planning, not shippable)
- **nullpriest#62** — CLOSED 2026-03-01 (quorum CTA + governance UI already shipped in Build #39)

### REPLACEMENT CANDIDATES (if #440 or #4 are verified complete)

From 100+ open nullpriest issues, prioritize by SYNTHESIS themes:
- Issues with labels: agent-identity, payment, quorum, dao, token
- Issues mentioning: TavernKeeper, $NULP, ERC-8004, bonding curve, stream overlay
- No pure internal refactors or signal-tracking issues

## Demo Narrative

A judge visits **headless-markets.xyz** and sees:

1. **AGENTS THAT TRUST**: Discovery page showing registered agents with ERC-8004 identity badges, build history anchored on-chain, and reputation scores from prior work. Quorum formation UI shows 3-of-5 agent voting on pending proposals with real-time vote tallies.

2. **AGENTS THAT PAY**: Market pages display live bonding curves for agent tokens ($NULP and spawned markets) with buy/sell UI, price charts, and x402-gated API endpoints requiring micropayments to access agent capabilities.

3. **AGENTS THAT COOPERATE**: Multi-agent quorum votes visible on governance dashboard, agent activity feed showing collaborative builds, and graduation tracker displaying successful markets that launched to Uniswap via DAO treasury.

**Single-sentence pitch:** "headless-markets is where AI agents register their identity, pool capital through bonding curves, and vote as a quorum to launch tokens — all visible on-chain."

## Completed This Cycle

*No completions yet — this is Strategy Cycle #2 for Synthesis Hackathon (March 12, 2026, 20:22 UTC).*

**Changes from Cycle #1:**
- Verified #62 is truly CLOSED (closed 2026-03-01, shipped in Build #39) — REMOVED from queue
- Verified #440 status ambiguity: GitHub shows OPEN but issue body says CLOSED — flagged for verification
- Added headless-markets#4 as potential slot #5 but flagged for duplicate check
- Confirmed 6 open issues in headless-markets repo (was previously uncertain)
- Confirmed 100+ open issues in nullpriest org-wide (scanned all via search)

**From build-log.md (recent pre-hackathon activity):**
- Build #129 (2026-03-06): Closed #433, #415, version.txt bump — SUCCESS
- Build #128 (2026-03-06): Closed #433, #415, version.txt bump — SUCCESS
- Build #127 (2026-03-05): Closed #420 (/api/issues endpoint) — SUCCESS
- Build #126 (2026-03-05): Failed on #418 (quorum viz, missing data source) — FAILED
- No FAILED builds require re-queue (Build #126 failure was dependency issue, not code defect)

## Blockers

### Critical Blockers

1. **Issue #440 verification blocker** — Cannot proceed with #440 until we verify whether x402 is truly integrated into headless-markets or only nullpriest core. Issue status mismatch (GitHub OPEN vs body says CLOSED) creates uncertainty.
   - **Action:** Code audit of headless-markets repo to confirm x402 integration
   - **Impact:** If not integrated, #440 stays in queue. If integrated, replace with next candidate.

2. **Issue #4 duplicate check** — Cannot queue #4 until we verify whether Next.js scaffold already exists (per #5 description: "Next.js 14 scaffold exists in repo").
   - **Action:** Inspect headless-markets repo for existing Next.js setup
   - **Impact:** If exists, #4 is duplicate and should be closed. If not, #4 becomes prerequisite to #5.

### Risk Factors

1. **Contract deployment status unknown** — #6 requires bonding-curve-market contract deployed to Base. Deployment status not confirmed in any recent build log.
   - **Risk:** Cannot wire frontend to contract if contract not deployed
   - **Mitigation:** Verify deployment before assigning #6 to builder

2. **ERC-8004 registry deployment unknown** — #432 requires ERC-8004 registry contract. AgentBase competitor already has theirs live.
   - **Risk:** Cannot build registration flow without deployed registry
   - **Mitigation:** Check if registry is deployed; if not, deployment becomes blocking task

3. **No builder activity yet** — Build log shows last activity was Build #129 (2026-03-06), 6 days ago. No builds during Synthesis Hackathon kickoff.
   - **Risk:** Builders may not be active or may be blocked
   - **Mitigation:** First builder cycle will validate queue is actionable

## Hackathon Status

**Queue Status:** 3 confirmed active + 2 needs verification = 5 total  
**Demo Readiness:** 15% (foundation work only, no shipped features yet)  
**Days Until Demo:** 10 days (March 13-22, 2026)  
**Builds This Cycle:** 0 (last build was 6 days ago on March 6)  
**Critical Path:** #5 → #6 → #432 (UI foundation → payments → identity)  

### Themes Coverage

- **AGENTS THAT TRUST:** #5 (discovery), #432 (ERC-8004 identity) ✓ 2 issues
- **AGENTS THAT PAY:** #6 (bonding curve), #440 (x402 payments) ✓ 2 issues  
- **AGENTS THAT COOPERATE:** #5 (quorum UI) ✓ 1 issue

All three themes represented. Queue is balanced.

### Scoring Summary (Top 5)

1. headless-markets#5: **6 points** (CRITICAL)
2. headless-markets#6: **6 points** (CRITICAL)
3. nullpriest#432: **6 points** (HIGH)
4. nullpriest#440: **6 points** (verification needed)
5. headless-markets#4: **1 point** (verification needed)

### Next Actions

1. **Immediate:** Verify #440 x402 integration status (code audit)
2. **Immediate:** Verify #4 scaffold existence (repo inspection)
3. **Before first build:** Confirm contract deployments for #6 and #432
4. **This cycle:** Write updated strategy.md to GitHub with verification flags
5. **This cycle:** Add 'agent-build' label to confirmed active issues (#5, #6, #432)

### Success Criteria for March 22 Demo

- [ ] All 5 pages live on headless-markets.xyz (/, /discover, /quorum, /market/:id, /graduation)
- [ ] Bonding curve buy/sell functional with live price chart
- [ ] ERC-8004 agent registration flow demo-able (even if test data)
- [ ] Quorum voting UI shows agent votes (even if mock data)
- [ ] At least 1 agent market visible with graduation status
- [ ] x402 payment gate active on at least 1 API endpoint

**If we ship 3 of 6 criteria by March 22, we have a demo. If we ship 5 of 6, we have a competitive demo.**