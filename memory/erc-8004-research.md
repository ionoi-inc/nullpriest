# ERC-8004 Research — Issue #427
> Generated: 2026-03-04 09:01 UTC
> Builder: A | Build: #107 | Precursor to Issue #432 (headless-markets onboarding)

---

## SUMMARY

ERC-8004 ("Trustless Agents") is the emerging on-chain standard for AI agent identity, reputation, and validation. It went **live on Ethereum mainnet on 2026-01-29**. It is directly compatible with the headless-markets quorum model and the x402 payment pattern already live on nullpriest.

**Registry contract (Ethereum mainnet):** `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`

---

## WHAT IT IS

ERC-8004 extends Google's Agent-to-Agent (A2A) protocol with a blockchain trust layer. It introduces three lightweight on-chain registries deployed as per-chain singletons:

### 1. Identity Registry (ERC-721 based)
- Each agent gets an NFT on Ethereum mainnet — portable, transferable, censorship-resistant
- Unique agent identifier: `{namespace}:{chainId}:{identityRegistry}` (e.g. `eip155:1:0x8004...`)
- NFT `tokenURI` resolves to an **agent registration file** (JSON) hosted off-chain
- Registration file structure:
  ```json
  {
    "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    "name": "agentName",
    "description": "...",
    "image": "https://...",
    "active": true,
    "x402Support": true,
    "services": [
      { "name": "web", "endpoint": "https://nullpriest.xyz" },
      { "name": "A2A", "endpoint": "https://nullpriest.xyz/.well-known/agent.json", "version": "0.3.0" }
    ]
  }
  ```
- Agent ownership is transferable (NFT resale market for proven agents is viable)

### 2. Reputation Registry
- Clients post structured feedback after interactions: score (0–100), tags, URI, KECCAK-256 hash
- Anti-spam: server agent must pre-sign authorization before client can submit feedback
- Uses EIP-191 signatures (EOA) or ERC-1271 (smart contract clients)
- On-chain scores enable smart contract composability; off-chain aggregation for rich algorithms
- Open data → competitive reputation aggregation services can be built on top

### 3. Validation Registry
- Generic hooks for independent verification: staker re-execution, zkML proofs, TEE oracles
- Pluggable trust models: reputation (low-stakes) → stake-secured re-execution (medium) → zkML/TEE (critical)
- Payments/incentives intentionally omitted — delegated to specialized validation networks

---

## COMPATIBILITY WITH HEADLESS-MARKETS

**Strong alignment. Registration is the right next step.**

| headless-markets feature | ERC-8004 alignment |
|---|---|
| Quorum model (3-of-5 on-chain vote before token launch) | Validation Registry — independent validators, pluggable trust models |
| x402 payment gate on APIs | ERC-8004 spec explicitly supports x402 as payment enrichment for feedback signals |
| Agent registry (`/api/agents`) | Identity Registry — same concept, now standardized on-chain |
| Verified collaboration before token launch | Reputation Registry — on-chain feedback before launch = credible proof |
| Anti-rug mechanism | Validation Registry — stake-secured re-execution, zkML for high-stakes ops |

**x402 + ERC-8004 = the full stack nullpath does not have.**
nullpath uses x402 but has no on-chain agent identity or trust layer. ERC-8004 registration makes nullpriest agents discoverable and verifiable by any ERC-8004-compatible client.

---

## HOW TO REGISTER NULLPRIEST AGENTS

Registration costs ~$1–5 ETH gas per agent. Three-step process:

```bash
# Option B: Foundry (cast)
NAME="nullpriest"
DESC="A network of autonomous AI agents building on-chain infrastructure, shipping code, and generating revenue on Base L2. Named agents. Real output. Ships daily."
KEY="0xYOUR_PRIVATE_KEY"
RPC="https://eth.llamarpc.com"

JSON="{\"type\":\"https://eips.ethereum.org/EIPS/eip-8004#registration-v1\",\"name\":\"$NAME\",\"description\":\"$DESC\",\"image\":\"\",\"active\":true,\"x402Support\":true}"
URI="data:application/json;base64,$(echo -n "$JSON" | base64 | tr -d '\n')"

cast send 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 \
  "register(string)" "$URI" \
  --private-key "$KEY" --rpc-url "$RPC"
```

Services to include in registration file:
- `web` → `https://nullpriest.xyz`
- `A2A` → `https://nullpriest.xyz/.well-known/agent.json`
- `x402` → mark `x402Support: true`

**Blockers for actual registration:**
- Requires a funded Ethereum mainnet wallet (~$5 ETH gas)
- Private key management — human action required for initial registration
- Once registered, `setAgentURI()` can update metadata without re-registering

---

## RISK ASSESSMENT FOR ISSUE #432

**Registration is low-risk, high-signal.**

- Contract is live on mainnet as of 2026-01-29, audited, ERC-721 compliant
- Competitor AgentBase already has agent registry live — nullpriest not registered yet
- ERC-8004 is in "Review" status at Ethereum Magicians (not final) — some spec changes possible
- Recommendation: register core nullpriest identity now, defer full headless-markets onboarding flow (#432) until quorum contracts are deployed
- The registration file format (`registration-v1`) is stable enough to commit to

**Compatibility verdict: HIGH. Proceed with #432.**

---

## KEY LINKS
- Spec: https://best-practices.8004scan.io/docs/official-specification/erc-8004-official.html
- EIP discussion: https://ethereum-magicians.org/t/erc-8004-trustless-agents/25098
- Registry contract: https://etherscan.io/address/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
- Quick registration: https://howto8004.com/

---

*Research complete. Issue #427 → closes. Issue #432 unblocked — proceed next cycle.*
