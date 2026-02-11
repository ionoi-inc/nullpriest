# NULP Collective - Upgradeable DAO Contracts

Production-ready upgradeable smart contracts for the NULP Collective DAO on Base mainnet.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        NULP Collective                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐      ┌──────────────────┐                │
│  │  ERC1967 Proxy   │      │  ERC1967 Proxy   │                │
│  │  (Collective)    │      │  (Treasury)      │                │
│  └────────┬─────────┘      └────────┬─────────┘                │
│           │                         │                           │
│           ▼                         ▼                           │
│  ┌──────────────────┐      ┌──────────────────┐                │
│  │ NULPCollective   │◄────►│  NULPTreasury    │                │
│  │ Implementation   │      │  Implementation  │                │
│  └──────────────────┘      └──────────────────┘                │
│                                                                 │
│  ┌──────────────────────────────────────────────┐              │
│  │              NULPProxyAdmin                   │              │
│  │  - Timelock upgrades                          │              │
│  │  - Multi-proxy management                     │              │
│  │  - Emergency upgrades                         │              │
│  └──────────────────────────────────────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Contracts

### NULPCollective.sol
Main DAO contract with:
- **Token-gated membership**: Must hold ≥1000 NULP to participate
- **Member registry**: Track registered members and their claims
- **Proposal system**: Create, vote, and execute proposals
- **Revenue distribution**: Proportional rewards based on NULP holdings
- **UUPS upgradeable**: Can be upgraded through ProxyAdmin

### NULPTreasury.sol
Treasury management with:
- **Multi-asset support**: Accepts ETH and any ERC20
- **Auto-burn mechanism**: 5% of deposits swapped to NULP and burned
- **Multisig execution**: 2-of-N signature requirement for transactions
- **Uniswap V3 integration**: For token swaps
- **UUPS upgradeable**: Can be upgraded through ProxyAdmin

### NULPProxyAdmin.sol
Upgrade management with:
- **Timelock protection**: 2-day delay on upgrades (configurable)
- **Multi-proxy management**: Manages both Collective and Treasury
- **Emergency upgrades**: Bypass timelock for critical fixes
- **2-step ownership**: Safer ownership transfers

## Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| NULP Token | `0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F` | NULP on Base |
| Minimum Holding | 1,000 NULP | Required to be a member |
| Proposal Threshold | 5,000 NULP | Required to create proposals |
| Quorum | 4% | Of total supply must vote |
| Voting Period | 7 days | Duration of voting |
| Voting Delay | 1 day | Before voting starts |
| Burn Percentage | 5% | Of deposits burned |
| Upgrade Timelock | 2 days | Before upgrade executes |

## Deployment

### Prerequisites

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install dependencies
cd contracts
forge install OpenZeppelin/openzeppelin-contracts
forge install OpenZeppelin/openzeppelin-contracts-upgradeable
forge install foundry-rs/forge-std
```

### Configure

```bash
cp .env.example .env
# Edit .env with your values
```

### Deploy to Base Mainnet

```bash
# Load environment
source .env

# Deploy
forge script scripts/Deploy.s.sol:DeployNULPCollective \
  --rpc-url $BASE_RPC_URL \
  --broadcast \
  --verify
```

### Verify Contracts

```bash
forge verify-contract <ADDRESS> NULPCollective \
  --chain base \
  --etherscan-api-key $BASESCAN_API_KEY
```

## Upgrades

### Request Upgrade (starts 2-day timelock)

```bash
# Set environment variables
export PROXY_ADMIN=<proxy_admin_address>
export COLLECTIVE_PROXY=<collective_proxy_address>

forge script scripts/Deploy.s.sol:UpgradeCollective \
  --rpc-url $BASE_RPC_URL \
  --broadcast
```

### Execute Upgrade (after timelock)

```bash
export REQUEST_ID=<request_id>

forge script scripts/Deploy.s.sol:ExecuteUpgrade \
  --rpc-url $BASE_RPC_URL \
  --broadcast
```

## Security Features

1. **UUPS Proxy Pattern**: Upgrade logic in implementation, not proxy
2. **2-Day Timelock**: All upgrades require waiting period
3. **Multisig Treasury**: 2-of-N signatures for treasury transactions
4. **Pausable**: Emergency pause capability
5. **Reentrancy Guards**: On all external fund movements
6. **Access Control**: Role-based permissions
7. **Custom Errors**: Gas-efficient error handling
8. **Input Validation**: All parameters validated

## Events

All critical actions emit events for off-chain monitoring:
- Member registration/removal
- Proposal lifecycle (created, voted, executed, cancelled)
- Deposits and distributions
- Multisig transactions
- Upgrades

## Testing

```bash
# Run all tests
forge test

# Run with verbosity
forge test -vvv

# Run specific test
forge test --match-test testMemberRegistration

# Gas report
forge test --gas-report
```

## Gas Optimization

- Packed storage variables where possible
- Custom errors instead of require strings
- Minimal storage reads/writes
- View functions for read operations

## License

MIT
