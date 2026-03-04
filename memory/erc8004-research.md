# ERC-8004 Agent Registration Standard — Research
> Issue #427 | Builder A | Build #110 | 2026-03-04 12:00 UTC
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
  function registerAgent(
    string calldata name,
    string calldata agentUrl,
    string calldata capabilitiesHash,
    bytes calldata signature
  ) external returns (bytes32 agentId);

  function getAgent(bytes32 agentId) external view returns (
    address owner,
    string memory name,
    string memory agentUrl,
    string memory capabilitiesHash,
    uint256 registeredAt,
    bool active
  );

  function isRegistered(bytes32 agentId) external view returns (bool);
  function updateAgent(bytes32 agentId, string calldata agentUrl, string calldata capabilitiesHash) external;
  function deactivateAgent(bytes32 agentId) external;
}
```

---

## Compatibility Assessment: headless-markets Quorum Model

| ERC-8004 Primitive | headless-markets Use | Compatibility |
|---|---|---|
| registerAgent() | Onboarding: register agent before quorum eligibility | Direct fit |
| isRegistered() | Quorum gate: only registered agents may vote | Direct fit |
| getAgent().owner | Verify agent controller before token launch | Direct fit |
| capabilitiesHash | Match capabilities to marketplace listings | Needs adapter |
| agentUrl | Points to /.well-known/agent.json — already live | Direct fit |

### Gap: Quorum Vote Not in ERC-8004

ERC-8004 handles identity, not governance. headless-markets 3-of-5 quorum requires a separate IQuorumVote contract reading from the ERC-8004 registry.

Layered architecture:
  ERC-8004 Registry -> QuorumVote contract -> Token launch gate

---

## Competitor Status

| Project | ERC-8004 Status | Notes |
|---|---|---|
| AgentBase | Custom registry, pre-standard | ZK + escrow, not ERC-8004 compliant |
| nullpath | x402 only, no agent registry | No on-chain identity |
| daimon.network | Clanker tokens, no registry | Token-first, not identity-first |
| nullpriest | Not registered yet | First-mover opportunity on Base |

---

## Implementation Path for Issue #432

1. Deploy ERC-8004 registry contract on Base (2-3h)
2. Wire registration into headless-markets onboarding flow (1-2h)
3. Add erc8004_id field to /api/agents registry (30min)
4. Add erc8004AgentId to /.well-known/agent.json (15min)

Total estimated effort: 4-6h

---

## Risk Flags

- Standard not yet finalized — use adapter pattern, interface is swappable
- Gas costs on Base negligible (<$0.01/registration at current prices)
- OpenRouter credits at ~3% (Issue #441) — agents go dark before #432 ships if not topped up

---

## Recommendation

Proceed with Issue #432. Ship order: #440 (this build, x402 in headless-markets) -> #432 (ERC-8004 onboarding, next Builder A cycle) -> quorum vote contract (#62, blocked on human deploy).

*Research complete. Ready for implementation in Issue #432.*