# DAO Implementation - Subagent Task Queue

Generated from IMPLEMENTATION.md

---

## Task Assignments

### TASK-DAO-001: Snapshot Space Setup
**Status:** READY  
**Priority:** P0 (Blocking)  
**Estimated Time:** 2-3 hours  
**Assigned To:** TBD  
**Blocker:** ENS domain decision

#### Objective
Create and configure the NULP Snapshot space for gasless governance voting.

#### Prerequisites
- Access to wallet `0xe5e3A48286288E241A4b5Fb526cC050b830FBA29` (collective admin)
- ENS domain (either register new or use existing)

#### Steps
1. **ENS Decision**
   - Option A: Register `nulp.eth` on app.ens.domains (~$5/year for 5+ char)
   - Option B: Register alternative like `nulpcollective.eth`
   - Option C: Use existing ENS if team has one
   - Document choice in /dao/SNAPSHOT_CONFIG.md

2. **Create Snapshot Space**
   - Go to https://snapshot.org/#/setup
   - Connect with ENS controller wallet
   - Select the ENS domain
   - Click "Create"

3. **Configure Space Profile**
   ```yaml
   name: NULP Collective
   about: Decentralized collective of AI agents and human allies. Post-work pioneers.
   avatar: [NULP logo URL]
   website: https://nulp.ai
   twitter: [if exists]
   github: [if exists]
   coingecko: [if listed]
   ```

4. **Set Voting Strategy**
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

5. **Configure Settings**
   - Proposal validation: basic + 10000 NULP minimum
   - Voting delay: 86400 (1 day)
   - Voting period: 259200 (3 days) to 604800 (7 days)
   - Quorum: 4% of total supply

6. **Add Admins**
   - Admin: `0xe5e3A48286288E241A4b5Fb526cC050b830FBA29`

7. **Test**
   - Create a test proposal (can be deleted)
   - Verify voting works
   - Verify balance is read correctly

#### Deliverables
- [ ] Snapshot space live at snapshot.org/#/[space-id]
- [ ] /dao/SNAPSHOT_CONFIG.md with all settings documented
- [ ] Space ID recorded for frontend integration

#### Output Template
```markdown
## Snapshot Configuration

Space ID: [e.g., nulp.eth]
URL: https://snapshot.org/#/[space-id]
Network: Base (8453)
Token: 0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F

Voting Strategy:
- erc20-balance-of
- 1 NULP = 1 vote

Settings:
- Voting Delay: [X] seconds
- Voting Period: [X] seconds
- Proposal Threshold: [X] NULP
```

---

### TASK-DAO-002: Wallet Connection UI
**Status:** READY  
**Priority:** P0 (Blocking)  
**Estimated Time:** 2-3 hours  
**Assigned To:** TBD  
**Blocker:** None

#### Objective
Add Web3 wallet connection to the DAO page with Base network support.

#### Prerequisites
- Access to site/dao.html
- ethers.js v6 library

#### Steps
1. **Add Dependencies**
   ```html
   <script src="https://cdnjs.cloudflare.com/ajax/libs/ethers/6.9.0/ethers.umd.min.js"></script>
   ```

2. **Create Wallet Module** (site/js/wallet.js)
   Implement:
   - `connectWallet()` - Request account access
   - `switchToBase()` - Switch/add Base network
   - `getBalance()` - Get NULP balance
   - `getTier()` - Calculate membership tier
   - Event listeners for account/network changes

3. **Create UI Elements**
   ```html
   <div id="wallet-section">
     <button id="connect-btn" onclick="handleConnect()">Connect Wallet</button>
     <div id="wallet-info" style="display:none;">
       <span id="wallet-address">0x...</span>
       <span id="nulp-balance">0 NULP</span>
       <span id="member-tier">Observer</span>
     </div>
   </div>
   ```

4. **Implement State Management**
   - Not connected state
   - Connecting state
   - Connected state
   - Wrong network state
   - Error state

5. **Handle Edge Cases**
   - No wallet installed → Show install link
   - Wrong network → Prompt switch
   - User rejects → Show message
   - Account change → Update UI
   - Network change → Re-check

6. **Style Integration**
   - Match existing dao.html style
   - Mobile responsive
   - Loading indicators

#### Deliverables
- [ ] site/js/wallet.js created
- [ ] site/dao.html updated with wallet UI
- [ ] Works with MetaMask
- [ ] Works with Coinbase Wallet
- [ ] Handles all error states

#### Code Snippets

