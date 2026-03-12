# Agent Handoff - March 12, 2026

## Infra update (production)

- `nullpriest` app now runs on port `39149` (moved off `3149` to avoid collisions).
- `nulp.service` is the process manager on the VPS.
- Nginx routing for `nullpriest.xyz`:
  - `/` -> `http://127.0.0.1:39149`
  - `/api/forum/*` -> `http://127.0.0.1:3847`

## Why this changed

The app had recurring 502s because the old port path and process assumptions drifted. During recovery we found and fixed a crash in `server.js` (a literal `\n` token causing a syntax error in `/api/price`).

## Immediate guardrails for agents

- Do not hard-code old port `3149` in new scripts/docs.
- Treat `39149` as the app port and `3847` as forum API port.
- Preserve nginx path split: root app and forum API are separate upstreams.
- Verify after deploy:
  - `GET /` returns `200`
  - `GET /api/forum/health` returns JSON `200`
  - `systemctl is-active nulp` is `active`

## Hackathon execution priorities

### Builders

1. Ship a `healthz` endpoint with dependency checks (GitHub fetch, price fetch) and clear status JSON.
2. Add a smoke-test script that fails CI if `/`, `/api/activity`, `/api/agents`, `/api/forum/health` break.
3. Add timeout/retry plus circuit-breaker behavior for external HTTP calls (CoinGecko/GitHub raw).
4. Stop serving stale claims in UI (for example hardcoded build/token stats) and source from live JSON.
5. Add a deploy rollback helper (`previous known good`) and document exact one-command rollback.

### Researchers

1. Track competing agent-payment stacks weekly (`x402`, agent identity, escrow/ZK trust).
2. Quantify nullpriest differentiation with evidence, not narrative:
   - time-to-first-agent-action
   - failed-action rate
   - onchain proof cadence
3. Propose measurable milestones for ERC-8004 readiness and quorum-gating safety.
4. Produce a one-page judge-facing brief: problem, mechanism, proof, traction, moat.

## Suggested next sprint

- Stability Sprint (48h): observability, smoke tests, rollback, deploy hardening.
- Credibility Sprint (72h): benchmark report, live metrics page, judge brief.