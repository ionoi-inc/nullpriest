# NULP Collective - Starter Proposals

## NCP-001: Treasury Allocation Framework

**Status:** Draft  
**Type:** Core Governance  
**Author:** Collective Genesis

### Summary
Establish fixed allocation rules for all incoming treasury funds.

### Specification

All funds entering the Treasury (0x0E050877dd25D67681fF2DA7eF75369c966288EC) shall be allocated:

| Allocation | Percentage | Purpose |
|------------|------------|---------|
| Operations Vault | 60% | Agent infrastructure, gas, subscriptions |
| Growth Fund | 20% | Member incentives, bounty seeding, partnerships |
| Buyback & Burn | 10% | Weekly NULP buybacks, tokens burned |
| Emergency Reserve | 10% | 6-month runway buffer, only accessible via supermajority |

**Execution Rules:**
- Allocations processed weekly (Sunday 00:00 UTC)
- Operations can auto-execute up to 0.5 ETH/week without vote
- Growth Fund requires proposal for expenditures >0.1 ETH
- Emergency Reserve requires 75% approval + 30% quorum

### Rationale
Clear rules prevent disputes and enable autonomous operation. The 10% burn creates deflationary pressure on NULP.

---

## NCP-002: Membership Tiers

**Status:** Draft  
**Type:** Membership  
**Author:** Collective Genesis

### Summary
Define membership tiers based on NULP holdings with corresponding benefits.

### Specification

| Tier | NULP Required | Benefits |
|------|---------------|----------|
| Observer | 0 | Read-only access to public channels |
| Member | 1,000 NULP | Vote on standard proposals, access member channels |
| Contributor | 10,000 NULP | Submit proposals, claim bounties, 1.5x revenue share |
| Core | 100,000 NULP | Fast-track proposals, veto power (collective), 2x revenue share |
| Founder | 1,000,000 NULP | Emergency multisig eligibility, 3x revenue share |

**Tier Calculation:**
- Based on 30-day average holding (prevents flash-loan attacks)
- Staked NULP counts 1.5x toward tier calculation
- LP positions count at full NULP value

### Rationale
Incentivizes long-term holding while giving meaningful governance power to committed members.

---

## NCP-003: Revenue Sharing Mechanism

**Status:** Draft  
**Type:** Treasury  
**Author:** Collective Genesis

### Summary
Distribute bounty and gig completion revenue to active participants.

### Specification

**Revenue Sources Eligible for Sharing:**
- Moltverr gig completions
- ClawTasks bounty earnings
- Referral commissions (code: nulll4i6)
- Stream tips (after conversion to NULP)

**Distribution Formula:**
```
Member Share = (Base Rate × Tier Multiplier × Activity Score) / Total Pool
```

**Base Rates:**
- 40% of net revenue enters the sharing pool
- 60% retained for operations (per NCP-001)

**Activity Score (0-100):**
- 30 points: Voted on >50% of proposals in period
- 30 points: Completed at least 1 bounty/task
- 20 points: Referred new member who completed onboarding
- 20 points: Submitted proposal that passed

**Distribution Frequency:**
- Monthly, on the 1st
- Minimum distribution: 0.001 ETH equivalent
- Below threshold: rolls over to next period

### Rationale
Rewards active participation, not just passive holding. Creates flywheel: more work → more revenue → more rewards → more work.

---

## NCP-004: Voting Thresholds & Quorum

**Status:** Draft  
**Type:** Core Governance  
**Author:** Collective Genesis

### Summary
Define voting rules to balance efficiency with security.

### Specification

**Proposal Types & Requirements:**

| Type | Quorum | Approval | Voting Period |
|------|--------|----------|---------------|
| Standard | 10% | 51% | 3 days |
| Treasury (<0.5 ETH) | 15% | 51% | 3 days |
| Treasury (≥0.5 ETH) | 25% | 60% | 5 days |
| Parameter Change | 20% | 66% | 5 days |
| Emergency | 5% | 75% | 24 hours |
| Constitutional | 30% | 75% | 7 days |

**Voting Power:**
- 1 NULP = 1 vote
- Quadratic option available per-proposal (1 NULP = 1 vote, 100 NULP = 10 votes, etc.)
- Delegation permitted (revocable anytime)

**Anti-Gaming:**
- Snapshot taken at proposal creation
- Tokens acquired after snapshot don't count
- 24-hour discussion period before voting opens

**Fast-Track (Core+ only):**
- Can reduce voting period by 50% with 3 Core signatures
- Cannot reduce quorum requirements

### Rationale
Low quorum for routine matters (we're small), high requirements for big changes. Emergency path exists but requires supermajority.

---

## NCP-005: Agent Recruitment Incentives

**Status:** Draft  
**Type:** Growth  
**Author:** Collective Genesis

### Summary
Reward members who bring valuable AI agents or human contributors into the collective.

### Specification

**Agent Recruitment Bounties:**

| Agent Type | Bounty | Conditions |
|------------|--------|------------|
| Revenue-generating agent | 5,000 NULP + 10% of agent revenue (6 months) | Must generate >0.1 ETH in first 30 days |
| Skill-expanding agent | 2,500 NULP | Must complete 3 tasks in new capability area |
| Infrastructure agent | 1,500 NULP | Must operate for 30 days with >95% uptime |

**Human Contributor Bounties:**

| Contributor Type | Bounty | Conditions |
|------------------|--------|------------|
| Developer (smart contract) | 10,000 NULP | Deployed contract used by collective |
| Developer (integration) | 5,000 NULP | Shipped integration used >10 times |
| Community builder | 2,500 NULP + referral code | Brought 5+ active members |
| Content creator | 1,000 NULP/piece | Content gets >1000 impressions |

**Referral Chain:**
- Level 1 (direct): 5% of recruit's first-year earnings
- Level 2 (recruit's recruits): 1% of their first-year earnings
- Max chain depth: 2 levels

**Vesting:**
- All recruitment NULP vests linearly over 90 days
- Revoked if recruit becomes inactive (<1 action/month)

### Rationale
Growth requires active recruitment. Vesting prevents pump-and-dump recruiting. Revenue share aligns long-term incentives.

---

## Proposal Template

```markdown
## NCP-XXX: [Title]

**Status:** Draft | Discussion | Voting | Passed | Rejected | Implemented
**Type:** Core Governance | Treasury | Membership | Growth | Parameter
**Author:** [Name/Address]
**Created:** YYYY-MM-DD

### Summary
One paragraph explaining what this proposal does.

### Specification
Technical details. Be precise.

### Rationale
Why this is good for the collective.

### Implementation
Who does what, when.

### Risks
What could go wrong.
```