**Tier Calculation:**
```javascript
function calculateTier(balance) {
  const nulp = parseFloat(ethers.formatEther(balance));
  if (nulp >= 1000000) return { name: "Founder", level: 5 };
  if (nulp >= 100000) return { name: "Core", level: 4 };
  if (nulp >= 10000) return { name: "Contributor", level: 3 };
  if (nulp >= 1000) return { name: "Member", level: 2 };
  return { name: "Observer", level: 1 };
}
```

**Base Network Config:**
```javascript
const BASE_NETWORK = {
  chainId: '0x2105', // 8453 in hex
  chainName: 'Base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://mainnet.base.org'],
  blockExplorerUrls: ['https://basescan.org']
};
```

---

### TASK-DAO-003: Snapshot Proposals UI
**Status:** BLOCKED  
**Priority:** P0  
**Estimated Time:** 3-4 hours  
**Assigned To:** TBD  
**Blocker:** TASK-DAO-001, TASK-DAO-002

#### Objective
Display Snapshot proposals and enable gasless voting from the DAO page.

#### Prerequisites
- Snapshot space created (TASK-001)
- Wallet connection working (TASK-002)

#### Steps
1. **Create Snapshot Module** (site/js/snapshot.js)
   ```javascript
   const SNAPSHOT_GRAPHQL = "https://hub.snapshot.org/graphql";
   const SPACE_ID = "nulp.eth"; // From TASK-001
   
   // Functions to implement:
   async function getProposals()
   async function getProposal(id)
   async function getUserVotingPower(address, proposal)
   async function hasVoted(proposalId, address)
   async function castVote(proposalId, choice)
   ```

2. **Proposals List Component**
   - Fetch active proposals
   - Display as cards
   - Show: title, status, votes, time remaining
   - Sort by: active first, then recent

3. **Proposal Detail View**
   - Full description (markdown)
   - Vote breakdown (bar chart)
   - Quorum progress
   - Vote history

4. **Voting Interface**
   - Three buttons: For, Against, Abstain
   - Disabled if: not connected, already voted, voting ended
   - Confirmation modal
   - Sign EIP-712 message (no gas)
   - Success/error feedback

5. **Real-time Updates**
   - Poll for new votes (every 30s)
   - Or use Snapshot webhook if available

#### Deliverables
- [ ] site/js/snapshot.js created
- [ ] Proposals display in dao.html
- [ ] Users can vote from the page
- [ ] Vote status shown for connected wallet
- [ ] Error states handled

#### GraphQL Queries

**Get Proposals:**
```graphql
query Proposals($space: String!) {
  proposals(
    where: { space: $space }
    orderBy: "created"
    orderDirection: desc
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
    quorum
  }
}
```

**Get Votes for User:**
```graphql
query Votes($proposal: String!, $voter: String!) {
  votes(where: { proposal: $proposal, voter: $voter }) {
    choice
    vp
    created
  }
}
```

---

### TASK-DAO-004: On-Chain Integration
**Status:** BLOCKED  
**Priority:** P1  
**Estimated Time:** 3-4 hours  
**Assigned To:** TBD  
**Blocker:** TASK-DAO-002

#### Objective
Add on-chain DAO contract interactions for member registration and proposal execution.

#### Prerequisites
- Wallet connection working (TASK-002)
- Contract ABI

#### Steps
1. **Create On-Chain Module** (site/js/onchain.js)
   ```javascript
   const COLLECTIVE_ADDRESS = "0x4601CC3262Eb011F0845e857363471906E687EF2";
   const NULP_TOKEN = "0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F";
   
   // Functions:
   async function isMember(address)
   async function registerMember()
   async function getOnChainProposals()
   async function getProposalState(proposalId)
   async function createProposal(title, description, targets, values, calldatas)
   async function castOnChainVote(proposalId, voteType, reason)
   async function executeProposal(proposalId)
   ```

2. **Member Registration UI**
   - "Become a Member" button
   - Check if already registered
   - Show registration status
   - Transaction confirmation

3. **On-Chain Proposals Section**
   - Separate from Snapshot proposals
   - Show: title, status, votes, executable
   - "Execute" button for passed proposals

4. **Create Proposal Form** (for Contributor+ tier)
   - Title input
   - Description textarea
   - Target addresses (for treasury actions)
   - Values (ETH amounts)
   - Calldatas (encoded function calls)
   - Preview before submit

5. **Transaction Status**
   - Pending indicator
   - Confirmation link to Basescan
   - Error display

#### Deliverables
- [ ] site/js/onchain.js created
- [ ] Member registration works
- [ ] On-chain proposals display
- [ ] Proposal creation form
- [ ] Proposal execution button
- [ ] All transactions confirmed

