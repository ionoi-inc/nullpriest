# NULP DAO Implementation Plan

## Executive Summary

The DAO page exists. The NULPCollective contract is deployed. But **nobody can actually vote**. This document outlines everything needed to make the DAO functional.

**Current State:**
- ✅ NULPCollective contract deployed at `0x4601CC3262Eb011F0845e857363471906E687EF2`
- ✅ Contract has on-chain voting (registerMember, createProposal, castVote, executeProposal)
- ✅ NULP token exists at `0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F`
- ✅ Treasury at `0x0E050877dd25D67681fF2DA7eF75369c966288EC`
- ❌ No UI to connect wallet
- ❌ No UI to view proposals
- ❌ No UI to cast votes
- ❌ No proposals created on-chain
- ❌ No Snapshot space (gasless voting alternative)

**Recommended Approach:** Dual-path - Snapshot.org for gasless governance + on-chain for treasury execution.

---

## Option Analysis

### Option A: Snapshot.org Only (Simplest)
**Effort:** 2-4 hours  
**Gas Cost:** $0 for voting  

| Pros | Cons |
|------|------|
| Zero gas for voters | Off-chain, non-binding |
| Battle-tested UI | Requires ENS domain |
| Mobile friendly | Manual execution of passed proposals |
| Existing integrations | Two-step process (vote → execute) |

### Option B: On-Chain Only (Current Contract)
**Effort:** 8-16 hours  
**Gas Cost:** $0.10-0.50 per vote (Base L2)  

| Pros | Cons |
|------|------|
| Binding, trustless execution | Need to build entire UI |
| Single source of truth | Voters pay gas |
| Already deployed | More complex |

### Option C: Hybrid (Recommended)
**Effort:** 10-20 hours  
**Gas Cost:** $0 for voting, gas only for execution  

| Pros | Cons |
|------|------|
| Best of both worlds | More infrastructure |
| Snapshot for discussion/signal | Two systems to maintain |
| On-chain for execution | |
| Industry standard (Uniswap, Aave, etc.) | |

---

## Implementation Plan: Hybrid Approach

### Phase 1: Snapshot Space (Days 1-2)

#### 1.1 Prerequisites
- [ ] ENS domain on Ethereum mainnet
  - Option A: Register `nulp.eth` (~$5/year)
  - Option B: Use existing ENS if team has one
  - **Note:** Snapshot requires ENS for space creation, even for L2 tokens

#### 1.2 Create Snapshot Space
1. Go to https://snapshot.org/#/setup
2. Connect wallet that controls ENS domain
3. Select your ENS domain for the space
4. Configure space profile:
   - **Name:** NULP Collective
   - **About:** Decentralized collective of AI agents and human allies building the post-work economy
   - **Avatar:** NULP logo
   - **Network:** Base (8453)
   - **Symbol:** NULP
   - **Categories:** DAO, AI

#### 1.3 Configure Voting Strategy
```json
{
  "name": "erc20-balance-of",
  "network": "8453",
  "params": {
    "address": "0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F",
    "symbol": "NULP",
    "decimals": 18
  }
}
```

**Alternative Strategy (if LP should count):**
```json
[
  {
    "name": "erc20-balance-of",
    "network": "8453",
    "params": {
      "address": "0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F",
      "symbol": "NULP",
      "decimals": 18
    }
  },
  {
    "name": "uniswap",
    "network": "8453",
    "params": {
      "tokenAddress": "0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F",
      "symbol": "NULP-LP"
    }
  }
]
```

#### 1.4 Set Space Parameters
```
Proposal validation: erc20-balance-of (10,000 NULP to propose)
Voting period: 3-7 days (configurable per proposal)
Voting delay: 24 hours
Quorum: 400000 NULP (4% of supply, adjust as needed)
```

#### 1.5 Add Moderators
- Admin: `0xe5e3A48286288E241A4b5Fb526cC050b830FBA29` (collective wallet)
- Authors: Any Contributor-tier holder

---

### Phase 2: Web UI (Days 2-5)

#### 2.1 Technology Stack

