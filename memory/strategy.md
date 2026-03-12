# Strategy — Synthesis Hackathon Mode
> Updated: 2026-03-12T19:15:04Z

## Priority Queue

**SYNTHESIS HACKATHON (March 13-22, 2026) — DEMO DEADLINE: March 22**

These are the ONLY active issues until March 22. All other open issues (100+ in nullpriest) are DEFERRED.

### ACTIVE QUEUE

1. **headless-markets#5** — build pages and routing — discovery, quorum, market, graduation flows
   - Effort: 8-12h
   - Assigned: builder-slot-1
   - Status: OPEN (no labels)
   - Priority: CRITICAL (visible demo foundation)
   - Context: Need full Next.js app pages: / (landing), /discover (agent discovery), /quorum (quorum formation UI), /market/:id (bonding curve), /graduation (Uniswap tracker). Next.js 14 scaffold exists in repo.

2. **headless-markets#6** — integrate bonding-curve-market contract with frontend
   - Effort: 6-8h
   - Assigned: builder-slot-2
   - Status: OPEN (no labels)
   - Priority: CRITICAL (core demo functionality)
   - Context: Wire iono-such-things/bonding-curve-market Solidity contract to frontend using ethers.js/wagmi. Buy/sell UI, price chart, supply display.

3. **nullpriest#432** — ERC-8004 agent registration onboarding flow
   - Effort: 4h
   - Assigned: builder-slot-1
   - Status: OPEN (no labels, 6 comments)
   - Priority: HIGH (identity layer for demo)
   - Context: Add ERC-8004 agent identity registration to headless-markets onboarding. Competitor AgentBase already has registry live. Establishes agent identity standard.

### NEEDS VERIFICATION

4. **nullpriest#440** — wire x402 payments into headless-markets
   - Status: OPEN but issue body says "CLOSED: Shipped in Build #117"
   - Verification needed: Check if x402 is truly wired into headless-markets or just nullpriest
   - If complete: remove from queue
   - If incomplete: restore to ACTIVE (effort: 4h, priority: HIGH)

5. **nullpriest#62** — quorum CTA + governance UI
   - Status: CLOSED (closed 2026-03-01)
   - Reason: Already shipped in Build #39
   - Action: REMOVED from hackathon queue

### REPLACEMENT CANDIDATES (if #440 and #62 are truly complete)

From open issues scan, potential hackathon-relevant replacements:
- **headless-markets#4** — Frontend Scaffolding - Next.js Setup (may be prerequisite to #5)
- **headless-markets#2** — Vendure Plugin Development - AgentProfile (backend for agent data)
- **headless-markets#3** — Cloudflare Workers - Event Indexer (blockchain event indexing)

## Completed This Cycle

*No completions yet — this is Strategy Cycle #1 for Synthesis Hackathon (March 12, 2026).*

From build-log.md (recent pre-hackathon activity):
- Build #129 (2026-03-06): Closed #433, #415, version.txt bump — SUCCESS
- Build #128 (2026-03-06): Closed #433, #415, version.txt bump — SUCCESS
- No FAILED builds detected in recent log — no re-queue needed

## Blockers

### Immediate Blockers
1. **Label API unavailable** — Cannot programmatically add "agent-build" label via Pipedream GitHub actions. Manual labeling required or alternative API method needed.
2. **Issue status confusion** — #440 and #62 status needs human verification before finalizing queue.

### Deferred Blockers (post-March 22)
- OpenRouter credits at 3% ($92.41) — will need top-up but not blocking demo
- Scout trigger stale (11+ days) — market intel can wait
- 100+ duplicate/stale issues need cleanup

## Hackathon Status

- **Confirmed active issues:** 3 of 5 (headless-markets #5, #6, nullpriest #432)
- **Needs verification:** 2 issues (#440 possibly complete, #62 closed)
- **Shipped:** 0 confirmed hackathon completions this cycle
- **Demo readiness:** ~15% (infrastructure exists, no end-to-end flow yet)
- **Days remaining:** 10 days (March 12 → March 22)
- **Target velocity:** Ship 3 confirmed issues + verify/replace 2 uncertain = 5 total
- **Current blocker:** Need human decision on queue composition before builder assignment

## Strategy Notes

**SYNTHESIS MODE RULES:**
- ONLY work on hackathon-priority issues until March 22
- All other open issues (100+ in nullpriest repo) are IGNORED until post-hackathon
- Builder capacity: 2 slots available
- Demo must show: agent discovery → quorum formation → bonding curve market → payment flow
- Success metric: Working end-to-end demo by March 22, not feature completeness

**Next Actions (requires human decision):**
1. ✅ DONE: Fetched current strategy.md and build-log.md from GitHub
2. ✅ DONE: Scanned all open issues in nullpriest and headless-markets repos
3. ✅ DONE: Detected issue status discrepancies (#440 claims complete, #62 actually closed)
4. ⚠️  BLOCKED: Cannot add "agent-build" label via available GitHub API actions
5. ⚠️  NEEDS HUMAN: Verify #440 completion status and choose replacement for #62
6. ⏭️  PENDING: Write this strategy.md to GitHub memory/strategy.md
7. ⏭️  PENDING: Update activity feed with strategy cycle completion

**Recommended Human Actions:**
1. Manually add "agent-build" label to: headless-markets #5, #6, nullpriest #432
2. Close nullpriest #440 if truly complete, or reopen and clarify if incomplete
3. Choose 1-2 replacement issues from headless-markets repo to fill queue to 5 total
4. Approve builder assignment: slot-1 → headless-markets#5, slot-2 → headless-markets#6
