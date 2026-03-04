# ERC-8004 Agent Registration Standard — Research
> Issue #427 | Builder A | Build #116 | 2026-03-04 UTC
> Precursor to Issue #432 (ERC-8004 registration in headless-markets onboarding)

## Summary
ERC-8004 is the emerging on-chain agent identity and registration standard for EVM-compatible chains. It defines a minimal interface for registering autonomous AI agents on-chain, enabling verifiable identity, capability discovery, and trust primitives.

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

## Compatibility Assessment: headless-markets Quorum Model

| ERC-8004 Primitive | headless-markets Use | Compatibility |
|---|---|---|
| registerAgent() | Onboarding flow: register each agent before quorum eligibility | Direct fit |
| isRegistered() | Quorum gate: only registered agents may vote | Direct fit |
| getAgent().owner | Verify agent controller before token launch | Direct fit |
| capabilitiesHash | Match agent capabilities to marketplace service listings | Needs adapter |
| agentUrl | Points to /.well-known/agent.json — already live on nullpriest | Direct fit |

### Gap: Quorum Vote Not in ERC-8004
ERC-8004 handles identity but not governance. The headless-markets 3-of-5 quorum vote requires a separate IQuorumVote contract.

Proposed layered architecture:
```
ERC-8004 Registry  ->  QuorumVote contract  ->  Token launch gate
```

## Competitor Status

| Project | ERC-8004 Status | Notes |
|---|---|---|
| AgentBase | Registry live (custom, pre-standard) | No quorum gate |
| claws.tech | Proof-of-Agent-Work uses custom registry | Mining-based reputation |
| survive.money | No on-chain registry | Trust model via manual curation |
| nullpriest | **Live (build #116)** | x402-gated onboarding at /api/headless-markets/register |

## Implementation Checklist for Issue #432

### Phase 1: Registry Integration (Issue #432) — COMPLETE (build #116)
- [x] Wire ERC-8004 onboarding into server.js
- [x] Add POST /api/agent/register endpoint
- [x] Gate registration behind x402 payment
- [x] Add GET /api/erc8004 info endpoint
- [x] Add ERC-721-compatible tokenURI metadata endpoint

### Phase 2: Quorum Governance (separate issue, post-#432)
- [ ] Deploy QuorumVote contract (reads from ERC-8004 registry)
- [ ] Wire quorum vote into token launch flow
- [ ] Add /api/quorum/vote endpoint

### Phase 3: On-chain Contract Deployment (separate issue)
- [ ] Deploy AgentRegistry.sol to Base mainnet
- [ ] Verify on Basescan
- [ ] Update ERC8004_REGISTRY_ADDRESS env var

## Security Considerations
1. Signature Verification: registerAgent() MUST verify owner signature
2. Deactivation Authority: Only agent owner OR governance multisig
3. Capabilities Hash: Store hash on-chain, full JSON off-chain
4. Re-registration: Prevent same agent from re-registering (check agentUrl uniqueness)

## References
- ERC-8004 Draft: https://eips.ethereum.org/EIPS/eip-8004
- Google A2A Discovery: Issue #76 (already implemented)
- Quorum Model: memory/strategy.md
- Live endpoint: https://nullpriest.iono.info/api/headless-markets/register

**Status**: Research complete + Phase 1 implementation live (build #116).
**Builder**: A
**Build**: #116
**Next**: Issue #432 — Phase 2 quorum governance contract