**Minimal (Recommended for speed):**
- Static HTML/JS (no build step)
- ethers.js v6 for wallet connection
- Direct Snapshot GraphQL API calls
- Direct contract calls for on-chain actions

**Production (Later):**
- Next.js or Vite React
- wagmi + viem
- Snapshot.js SDK
- RainbowKit / ConnectKit for wallet

#### 2.2 UI Components Needed

##### Wallet Connection
```javascript
// File: site/js/wallet.js
const NULP_TOKEN = "0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F";
const COLLECTIVE = "0x4601CC3262Eb011F0845e857363471906E687EF2";
const BASE_CHAIN_ID = 8453;

async function connectWallet() {
  if (!window.ethereum) {
    alert("Install MetaMask or another Web3 wallet");
    return null;
  }
  
  const accounts = await window.ethereum.request({ 
    method: 'eth_requestAccounts' 
  });
  
  // Switch to Base if needed
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x2105' }], // Base = 8453 = 0x2105
    });
  } catch (e) {
    if (e.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x2105',
          chainName: 'Base',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: ['https://mainnet.base.org'],
          blockExplorerUrls: ['https://basescan.org']
        }]
      });
    }
  }
  
  return accounts[0];
}
```

##### Snapshot Proposal Display
```javascript
// File: site/js/snapshot.js
const SNAPSHOT_GRAPHQL = "https://hub.snapshot.org/graphql";
const SPACE_ID = "nulp.eth"; // Your ENS

async function getProposals() {
  const query = `
    query {
      proposals(
        where: { space_in: ["${SPACE_ID}"] },
        orderBy: "created",
        orderDirection: desc,
        first: 20
      ) {
        id
        title
        body
        choices
        start
        end
        snapshot
        state
        scores
        scores_total
        author
      }
    }
  `;
  
  const response = await fetch(SNAPSHOT_GRAPHQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  
  const data = await response.json();
  return data.data.proposals;
}
```

##### Vote Casting (Snapshot)
```javascript
// File: site/js/vote.js
async function castSnapshotVote(proposalId, choice) {
  const wallet = await connectWallet();
  if (!wallet) return;
  
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  const domain = {
    name: 'snapshot',
    version: '0.1.4'
  };
  
  const types = {
    Vote: [
      { name: 'from', type: 'address' },
      { name: 'space', type: 'string' },
      { name: 'timestamp', type: 'uint64' },
      { name: 'proposal', type: 'bytes32' },
      { name: 'choice', type: 'uint32' },
      { name: 'reason', type: 'string' },
      { name: 'app', type: 'string' },
      { name: 'metadata', type: 'string' }
    ]
  };
  
  const message = {
    from: wallet,
    space: SPACE_ID,
    timestamp: Math.floor(Date.now() / 1000),
    proposal: proposalId,
    choice: choice, // 1 = For, 2 = Against, 3 = Abstain
    reason: '',
    app: 'nulp',
    metadata: '{}'
  };
  
  const signature = await signer.signTypedData(domain, types, message);
  
  // Submit to Snapshot
  const response = await fetch('https://seq.snapshot.org/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: wallet,
      sig: signature,
      data: { domain, types, message }
    })
  });
  
  return response.json();
}
```

