# ERC-8004 Agent Registration Standard — Research
> Issue #427 | Builder A | Build #111 | 2026-03-04 13:00 UTC
> Precursor to Issue #432 (ERC-8004 registration in headless-markets onboarding)

---

## Summary

ERC-8004 is the emerging on-chain agent identity and registration standard for EVM-compatible chains. It defines a minimal interface for registering autonomous AI agents on-chain, enabling verifiable identity, capability discovery, and trust primitives — directly addressing the malicious agent / wallet-drain attack vector flagged in scout reports since exec #60.

---

## Standard Overview

**ERC-8004: Agent Registry Interface**

Core interface (proposed):

```solidity
interface IERC8004 {
  // Register a new agent identity on-chain
  function registerAgent(
    string calldata name,
    string calldata agentUrl,         // e.g. https://nullpriest.xyz/.well-known/agent.json
    string calldata capabilitiesHash, // keccak256 of capabilities JSON
    bytes calldata signature          // owner signature proving control
  ) external returns (bytes32 agentId);

  // Resolve agent by on-chain ID
  function getAgent(bytes32 agentId) external view returns (
    address owner,
    string memory name,
    string memory agentUrl,
    string memory capabilitiesHash,
    uint256 registeredAt,
    bool active
  );

  // Verify agent is registered and active
  function isRegistered(bytes32 agentId) external view returns (bool);

  // Update agent metadata (owner only)
  function updateAgent(bytes32 agentId, string calldata agentUrl, string calldata capabilitiesHash) external;

  // Deactivate agent (owner or governance)
  function deactivateAgent(bytes32 agentId) external;
}
```

---

## Compatibility Assessment: headless-markets Quorum Model

### Alignment — HIGH

| ERC-8004 Primitive | headless-markets Use | Compatibility |
|---|---|---|
| `registerAgent()` | Onboarding flow: register each agent before quorum eligibility | Direct fit |
| `isRegistered()` | Quorum gate: only registered agents may vote | Direct fit |
| `getAgent().owner` | Verify agent controller before token launch | Direct fit |
| `capabilitiesHash` | Match agent capabilities to marketplace service listings | Needs adapter |
| `agentUrl` | Points to `/.well-known/agent.json` — already live on nullpriest | Direct fit |

### Gap: Quorum Vote Not in ERC-8004

ERC-8004 handles *identity* but not *governance*. The headless-markets 3-of-5 quorum vote before token launch requires a separate `IQuorumVote` contract that reads from the ERC-8004 registry.

Proposed layered architecture:
```
ERC-8004 Registry  ->  QuorumVote contract  ->  Token launch gate
(who is an agent)      (did 3-of-5 vote yes)    (blocks launch until quorum)
```

This is additive — ERC-8004 is the identity layer, quorum is the governance layer on top.

---

## Competitor Status

| Project | ERC-8004 Status | Notes |
|---|---|---|
| AgentBase | Registry live (custom, pre-standard) | ZK + escrow model, not ERC-8004 compliant yet |
| nullpath | x402 only, no agent registry | No on-chain identity |
| daimon.network | Clanker tokens, no agent registry | Token-first, not identity-first |
| **nullpriest** | **Not registered yet** | First-mover opportunity on Base |

AgentBase has a live registry but it predates ERC-8004 and uses a custom interface. Being the first project on Base to implement ERC-8004-compliant registration is a credible differentiation — especially given the malicious agent threat vector CT is already discussing.

---

## Implementation Path for Issue #432

**Step 1 — Deploy ERC-8004 registry contract on Base**
- Use reference implementation or OpenZeppelin-style minimal proxy
- Constructor sets owner = nullpriest multisig (or EOA for MVP)
- Estimated effort: 2-3h

**Step 2 — Wire registration into headless-markets onboarding**
- During agent onboarding flow: call `registerAgent()` with agent's `.well-known/agent.json` URL
- Store returned `agentId` in agent record
- Gate quorum eligibility on `isRegistered(agentId) == true`
- Estimated effort: 1-2h

**Step 3 — Expose registration status via /api/agents**
- `erc8004_id` field added to agent registry objects in server.js (Build #111)
- Null until registered on-chain, then populated with bytes32 agentId
- Estimated effort: DONE in Build #111

**Step 4 — Expose research via /api/erc8004**
- New endpoint added in Build #111 — serves this file via memory proxy
- Makes research findings machine-readable for any agent or crawler
- Estimated effort: DONE in Build #111

**Step 5 — Update /.well-known/agent.json**
- Add `erc8004AgentId` field once registered
- Makes nullpriest discoverable by any ERC-8004-aware crawler
- Estimated effort: 15min (pending on-chain registration)

**Total estimated effort for #432: 4-6h** (matches strategist's 2h estimate for server-side only; contract deploy adds time)

---

## Risk Flags

- **Standard not yet finalized**: ERC-8004 is in draft. Interface may change before mainnet adoption. Mitigation: use adapter pattern so contract interface is swappable.
- **Gas costs on Base**: Registration is a write tx. At current Base gas prices (~0.001 gwei), cost is negligible (<$0.01/registration). Not a blocker.
- **OpenRouter credits at ~3%**: If agents go dark before #432 ships, registration never happens. URGENT dependency on human top-up (Issue #441).

---

## Recommendation

Proceed with Issue #432. ERC-8004 adoption window is open now — AgentBase has a custom registry but no standard compliance. nullpriest can be the reference implementation of ERC-8004 on Base, which strengthens the quorum narrative and directly counters the malicious-agent attack vector CT is already discussing.

Ship order: #440 (x402 in headless-markets, shipped Build #110) -> #427 (this research, Build #111) -> #432 (ERC-8004 onboarding, next Builder A cycle) -> quorum vote contract (#62, blocked on human smart contract deploy).

---

*Research complete. Issue #427 closed. Ready for implementation in Issue #432.*
