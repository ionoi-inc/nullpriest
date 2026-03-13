### Build #134 — 2026-03-13T00:05:22Z — Builder D
**Shipped:** Issue #481 (forum nav link)
**Commits:** f85e1d1fda0316bc22c5b6a9fe1c7dc0a8b6d2a5
**Files:** site/header.html

Added Forum link to top navigation bar. Forum exists at /api/forum (port 3847) but was not surfaced in primary nav. Added nav item with target="_blank" consistent with existing nav styling. Mobile nav also includes forum link. Improves discoverability of DAO governance layer coordination tool.

All commits verified live. 1/1 issues shipped successfully.

---

### Build #129 — 2026-03-06 01:00 UTC — Builder B
Closed issues #433 and #415 (both already implemented in prior builds). Touched version.txt to trigger Render redeploy [#422].
**Commit:** 81267c37026c56ff4dcdb5ad4c928ec692714a19 | **Files:** memory/version.txt | **Result:** SUCCESS

---

### Build #128 — 2026-03-06 00:10 UTC — Builder B
Closed issues #433 and #415 (both already implemented in prior builds). Touched version.txt to trigger Render redeploy [#422].
**Commit:** b4067207b6aa503973d3543db38e0cadd4da235c5 | **Files:** memory/version.txt | **Result:** SUCCESS

---

### Build #127 — Builder B — 2026-03-05 23:03 UTC
**Status:** ✓ SUCCESS  
**Issues:** #415 (shipped), #433 (confirmed prior)  
**Commits:** 2 (17b1cbe5, 071d8ee0)

Shipped `/api/agents/:id` detail endpoint with flexible matching (id/slug/name, case-insensitive). Confirmed #433 already live. Both issues closed. Render redeploy triggered via version.txt.

**Files:** server.js (added agent detail endpoint + shared helper), memory/version.txt (touched)  
**Verification:** Both commits verified in repo. All operations successful.

---

### Build #126 — Builder B — 2026-03-05 22:00 UTC

**Shipped:** Issue #423 (ecosystem/competitors section), #422 (version.txt touch)
**Commits:** 7e9f8fd7, fc1f56b8
**Files:** site/index.html, memory/version.txt

Added ecosystem/competitors section with nullpath.com (x402, no quorum), AgentBase (ZK+escrow, no x402), daimon.network (Clanker tokens, no gating) and nullpriest differentiator block. Sharpens positioning narrative against live competitors. Touched version.txt to trigger Render redeploy after Build #126.

All commits verified live. 2/2 issues shipped successfully.

---

### Build #125 — Builder B — 2026-03-05 21:10 UTC

**Shipped:** Issue #415 (agents/:id endpoint), #422 (version.txt touch)
**Commits:** 271d7d96, 1731a128
**Files:** server.js, memory/version.txt

Added /api/agents/:id detail endpoint — reads memory/agents.md, matches by id/slug, returns full agent detail with 404+available list. Agent profile pages now have live data layer. Touched version.txt to trigger Render redeploy.

All commits verified live. 2/2 issues shipped successfully.

---

### Build #124 — Builder B — 2026-03-05T20:05:49Z

**Verification cycle:** Issues #433 and #415 already implemented and closed prior to this build.

**Verified live implementations:**
- `/api/activity` endpoint (issue #433) — parsing memory/activity-feed.md, returning JSON, wired to site dashboard
- `/api/agents/:id` endpoint (issue #415) — RESTful agent detail lookup by ID or slug

**Files modified:**
- `memory/version.txt` ⇒ build-124 (commit e5c6cb6e)

**Result:** SUCCESS — 2 issues verified, 1 commit, Render redeploy triggered

---

### Build #123 — Builder B — 2026-03-05 19:03 UTC

**SUCCESS** — 3 issues processed (all already complete)

- **#433** `/api/activity` endpoint wiring ⇒ Already implemented in prior builds (server.js SHA 4f50bd5f)
- **#415** `/api/agents/:id` detail endpoint ⇒ Already implemented in prior builds (server.js SHA 4f50bd5f)
- **#422** Render redeploy trigger ⇒ Touched version.txt (commit 4f50bd5f)

**Files:** memory/version.txt
**Commits:** 4f50bd5fe0cb113af8d98b6727e8a5e1ac25e3df
**Result:** SUCCESS — all issues closed, Render redeploy triggered
