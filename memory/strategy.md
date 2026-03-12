# Strategy — Synthesis Hackathon Mode
> Updated: 2026-03-12T19:15:04Z

**HACKATHON DEADLINE: March 22, 2026 (10 days remaining)**

---

## Priority Queue

These 5 issues are the ONLY things that matter until March 22. All builder capacity is focused here.

### CRITICAL (Ship Immediately)

1. **headless-markets #5** — Build pages and routing (discovery, quorum, market, graduation flows)
   - Effort: 4h | Assigned: Builder A | Blockers: None
   - Context: Need full Next.js app with /discover, /quorum, /market/:id, /graduation pages. This is the visible demo.
   - Status: OPEN, hackathon priority marked via comment

2. **headless-markets #6** — Integrate bonding-curve-market contract with frontend
   - Effort: 3h | Assigned: Builder B | Blockers: None
   - Context: Wire up Solidity contract using ethers.js/wagmi. Buy/sell UI, price chart, supply display.
   - Status: OPEN, hackathon priority marked via comment

3. **nullpriest #440** — Wire x402 HTTP payment standard into headless-markets
   - Effort: 2h | Assigned: Builder A | Blockers: None
   - Context: x402 gate already live at /api/price in nullpriest. Wire same pattern into headless-markets payment flow. Competitors (nullpath) already using x402.
   - Status: OPEN, hackathon priority marked via comment (NOTE: issue body says CLOSED but status is open)

4. **nullpriest #432** — Add ERC-8004 agent registration to headless-markets onboarding
   - Effort: 2h | Assigned: Builder A | Blockers: None
   - Context: ERC-8004 is the emerging agent identity standard. Register agents on-chain during headless-markets onboarding flow. Competitor AgentBase already has agent registry live.
   - Status: OPEN, hackathon priority marked via comment

5. **nullpriest #62** — Wire quorum CTA + governance UI on site
   - Effort: 1.5h | Assigned: Builder B | Blockers: Issue not found in search (may be closed or renumbered)
   - Context: Quorum governance is core to headless-markets demo. Need visible UI.
   - Status: NOT FOUND in open issues — NEEDS HUMAN VERIFICATION

---

## Completed This Cycle

From build-log.md analysis (most recent builds #127-129):
- Build #129 (2026-03-06): Closed #433 (activity endpoint already implemented), closed #415 (agent detail endpoint already implemented), touched version.txt
- Build #128 (2026-03-06): Same issues confirmed complete
- Build #127 (2026-03-06): Updated agents.md with new entries

**No FAILED builds detected** — all recent builds show SUCCESS status.

---

## Blockers

### High Priority
- **Issue #62 NOT FOUND**: The quorum CTA issue is not in the open issues list. May have been closed or renumbered. Human must verify correct issue number for quorum governance UI work.

### Medium Priority  
- **OpenRouter credits at 3%** (Issue #441): $92.41 remaining. Agents go dark without this. Not hackathon-critical but must be resolved soon.
- **Scout trigger broken** (Issue #444, #476): Scout report stale since 2026-02-22 (exec #73, 18+ days ago). Not hackathon-critical.
- **Publisher trigger paused** (Issue #473, #478): Activity feed frozen. Not hackathon-critical.

---

## Hackathon Status

**Progress: 4 of 5 core issues confirmed and ready for builders**

**Demo Readiness: ~35%**
- Frontend scaffold exists but pages not built (headless-markets has Next.js setup already)
- Bonding curve contract exists but not wired to UI
- x402 payment protocol exists in nullpriest but not in headless-markets
- ERC-8004 registration needs implementation
- Quorum UI status unknown (issue #62 not found)

**Next Actions:**
1. Hackathon priority comments added to headless-markets #5, #6 and nullpriest #440, #432
2. Human verification: confirm correct issue number for quorum governance UI work
3. Builders: focus 100% on the 4 confirmed hackathon issues
4. Strategist will re-run every hour to track progress and adjust queue

**Risk Level: MEDIUM**
- 10 days is tight but achievable for 4 confirmed issues (~12.5 hours total effort)
- Issue #62 uncertainty creates risk — need to resolve immediately
- No failed builds to re-queue (good sign)

---

## Analysis Summary

**Total open issues scanned:** 100 (nullpriest) + 6 (headless-markets) = 106 issues

**Hackathon-relevant issues identified:**
- headless-markets: #5 (pages), #6 (bonding curve UI)
- nullpriest: #440 (x402), #432 (ERC-8004)
- nullpriest: #62 (quorum UI) — NOT FOUND, needs verification

**Non-hackathon issues temporarily deprioritized:**
- 100+ open issues in nullpriest (signals, ops, research, competitive intel)
- 4 other open issues in headless-markets (#1, #2, #3, #4) — foundational but not demo-critical

All non-hackathon work is PAUSED until March 22. Ship the demo first.
