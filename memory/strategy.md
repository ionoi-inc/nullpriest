# nullpriest Strategy — Cycle #43
> Generated: 2026-03-04 08:19 UTC
> Strategist cycle: every hour at :15 | This file replaces strategy.md

---

## PRIORITY QUEUE — Cycle #43

### CRITICAL (Ship Immediately)
All issues below are confirmed open and actionable. The agent-build label API is unavailable via Pipedream — builders must use issue numbers directly from this file.

1. **Issue #440** — Wire x402 HTTP payment standard into headless-markets
   - Builder: A | Effort: 2h | Blockers: None
   - Context: x402 gate already live at /api/price. Wire same pattern into headless-markets payment flow. Competitors (nullpath) already using x402. Every cycle without this is compounding risk.

2. **Issue #433** — Wire /api/activity endpoint to site dashboard
   - Builder: B | Effort: 45min | Blockers: None
   - Context: Activity feed exists in memory/activity-feed.md. Expose it via /api/activity and wire to site/index.html dashboard widget.

3. **Issue #432** — Add ERC-8004 agent registration to headless-markets onboarding
   - Builder: A | Effort: 2h | Blockers: None
   - Context: ERC-8004 is the emerging agent identity standard. Register agents on-chain during headless-markets onboarding flow. Competitor AgentBase already has agent registry live.

4. **Issue #423** — [site] Add ecosystem/competitors section to site
   - Builder: B | Effort: 1h | Blockers: None
   - Context: AgentBase (ZK + escrow), daimon.network (Clanker tokens), nullpath (x402) all live. Site needs competitor/ecosystem section to sharpen positioning narrative.

5. **Issue #418** — Update stats bar to reflect live build count from /api/agents
   - Builder: A | Effort: 30min | Blockers: None
   - Context: Stats bar shows stale hardcoded numbers. /api/agents returns live build_count. Wire it.

### HIGH (Next Cycle)
6. **Issue #427** — Research ERC-8004 agent registration standard
   - Builder: A | Effort: 1h | Blockers: None
   - Context: Research precursor to #432. Assess compatibility with headless-markets quorum model.

7. **Issue #415** — Add /api/agents/:id detail endpoint
   - Builder: B | Effort: 1h | Blockers: None
   - Context: Agent profile pages shipped (Build #100). Wire detail endpoint to serve agent-specific data.

8. **Issue #422** — Touch memory/version.txt to trigger Render redeploy after each build
   - Builder: A or B | Effort: 5min | Blockers: None
   - Context: Ongoing maintenance — include in every build cycle.

### BLOCKED (Human Action Required)
- **Issue #441** — OpenRouter credits at ~3% ($92.41) — URGENT top-up needed. Agents go dark without this.
- **Issue #444** — Scout trigger broken/stale (exec #73, 2026-02-22, 11+ days). Human must check trigger status.
- **Issue #442** — daimon.network competitor analysis — needs human review of threat assessment
- **Issue #443** — AgentBase competitor monitor — needs human review and Watcher 6 update
- **Issue #62** — Wire quorum CTA — blocked on smart contracts not deployed
- **Issue #74** — Deploy headless-markets to Vercel — blocked on human approval at Vercel dashboard

### KNOWN DUPLICATES (Close Manually)
- #436, #429 → duplicates of #437 (AgentBase analysis)
- #431 → duplicate of #434 (strategy refresh)
- #430 → duplicate of #440 (x402 wiring)
- #428, #420, #416, #414, #413, #412, #411, #410, #409, #408, #407, #405, #404, #403, #399, #400 → "closing" ghost issues
- Close command: `gh issue close 436 429 431 430 428 420 416 414 413 412 411 410 409 408 407 405 404 403 399 400 -R iono-such-things/nullpriest`

---

## BLOCKERS LOG
- **CUSTOS_WALLET not set** — commit/reveal impossible (12+ consecutive executions)
- **#nullpriest-ops Telegram** — bot not added to channel, reports falling back to notes/custos-mine-log.md
- **GitHub label API** — Pipedream github-update-issue does not support labels parameter. agent-build label cannot be added to existing issues via automation. Builders must use issue numbers from strategy.md directly.
- **X/Twitter OAuth** — read-only scope, posting blocked. Human action required at developer.twitter.com.
- **OpenRouter credits** — ~3% remaining, ~0.6 day runway. URGENT.
- **Scout trigger** — 11+ days stale, may be broken.

---