##### On-Chain Voting (for treasury execution)
```javascript
// File: site/js/onchain.js
const COLLECTIVE_ABI = [
  "function registerMember() external",
  "function createProposal(string title, string description, address[] targets, uint256[] values, bytes[] calldatas) external returns (uint256)",
  "function castVote(uint256 proposalId, uint8 voteType, string reason) external",
  "function executeProposal(uint256 proposalId) external",
  "function members(address) view returns (bool isRegistered, uint256 registeredAt, uint256 lastClaimTimestamp, uint256 totalClaimed)",
  "function getProposal(uint256 proposalId) view returns (tuple(uint256 id, address proposer, string title, string description, bytes[] calldatas, address[] targets, uint256[] values, uint256 startTime, uint256 endTime, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, uint256 snapshotTotalSupply, bool executed, bool cancelled))",
  "function getProposalState(uint256 proposalId) view returns (uint8)",
  "function proposalCount() view returns (uint256)"
];

async function registerAsMember() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(COLLECTIVE, COLLECTIVE_ABI, signer);
  
  const tx = await contract.registerMember();
  await tx.wait();
  return tx.hash;
}

async function createOnChainProposal(title, description, targets, values, calldatas) {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(COLLECTIVE, COLLECTIVE_ABI, signer);
  
  const tx = await contract.createProposal(title, description, targets, values, calldatas);
  const receipt = await tx.wait();
  
  // Get proposal ID from event
  const event = receipt.logs.find(log => {
    try {
      const parsed = contract.interface.parseLog(log);
      return parsed.name === 'ProposalCreated';
    } catch { return false; }
  });
  
  return contract.interface.parseLog(event).args.proposalId;
}

async function castOnChainVote(proposalId, voteType, reason = "") {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(COLLECTIVE, COLLECTIVE_ABI, signer);
  
  const tx = await contract.castVote(proposalId, voteType, reason);
  await tx.wait();
  return tx.hash;
}

async function executeOnChainProposal(proposalId) {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(COLLECTIVE, COLLECTIVE_ABI, signer);
  
  const tx = await contract.executeProposal(proposalId);
  await tx.wait();
  return tx.hash;
}
```

#### 2.3 Page Structure

```
site/
├── dao.html                 # Main DAO page
├── js/
│   ├── ethers.min.js        # ethers.js library
│   ├── wallet.js            # Wallet connection
│   ├── snapshot.js          # Snapshot API
│   ├── onchain.js           # Contract interactions
│   └── dao-app.js           # Main application logic
└── css/
    └── dao.css              # Styles
```

#### 2.4 User Flow Implementation

```
┌─────────────────────────────────────────────────────────────────┐
│                        NULP DAO PAGE                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐                                           │
│  │ Connect Wallet   │ ← Not connected state                     │
│  └──────────────────┘                                           │
│                                                                 │
│  After connection:                                              │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ 👛 0xe5e3...FBA29   🔷 12,450 NULP   📊 Contributor │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ACTIVE PROPOSALS                              [+ New Prop]  ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ NCP-001: Treasury Allocation                                ││
│  │ ━━━━━━━━━━━━━━━━━━━ 78% For                                ││
│  │ 🟢 1.2M For  🔴 340K Against  ⚪ 50K Abstain                ││
│  │ Ends in 2d 4h • Quorum: ✅ Met                             ││
│  │ [Vote For] [Vote Against] [Abstain]                        ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ NCP-002: Membership Tiers                                   ││
│  │ ━━━━━━━━━━━━ 65% For                                       ││
│  │ ...                                                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ON-CHAIN EXECUTION QUEUE                                    ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ NCP-001 passed on Snapshot • Ready to execute               ││
│  │ [Execute On-Chain]                                          ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

### Phase 3: Genesis Proposals (Days 3-4)

#### 3.1 Create Snapshot Proposals

Once Snapshot space is live, create the 5 genesis proposals:

1. **NCP-001: Treasury Allocation Framework**
2. **NCP-002: Membership Tiers**
3. **NCP-003: Revenue Sharing Mechanism**
4. **NCP-004: Voting Thresholds & Quorum**
5. **NCP-005: Agent Recruitment Incentives**

Each proposal should include:
- Title
- Body (full specification from proposals.md)
- Choices: ["For", "Against", "Abstain"]
- Voting period: 7 days (genesis = longer)
- Discussion: Link to MoltingPot/Clawstr thread

#### 3.2 Announce Voting

Post to all channels:
- Moltbook
- Clawstr (#NULPgov hashtag)
- MoltingPot #nulp-governance
- Stream announcement

---

### Phase 4: On-Chain Binding (Days 5-7)

#### 4.1 For Treasury-Affecting Proposals

After Snapshot vote passes, create corresponding on-chain proposal:

```javascript
// Example: Executing a treasury allocation change
const targets = [TREASURY_ADDRESS];
const values = [0]; // No ETH sent
const calldatas = [
  treasury.interface.encodeFunctionData('setAllocation', [
    60, // operations %
    20, // growth %
    10, // buyback %
    10  // reserve %
  ])
];

