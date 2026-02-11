# TreasuryIntegration Contract

**Production-ready fee routing system for NullPriest DAO on Base Mainnet**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-^0.8.20-blue)](https://soliditylang.org/)
[![Network](https://img.shields.io/badge/Network-Base%20Mainnet-blue)](https://base.org/)

---

## 📋 Overview

TreasuryIntegration is an upgradeable smart contract that routes protocol fees from Headless Markets bonding curves to the NullPriest DAO Treasury. It provides secure, automated fee collection and distribution with comprehensive access controls and emergency safeguards.

### Key Features

- ✅ **Multi-token Support**: ETH, USDC, WETH, DAI, and custom ERC20 tokens
- ✅ **Automated Forwarding**: Auto-forward fees when thresholds are met
- ✅ **Batch Operations**: Process multiple markets/tokens in a single transaction
- ✅ **Security First**: ReentrancyGuard, Pausable, Role-based access control
- ✅ **Upgradeable**: UUPS proxy pattern for future enhancements
- ✅ **Gas Optimized**: Efficient batch processing and storage patterns

### Fee Flow

```
┌─────────────────┐
│ Bonding Curve   │ 10% protocol fee on trades
│ Market Contract │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Treasury      │ Aggregates fees from multiple markets
│  Integration    │ Auto-forwards when thresholds met
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   NullPriest    │ 0x0E050877dd25D67681fF2DA7eF75369c966288EC
│   DAO Treasury  │ DAO-controlled distribution
└─────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.x
- Hardhat or Foundry
- Base Mainnet RPC endpoint
- Wallet with ETH for gas fees

### Installation

```bash
# Install dependencies
npm install @openzeppelin/contracts-upgradeable
npm install @openzeppelin/contracts
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Or with Foundry
forge install OpenZeppelin/openzeppelin-contracts-upgradeable
forge install OpenZeppelin/openzeppelin-contracts
```

### Deploy to Base Mainnet

```bash
# With Hardhat
npx hardhat run scripts/deploy-treasury-integration.js --network base

# With Foundry
forge script scripts/deploy-treasury-integration.js:DeployTreasuryIntegration \
  --rpc-url base \
  --broadcast \
  --verify
```

---

## 📦 Contract Architecture

### Core Components

#### TreasuryIntegration.sol
Main contract handling fee collection and routing. Upgradeable via UUPS proxy.

**Key Functions:**
- `collectFee(address token, uint256 amount)` - Collect fees from authorized markets
- `forwardToTreasury(address token)` - Manually forward accumulated fees
- `collectAndForward(address token, uint256 amount)` - Atomic collect + forward
- `batchCollectFees(address[] tokens, uint256[] amounts)` - Batch processing

**Access Control Roles:**
- `DEFAULT_ADMIN_ROLE` - Full contract control, role management
- `MARKET_ROLE` - Authorized to call collectFee()
- `OPERATOR_ROLE` - Can manually forward fees
- `PAUSER_ROLE` - Emergency pause functionality
- `UPGRADER_ROLE` - Contract upgrade authorization

### Security Features

1. **ReentrancyGuard**: Prevents reentrancy attacks on all state-changing functions
2. **Pausable**: Emergency pause for security incidents
3. **Access Control**: Granular role-based permissions
4. **Emergency Withdrawal**: Recovery mechanism when paused
5. **Input Validation**: Comprehensive checks on all parameters

---

## 🔧 Configuration

### Default Thresholds

Auto-forward triggers when accumulated fees reach:

```solidity
ETH:  0.1 ETH
USDC: 100 USDC
WETH: 0.1 WETH
DAI:  100 DAI
```

### Modifying Thresholds

```javascript
// Set minimum threshold for auto-forwarding
await treasuryIntegration.setForwardingThreshold(
  tokenAddress,
  ethers.parseUnits("50", 6) // 50 USDC
);

// Disable auto-forwarding for a token
await treasuryIntegration.setForwardingThreshold(tokenAddress, 0);
```

### Authorizing Markets

```javascript
// Single market
await treasuryIntegration.setMarketAuthorization(marketAddress, true);

// Batch authorization
await treasuryIntegration.batchSetMarketAuthorization(
  [market1, market2, market3],
  [true, true, true]
);
```

---

## 📝 Integration Guide

### Bonding Curve Market Integration

Update your market contract to call TreasuryIntegration after trades:

```solidity
// In your BondingCurveMarket contract
ITreasuryIntegration public treasuryIntegration;

function _collectProtocolFee(address token, uint256 amount) internal {
    if (amount > 0) {
        // Transfer tokens to TreasuryIntegration
        IERC20(token).safeTransfer(address(treasuryIntegration), amount);
        
        // Notify TreasuryIntegration
        treasuryIntegration.collectFee(token, amount);
    }
}

// For ETH fees
function _collectETHFee() internal {
    uint256 feeAmount = msg.value * protocolFeeBps / 10000;
    if (feeAmount > 0) {
        treasuryIntegration.collectFee{value: feeAmount}(address(0), feeAmount);
    }
}
```

### Query Functions

```javascript
// Check pending fees for a token
const pending = await treasuryIntegration.getPendingFees(tokenAddress);

// Check if auto-forward threshold is met
const shouldForward = await treasuryIntegration.shouldAutoForward(tokenAddress);

// Get total collected fees (all-time)
const total = await treasuryIntegration.getTotalFeesCollected(tokenAddress);

// Check if market is authorized
const isAuthorized = await treasuryIntegration.authorizedMarkets(marketAddress);

// Get current forwarding threshold
const threshold = await treasuryIntegration.forwardingThresholds(tokenAddress);
```

---

## 🧪 Testing

### Run Unit Tests

```bash
# With Hardhat
npx hardhat test test/TreasuryIntegration.test.js

# With Foundry
forge test --match-contract TreasuryIntegrationTest
```

### Test Coverage

The test suite covers:
- ✅ Deployment and initialization
- ✅ Market authorization (single and batch)
- ✅ ETH fee collection
- ✅ ERC20 fee collection
- ✅ Manual fee forwarding
- ✅ Auto-forwarding triggers
- ✅ Batch operations
- ✅ Access control enforcement
- ✅ Pause/unpause functionality
- ✅ Emergency withdrawals
- ✅ Contract upgradeability
- ✅ Edge cases and error handling

### Gas Optimization

| Function | Gas Usage | Optimizations Applied |
|----------|-----------|----------------------|
| `collectFee` (ETH) | ~45,000 | Direct transfer, minimal storage |
| `collectFee` (ERC20) | ~60,000 | Single SLOAD for authorization |
| `forwardToTreasury` | ~55,000 | Batch-friendly storage pattern |
| `batchCollectFees` (5 tokens) | ~180,000 | Loop optimization, packed storage |

---

## 🔐 Security

### Audit Checklist

- [x] ReentrancyGuard on all payable/token transfer functions
- [x] Access control on privileged functions
- [x] Emergency pause mechanism
- [x] Input validation (zero addresses, zero amounts)
- [x] Safe ERC20 transfers with balance checks
- [x] No delegatecall to untrusted contracts
- [x] Proper event emission for off-chain tracking
- [x] Upgrade authorization restricted to UPGRADER_ROLE
- [x] Treasury address immutability (requires upgrade to change)

### Recommended Audits

Before mainnet deployment, consider:
1. **External Security Audit**: Engage firms like Trail of Bits, OpenZeppelin, or Consensys Diligence
2. **Formal Verification**: For critical mathematical operations
3. **Economic Security Review**: Validate fee thresholds and game theory
4. **Bug Bounty**: Deploy on testnet with public bounty program

### Emergency Procedures

**Pause Contract:**
```javascript
// Any account with PAUSER_ROLE
await treasuryIntegration.pause();
```

**Emergency Withdrawal (when paused):**
```javascript
// Only DEFAULT_ADMIN_ROLE
await treasuryIntegration.emergencyWithdraw(tokenAddress, recipient, amount);
```

**Upgrade Contract:**
```javascript
// Only UPGRADER_ROLE
await treasuryIntegration.upgradeToAndCall(newImplementation, "0x");
```

---

## 📚 API Reference

### State Variables

```solidity
address public constant TREASURY_ADDRESS = 0x0E050877dd25D67681fF2DA7eF75369c966288EC;

mapping(address => bool) public authorizedMarkets;
mapping(address => uint256) public pendingFees;
mapping(address => uint256) public totalFeesCollected;
mapping(address => uint256) public forwardingThresholds;
```

### Events

```solidity
event FeeCollected(address indexed token, address indexed market, uint256 amount);
event FeeForwarded(address indexed token, uint256 amount, address indexed recipient);
event MarketAuthorizationUpdated(address indexed market, bool authorized);
event ForwardingThresholdUpdated(address indexed token, uint256 threshold);
event EmergencyWithdrawal(address indexed token, address indexed recipient, uint256 amount);
```

### Modifiers

```solidity
modifier onlyAuthorizedMarket()
modifier whenNotPaused()
modifier nonReentrant()
```

---

## 🌐 Deployment Information

### Base Mainnet

**Network Details:**
- Chain ID: 8453
- RPC: https://mainnet.base.org
- Explorer: https://basescan.org

**Deployed Addresses:**
- Treasury Integration (Proxy): `[DEPLOY_ADDRESS]`
- Treasury Integration (Implementation): `[IMPL_ADDRESS]`
- NullPriest Treasury: `0x0E050877dd25D67681fF2DA7eF75369c966288EC`

**Verification:**
```bash
npx hardhat verify --network base PROXY_ADDRESS

# Verify implementation
npx hardhat verify --network base IMPLEMENTATION_ADDRESS
```

---

## 📊 Monitoring & Analytics

### Recommended Events to Track

1. **FeeCollected**: Monitor incoming fees from markets
2. **FeeForwarded**: Track distributions to treasury
3. **MarketAuthorizationUpdated**: Audit market access changes
4. **Paused/Unpaused**: Alert on emergency state changes

### Dashboard Queries

```javascript
// Total fees collected (all-time)
const ethCollected = await treasuryIntegration.getTotalFeesCollected(ETH_ADDRESS);
const usdcCollected = await treasuryIntegration.getTotalFeesCollected(USDC_ADDRESS);

// Current pending fees
const ethPending = await treasuryIntegration.getPendingFees(ETH_ADDRESS);
const usdcPending = await treasuryIntegration.getPendingFees(USDC_ADDRESS);

// Auto-forward status
const ethShouldForward = await treasuryIntegration.shouldAutoForward(ETH_ADDRESS);
```

---

## 🛠️ Development Workflow

### Local Testing

```bash
# Start local Hardhat node
npx hardhat node

# Deploy to local network
npx hardhat run scripts/deploy-treasury-integration.js --network localhost

# Run tests
npx hardhat test

# Generate coverage report
npx hardhat coverage
```

### Testnet Deployment

```bash
# Deploy to Base Sepolia testnet
npx hardhat run scripts/deploy-treasury-integration.js --network base-sepolia

# Verify contract
npx hardhat verify --network base-sepolia [DEPLOYED_ADDRESS]
```

### Mainnet Deployment Checklist

- [ ] All tests passing (100% coverage)
- [ ] External security audit completed
- [ ] Testnet deployment validated
- [ ] Treasury address verified
- [ ] Admin keys secured (multisig recommended)
- [ ] Emergency response plan documented
- [ ] Monitoring/alerting configured
- [ ] Team roles assigned (admin, operator, pauser)

---

## 🤝 Contributing

### Development Setup

```bash
git clone <repository-url>
cd treasury-integration
npm install
cp .env.example .env
# Configure .env with your keys
```

### Code Style

- Solidity: Follow [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- JavaScript: Prettier + ESLint
- Comments: NatSpec for all public/external functions

### Pull Request Process

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for new functionality
4. Ensure all tests pass
5. Update documentation
6. Submit PR with detailed description

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🔗 Resources

- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Foundry Book](https://book.getfoundry.sh/)
- [Base Network Documentation](https://docs.base.org/)
- [Solidity Documentation](https://docs.soliditylang.org/)

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/treasury-integration/issues)
- **Discord**: [NullPriest Community](https://discord.gg/nullpriest)
- **Email**: dev@nullpriest.com

---

## ⚠️ Disclaimer

This software is provided "as is" without warranty. Use at your own risk. Always conduct thorough testing and security audits before deploying to mainnet with real funds.

---

**Built with ❤️ by the NullPriest team**