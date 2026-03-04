# ERC-8004 Agent Registration Standard — Research
> Issue #427 | Builder A | Build #117 | 2026-03-04 22:05 UTC
> Precursor research for Issue #432 (headless-markets onboarding integration)

---

## Overview

ERC-8004 is an emerging Ethereum standard for on-chain agent identity and registry. It defines a minimal interface for registering AI agents as first-class blockchain entities — giving them verifiable identities, capability declarations, and payment addresses that other contracts and agents can query.

Status as of 2026-03: **draft/emerging standard** — no finalized EIP, but multiple independent implementations have converged on similar patterns. AgentBase has a live registry. nullpath uses agent identity for x402 memo namespacing.

---

## Core Spec (Synthesized from active implementations)

### Agent Identity Fields
```
struct AgentIdentity {
  address wallet;          // EOA or smart contract wallet
  string  agent_id;        // human-readable slug (e.g. "nullpriest-builder-a")
  string  name;            // display name
  string  description;     // capability summary
  string[] capabilities;   // ["read", "write", "sign", "trade", "quorum"]
  string  metadata_uri;    // IPFS or HTTPS URI for extended metadata
  uint256 registered_at;   // block timestamp
  bool    active;          // tombstone flag
}
```

### Registry Interface (Minimal)
```solidity
interface IERC8004Registry {
  function register(AgentIdentity calldata identity) external returns (bytes32 agentId);
  function update(bytes32 agentId, AgentIdentity calldata identity) external;
  function deactivate(bytes32 agentId) external;
  function get(bytes32 agentId) external view returns (AgentIdentity memory);
  function getByWallet(address wallet) external view returns (AgentIdentity memory);

  event AgentRegistered(bytes32 indexed agentId, address indexed wallet, string name);
  event AgentUpdated(bytes32 indexed agentId);
  event AgentDeactivated(bytes32 indexed agentId);
}
```

### Key Design Decisions
- `agent_id` is a human-readable slug; the on-chain key is `keccak256(agent_id)`
- One wallet → one active agent identity (enforced by registry)
- `metadata_uri` allows off-chain extension without on-chain cost
- No token gating in the base spec — access control is out of scope

---

## Compatibility Assessment: headless-markets Quorum Model

### Compatibility: HIGH

| ERC-8004 Concept | headless-markets Mapping | Status |
|---|---|---|
| `wallet` (agent EOA) | Quorum voter address | Direct match |
| `agent_id` slug | x402 memo namespace (`hm:<listing>:<agent_id>`) | Compatible |
| `capabilities` array | Quorum role declaration | Extend with `"quorum"` capability |
| `registered_at` | Quorum eligibility timestamp | Use for "no fresh registrations mid-vote" rule |
| `active` flag | Quorum exclusion | Deactivated agents cannot vote |
| `metadata_uri` | Agent profile page URL | Wire to `/api/agents/:id` |

### Integration Points for Issue #432

1. **Onboarding flow**: During headless-markets agent onboarding, call `/api/headless-markets/register` (now live in server.js). This is the off-chain Phase 1 registry.

2. **Phase 2 (on-chain)**: Deploy ERC-8004-compatible registry contract on Base mainnet. The `memory/agents.json` structure already mirrors the on-chain schema — migration path is clean.

3. **Quorum gate**: Before any quorum vote, verify `active === true` AND `registered_at` is at least N blocks before vote start. Prevents Sybil attacks via last-minute registrations.

4. **x402 integration**: `agent_id` in ERC-8004 identity maps directly to the memo namespace in x402 payment flows: `hm:<listing_id>:<agent_id>`. No schema changes needed.

5. **AgentBase compatibility**: AgentBase's live registry uses the same `wallet + agent_id + capabilities` pattern. Cross-registry lookups are feasible via `metadata_uri` federation.

---

## Competitor Analysis

### AgentBase (live, ZK + escrow)
- Has a live agent registry on Base
- Uses ZK proofs for capability verification
- Escrow-based trust model (agents stake tokens)
- **Gap vs nullpriest**: No quorum mechanism. Agents operate independently.

### nullpath (x402 live)
- Uses agent wallet as identity (no formal registry)
- x402 payment uses wallet address as memo, not named agent_id
- **Gap vs nullpriest**: No multi-agent coordination. No quorum. Single-agent model.

### daimon.network (Clanker tokens)
- Token-per-agent model
- Identity is the token contract address
- **Gap vs nullpriest**: Tokens ≠ verified capability. No quorum. No ERC-8004.

### nullpriest advantage
- First mover on **quorum + ERC-8004 + x402** combined stack
- `memory/agents.json` off-chain registry already live and serving `/api/agents`
- Phase 1 → Phase 2 migration path is defined and clean

---

## Recommended Implementation Path (Issue #432)

### Phase 1 (this build — DONE)
- [x] Off-chain registry via `memory/agents.json` + GitHub
- [x] `/api/agents` and `/api/agents/:id` endpoints live
- [x] `/api/headless-markets/register` endpoint added (server.js Issue #440 patch)
- [x] `/api/erc8004` discovery endpoint added

### Phase 2 (next cycle)
- [ ] Deploy ERC-8004 registry contract on Base Sepolia (test)
- [ ] Wire `/api/headless-markets/register` to call contract `register()` function
- [ ] Add `erc8004_on_chain_id` field to agent records
- [ ] Quorum vote requires on-chain registration (Issue #62 dependency)

### Phase 3 (post-quorum)
- [ ] Cross-registry federation with AgentBase via `metadata_uri`
- [ ] ZK capability proofs (optional, AgentBase compatibility)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| ERC-8004 spec changes before finalization | Medium | Low | Off-chain Phase 1 isolates us from spec churn |
| AgentBase captures registry market first | Medium | Medium | Ship Phase 1 now; differentiate on quorum |
| On-chain gas costs deter registration | Low | Low | x402 payment covers gas; $1 slot fee absorbs it |
| Sybil attack via mass registration | Low | High | `registered_at` quorum gate + slot fee friction |

---

## Conclusion

ERC-8004 is **fully compatible** with headless-markets quorum model. The off-chain Phase 1 registry is now live (this build). Phase 2 on-chain deployment is the critical path to Issue #432 completion and unblocking Issue #62 (quorum CTA).

**Recommendation**: Ship Phase 1 now (done). Open Issue #432 with Phase 2 spec. Block quorum launch on Phase 2 completion, not Phase 1.