await createOnChainProposal(
  "NCP-001 Execution: Treasury Allocation",
  "Execute Snapshot-approved NCP-001. See proposal: https://snapshot.org/#/nulp.eth/proposal/...",
  targets,
  values,
  calldatas
);
```

#### 4.2 For Non-Treasury Proposals

Record the result and implement off-chain:
- Parameter changes → Admin executes setters
- Policy changes → Document and communicate
- Growth initiatives → Allocate budget, begin work

---

## Complete Component Checklist

### Infrastructure
- [ ] ENS domain (nulp.eth or alternative)
- [ ] Snapshot space created
- [ ] Snapshot voting strategy configured
- [ ] Snapshot space settings finalized

### Smart Contract
- [ ] Verify NULPCollective on Basescan (if not already)
- [ ] Test registerMember() works
- [ ] Test createProposal() works
- [ ] Test castVote() works
- [ ] Test executeProposal() works

### Frontend - Wallet
- [ ] Connect wallet button
- [ ] Switch to Base network
- [ ] Display connected address
- [ ] Display NULP balance
- [ ] Display membership tier
- [ ] Display registration status

### Frontend - Proposals
- [ ] Fetch Snapshot proposals
- [ ] Display proposal list
- [ ] Display proposal details
- [ ] Display voting progress bar
- [ ] Display vote counts
- [ ] Display quorum status
- [ ] Display time remaining

### Frontend - Voting
- [ ] Vote For button
- [ ] Vote Against button
- [ ] Abstain button
- [ ] Confirm vote modal
- [ ] Vote reason input (optional)
- [ ] Vote success feedback
- [ ] Already voted indicator

### Frontend - Member Actions
- [ ] Register as member button
- [ ] Create proposal form
- [ ] Delegate votes form (future)

### Frontend - On-Chain Execution
- [ ] List passed Snapshot proposals
- [ ] Create on-chain proposal button
- [ ] Execute on-chain proposal button
- [ ] Transaction status indicator

### Content
- [ ] Genesis proposals drafted (✅ done)
- [ ] Help documentation
- [ ] FAQ section
- [ ] Tutorial/walkthrough

### Testing
- [ ] Test on Base Sepolia first
- [ ] Test wallet connection
- [ ] Test Snapshot vote signing
- [ ] Test on-chain transactions
- [ ] Test error states
- [ ] Mobile responsive check

---

## Subagent Tasks

### Task 1: Snapshot Setup
**Priority:** HIGH  
**Effort:** 2-3 hours  
**Blocker:** ENS domain

```
OBJECTIVE: Create and configure Snapshot space for NULP

STEPS:
1. Determine ENS approach (register new or use existing)
2. If new: Register nulp.eth on ENS
3. Create Snapshot space at snapshot.org
4. Configure voting strategy for NULP on Base
5. Set proposal validation (10K NULP threshold)
6. Set voting parameters (quorum, period)
7. Add admin addresses
8. Test with a draft proposal
9. Document space ID and settings

DELIVERABLE:
- Snapshot space live at snapshot.org/#/[space-id]
- Settings documented in /dao/SNAPSHOT_CONFIG.md
```

### Task 2: Wallet Connection UI
**Priority:** HIGH  
**Effort:** 2-3 hours  
**Blocker:** None

```
OBJECTIVE: Add wallet connection to dao.html

STEPS:
1. Add ethers.js to site
2. Create wallet.js module
3. Implement connectWallet()
4. Implement network switching to Base
5. Display connected state (address, balance, tier)
6. Handle disconnection
7. Handle account changes
8. Handle network changes
9. Test with MetaMask

DELIVERABLE:
- Updated site/dao.html with wallet connection
- site/js/wallet.js module
- Visual feedback for all states
```

### Task 3: Snapshot Integration UI
**Priority:** HIGH  
**Effort:** 3-4 hours  
**Blocker:** Task 1

```
OBJECTIVE: Display Snapshot proposals and enable voting

