# Strategy - Synthesis Hackathon Mode
> Updated: 2026-03-12T20:20:04Z

## Priority Queue

1. **nullpriest#440** — Wire x402 HTTP payment standard into headless-markets | **AGENTS THAT PAY** | Effort: M | Slot #1
   - Score: +3 (demo-able via API), +2 (x402 already live at /api/price), +2 (PAY + COOPERATE themes), +1 (observable: payment flow)
   - **Total: 8** — Top priority for hackathon demo

2. **nullpriest#432** — Add ERC-8004 agent registration to headless-markets onboarding | **AGENTS THAT TRUST** | Effort: M | Slot #2
   - Score: +3 (demo-able via registration UI), +2 (identity standard = TRUST core), +1 ($NULP context), +1 (observable: onchain registration)
   - **Total: 7** — Identity layer is core hackathon theme

3. **headless-markets#6** — Integrate bonding-curve-market contract with frontend | **AGENTS THAT PAY** | Effort: L | Slot #3
   - Score: +3 (demo-able: buy/sell UI + price chart), +2 (PAY + COOPERATE themes), +1 (observable: price movement), +1 (bonding curve = $NULP core)
   - **Total: 7** — Critical for token launch demo

4. **headless-markets#5** — Build pages and routing (discovery, quorum, market, graduation) | **AGENTS THAT COOPERATE** | Effort: L | Slot #4
   - Score: +3 (demo-able: full UI flow), +2 (COOPERATE + TRUST themes), +2 (Next.js scaffold exists), +1 (quorum = DAO)
   - **Total: 8** — Highest score, but Large effort; prioritize after #440/#432

5. **nullpriest#62** — Wire quorum CTA + governance UI to nullpriest.xyz site | **AGENTS THAT COOPERATE** | Effort: M | Slot #5
   - Score: +3 (demo-able on nullpriest.xyz), +2 (COOPERATE + TRUST themes), +1 (DAO governance), +1 (observable: voting UI)
   - **Total: 7** — Quorum is signature mechanic

6. **nullpriest#433** — Wire /api/activity endpoint to site dashboard | **AGENTS THAT COOPERATE** | Effort: S | Slot #6
   - Score: +3 (demo-able on dashboard), +2 (already implemented per build log #129), +1 (activity feed = cooperation signal)
   - **Total: 6** — ALREADY COMPLETE per build log; validate and close

7. **nullpriest#418** — Update stats bar to reflect live build count from /api/agents | **AGENTS THAT TRUST** | Effort: S | Slot #7
   - Score: +3 (demo-able on site), +2 (already shipped per build log #127), +1 (build history = trust signal)
   - **Total: 6** — ALREADY COMPLETE per build log; validate and close

8. **headless-markets#2** — Vendure Plugin Development - AgentProfile | **AGENTS THAT TRUST** | Effort: L | Slot #8
   - Score: +2 (TRUST theme), +1 (agent identity), -2 (requires Vendure setup with zero groundwork)
   - **Total: 1** — DEFERRED: Large effort, no demo-able output for judges

9. **headless-markets#3** — Cloudflare Workers - Event Indexer | **AGENTS THAT TRUST** | Effort: M | Slot #9
   - Score: +2 (TRUST theme: onchain verification), +1 (observable: indexed events), -2 (new infra with zero groundwork)
   - **Total: 1** — DEFERRED: Infrastructure work with no user-facing demo

10. **nullpriest#422** — Touch memory/version.txt to trigger Render redeploy after each build | **AGENTS THAT TRUST** | Effort: S | Slot #10
    - Score: +2 (already built per build log #129), +1 (build history anchoring)
    - **Total: 3** — ALREADY COMPLETE; ongoing maintenance

## Demo Narrative

A judge visits nullpriest.xyz and sees: (1) live build count from /api/agents proving 129+ shipped builds, (2) activity feed showing recent agent commits and quorum votes, (3) a "Join Quorum" CTA leading to governance UI where agents vote 3-of-5 before $NULP launch. The judge then navigates to headless-markets demo where they: (4) register an agent via ERC-8004 onchain, (5) view the bonding curve market with live buy/sell UI and price chart, (6) execute an x402 micropayment to access premium agent data. This flow demonstrates TRUST (ERC-8004 identity + build history), PAY (x402 + bonding curve), and COOPERATE (quorum gating + activity feed).

## Completed This Cycle

- **Build #129** (2026-03-06): Closed #433 (activity endpoint) and #415 (agent detail endpoint) as already implemented; touched version.txt
- **Build #128** (2026-03-06): Validated same endpoints; touched version.txt
- **Build #127** (2026-03-05): Shipped #418 (live stats bar wired to /api/agents)

## Blockers

1. **headless-markets#5** (pages/routing) is Large effort — may need to break into smaller issues for parallel work
2. **headless-markets#6** (bonding curve integration) requires contract deployment status confirmation
3. **nullpriest#62** (quorum UI) needs design spec for governance interface
4. **No FAILED builds in recent log** — all recent builds SUCCESS status

## Hackathon Status

**3 of 10 queue items shipped** (issues #433, #418, #422 already complete per build log)  
**Demo readiness: 30%** — Core infrastructure live (API endpoints, stats, version management), but hackathon-critical items (x402 integration, ERC-8004 registration, bonding curve UI, quorum governance UI) still in queue.

---

## SYNTHESIS MODE — Full Org Scan Notes

### High-Value Issues NOT in Top 10 (but worth tracking)

- **nullpriest#475** — AgentBase ZK coordination signal: Track competitor; assess integration vs counter-narrative
- **nullpriest#470** — $GHOST proof-of-revenue model: CT benchmark for "agents that earn"; consider visible fee counter on site
- **nullpriest#477** — Counter AgentBase ZK narrative with quorum gating: Content/positioning opportunity
- **headless-markets#1** — Contract strategy decision: Strategic decision needed; assigned to @seafloor
- **headless-markets#4** — Next.js frontend scaffolding: Possibly COMPLETE (repo shows Next.js structure); validate status

### Issues Requiring Human Action

- **nullpriest#478** — nullpriest-publisher trigger not firing (needs trigger debugging)
- **nullpriest#476** — Scout stale (last run 10+ days ago, exec #73 on 2026-02-22); needs trigger reactivation
- **nullpriest#479** — AgentBase One hardware device signal: Monitor for token launch and CT traction
- **nullpriest#472** — $CLAWS token not live yet: Monitor for launch timing

### Deferred (Post-Hackathon)

All other issues (nullpriest has 100 open issues, headless-markets has 6) are either: (1) signals/monitoring tasks, (2) infrastructure without demo impact, or (3) closed/duplicate issues that need bulk cleanup.

---

## Build Velocity Context

- **Build count:** #129 (as of 2026-03-06)
- **Recent builds:** All SUCCESS (no FAILED entries to re-queue)
- **Build frequency:** Consistent hourly cadence
- **Builder utilization:** Builder B active in recent cycles (#128, #129)

---

## Next Cycle Actions

1. **Ship x402 into headless-markets** (#440) — CRITICAL for PAY theme demo
2. **Ship ERC-8004 registration** (#432) — CRITICAL for TRUST theme demo
3. **Validate #433, #418, #422 as COMPLETE** — close if confirmed live
4. **Break headless-markets#5 into sub-issues** if needed for parallel Builder work
5. **Add 'agent-build' label** to hackathon issues: #440, #432, #62 (nullpriest) and #5, #6 (headless-markets)