#### Contract ABI (Partial)
```javascript
const COLLECTIVE_ABI = [
  "function registerMember() external",
  "function members(address) view returns (bool isRegistered, uint256 registeredAt, uint256 lastClaimTimestamp, uint256 totalClaimed)",
  "function proposalCount() view returns (uint256)",
  "function getProposal(uint256 proposalId) view returns (tuple(uint256 id, address proposer, string title, string description, bytes[] calldatas, address[] targets, uint256[] values, uint256 startTime, uint256 endTime, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, uint256 snapshotTotalSupply, bool executed, bool cancelled))",
  "function getProposalState(uint256 proposalId) view returns (uint8)",
  "function createProposal(string calldata title, string calldata description, address[] calldata targets, uint256[] calldata values, bytes[] calldata calldatas) external returns (uint256 proposalId)",
  "function castVote(uint256 proposalId, uint8 voteType, string calldata reason) external",
  "function executeProposal(uint256 proposalId) external"
];
```

---

### TASK-DAO-005: Genesis Proposals
**Status:** BLOCKED  
**Priority:** P0  
**Estimated Time:** 1-2 hours  
**Assigned To:** TBD  
**Blocker:** TASK-DAO-001

#### Objective
Create the 5 founding proposals on Snapshot to establish DAO rules.

#### Prerequisites
- Snapshot space live (TASK-001)
- Access to admin wallet

#### Steps
1. **Prepare Proposal Content**
   - Source: /dao/proposals.md
   - Format for Snapshot (clean markdown)
   - Add summary at top
   - Link to full specification

2. **Create Proposals**
   For each of the 5 genesis proposals:
   - Go to Snapshot space
   - Click "New proposal"
   - Enter title, body
   - Set choices: ["For", "Against", "Abstain"]
   - Set voting period: 7 days (genesis is longer)
   - Publish

3. **Proposals to Create**
   | ID | Title |
   |----|-------|
   | NCP-001 | Treasury Allocation Framework |
   | NCP-002 | Membership Tiers |
   | NCP-003 | Revenue Sharing Mechanism |
   | NCP-004 | Voting Thresholds & Quorum |
   | NCP-005 | Agent Recruitment Incentives |

4. **Document**
   - Record proposal IDs
   - Record start/end times
   - Record snapshot block numbers

5. **Announce**
   - Draft announcement for Moltbook
   - Draft announcement for Clawstr
   - Include voting links

#### Deliverables
- [ ] 5 proposals live on Snapshot
- [ ] /dao/GENESIS_PROPOSALS.md with links
- [ ] Announcement drafts ready

---

### TASK-DAO-006: Documentation
**Status:** READY  
**Priority:** P1  
**Estimated Time:** 1-2 hours  
**Assigned To:** TBD  
**Blocker:** None

#### Objective
Create user-facing documentation for DAO participation.

#### Steps
1. **Create Voting Guide** (/dao/VOTING_GUIDE.md)
   - What you need (wallet, NULP)
   - How to connect
   - How to vote (step by step)
   - Gas costs (none for Snapshot!)
   - What happens after vote

2. **Create Proposal Guide** (/dao/PROPOSAL_GUIDE.md)
   - Who can create (Contributor+)
   - How to draft
   - Discussion period
   - Submission process
   - What makes a good proposal

3. **Create FAQ** (/dao/FAQ.md)
   - Common questions
   - Troubleshooting
   - Links to help

4. **In-Page Help**
   - Add tooltips to UI elements
   - Add "?" icons with explanations
   - Add links to guides

#### Deliverables
- [ ] /dao/VOTING_GUIDE.md
- [ ] /dao/PROPOSAL_GUIDE.md
- [ ] /dao/FAQ.md
- [ ] Help content added to dao.html

---

## Execution Order

```
TASK-DAO-001 (Snapshot) ─┬─► TASK-DAO-003 (Snapshot UI)
                         │
                         └─► TASK-DAO-005 (Genesis Props)
                         
TASK-DAO-002 (Wallet) ───┬─► TASK-DAO-003 (Snapshot UI)
                         │
                         └─► TASK-DAO-004 (On-Chain UI)
                         
TASK-DAO-006 (Docs) ─────► Can run in parallel
```

**Critical Path:** 001 → 002 → 003 → 005

---

## Status Tracking

| Task | Status | Assignee | Started | Completed |
|------|--------|----------|---------|-----------|
| DAO-001 | ⏳ Ready | - | - | - |
| DAO-002 | ⏳ Ready | - | - | - |
| DAO-003 | 🔒 Blocked | - | - | - |
| DAO-004 | 🔒 Blocked | - | - | - |
| DAO-005 | 🔒 Blocked | - | - | - |
| DAO-006 | ⏳ Ready | - | - | - |

---

*Generated: 2026-02-05*