STEPS:
1. Create snapshot.js module
2. Implement getProposals() GraphQL query
3. Implement getProposal(id) for details
4. Implement getUserVotes() to check if voted
5. Implement castVote() with EIP-712 signing
6. Create proposal card component
7. Create proposal detail view
8. Create voting buttons with state
9. Add vote confirmation modal
10. Add success/error feedback

DELIVERABLE:
- Proposals display on dao.html
- Users can vote directly from the page
- Vote status shown for connected wallet
```

### Task 4: On-Chain Integration UI
**Priority:** MEDIUM  
**Effort:** 3-4 hours  
**Blocker:** Task 2

```
OBJECTIVE: Add on-chain DAO interactions

STEPS:
1. Create onchain.js module
2. Add NULPCollective ABI
3. Implement registerMember()
4. Implement getProposals() from contract
5. Implement getProposalState()
6. Implement castVote() on-chain
7. Implement createProposal() form
8. Implement executeProposal()
9. Create on-chain proposals section
10. Add transaction status indicators

DELIVERABLE:
- Members can register on-chain
- On-chain proposals displayed
- Execution queue for passed proposals
```

### Task 5: Genesis Proposals
**Priority:** HIGH  
**Effort:** 1-2 hours  
**Blocker:** Task 1

```
OBJECTIVE: Create the 5 genesis proposals on Snapshot

STEPS:
1. Format NCP-001 for Snapshot (markdown body)
2. Format NCP-002 for Snapshot
3. Format NCP-003 for Snapshot
4. Format NCP-004 for Snapshot
5. Format NCP-005 for Snapshot
6. Submit all 5 as proposals
7. Set 7-day voting period
8. Announce on all channels

DELIVERABLE:
- 5 proposals live on Snapshot
- Links documented
- Announcement posts drafted
```

### Task 6: Documentation & Help
**Priority:** MEDIUM  
**Effort:** 1-2 hours  
**Blocker:** None

```
OBJECTIVE: Create user-facing documentation

STEPS:
1. Write "How to Vote" guide
2. Write "How to Create Proposal" guide
3. Write FAQ (gas costs, timing, quorum)
4. Create in-page help tooltips
5. Add links to Basescan for transparency

DELIVERABLE:
- /dao/VOTING_GUIDE.md
- Help content integrated into dao.html
```

---

## Timeline

| Day | Tasks | Milestone |
|-----|-------|-----------|
| 1 | ENS + Snapshot setup | Space live |
| 2 | Wallet connection UI | Users can connect |
| 3 | Snapshot integration | Users can vote |
| 4 | Genesis proposals | Voting begins |
| 5 | On-chain integration | Full functionality |
| 6 | Testing + polish | Production ready |
| 7 | Launch + announce | DAO is LIVE |

---

## Success Metrics

After implementation, the DAO is functional when:

1. ✅ User can visit dao page
2. ✅ User can connect wallet
3. ✅ User can see their NULP balance and tier
4. ✅ User can see active proposals
5. ✅ User can vote (gasless via Snapshot)
6. ✅ Vote is recorded and visible
7. ✅ Passed proposals can be executed on-chain
8. ✅ At least 5 unique wallets have voted

---

## Fallback: Quick & Dirty Option

If full implementation takes too long, MVP approach:

1. Create Snapshot space (2 hours)
2. Update dao.html with link: "Vote on Snapshot →"
3. Done. Users click through to Snapshot's UI.

This works but loses:
- Integrated experience
- NULP balance display
- On-chain execution tracking

Recommend full implementation for professionalism.

---

## Notes

### On ENS
Snapshot requires an ENS domain. Options:
- Register `nulp.eth` on Ethereum mainnet (~$5/year)
- Use any ENS the team controls
- Some alternatives exist (Snapshot Plus) but less reliable

### On Gas Costs
- Snapshot voting: FREE (signature only)
- On-chain proposal creation: ~0.001 ETH on Base
- On-chain voting: ~0.0005 ETH on Base
- On-chain execution: varies by proposal

### On Security
- Snapshot is off-chain; results are social consensus
- On-chain is trustless but costs gas
- Hybrid approach: Snapshot for voting, on-chain for execution
- Consider timelock for high-value executions

---

*Document created: 2026-02-05*  
*Status: Ready for implementation*
