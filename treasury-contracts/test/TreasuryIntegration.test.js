// SPDX-License-Identifier: MIT
/**
 * Unit Tests for TreasuryIntegration Contract
 * 
 * Test Coverage:
 * - Deployment and initialization
 * - Fee collection (ETH and ERC20)
 * - Fee forwarding to treasury
 * - Auto-forwarding when thresholds are met
 * - Access control and authorization
 * - Emergency functions
 * - Pause/unpause functionality
 * - Batch operations
 * 
 * Usage (Hardhat):
 *   npx hardhat test test/TreasuryIntegration.test.js
 * 
 * Usage (Foundry):
 *   forge test --match-contract TreasuryIntegrationTest
 */

const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("TreasuryIntegration", function () {
  let treasuryIntegration;
  let mockToken;
  let treasury;
  let admin;
  let market1;
  let market2;
  let operator;
  let unauthorized;
  
  const INITIAL_BALANCE = ethers.parseEther("100");
  const FEE_AMOUNT = ethers.parseEther("1");
  const THRESHOLD = ethers.parseEther("0.1");
  
  beforeEach(async function () {
    [admin, treasury, market1, market2, operator, unauthorized] = await ethers.getSigners();
    
    // Deploy mock ERC20 token
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy("Mock USDC", "USDC", 6);
    await mockToken.waitForDeployment();
    
    // Mint tokens to markets for testing
    await mockToken.mint(market1.address, ethers.parseUnits("1000000", 6));
    await mockToken.mint(market2.address, ethers.parseUnits("1000000", 6));
    
    // Deploy TreasuryIntegration
    const TreasuryIntegration = await ethers.getContractFactory("TreasuryIntegration");
    treasuryIntegration = await upgrades.deployProxy(
      TreasuryIntegration,
      [treasury.address, admin.address],
      { initializer: "initialize", kind: "uups" }
    );
    await treasuryIntegration.waitForDeployment();
    
    // Grant OPERATOR_ROLE to operator
    const OPERATOR_ROLE = await treasuryIntegration.OPERATOR_ROLE();
    await treasuryIntegration.connect(admin).grantRole(OPERATOR_ROLE, operator.address);
  });
  
  describe("Deployment", function () {
    it("Should set the correct treasury address", async function () {
      expect(await treasuryIntegration.treasury()).to.equal(treasury.address);
    });
    
    it("Should grant admin all necessary roles", async function () {
      const DEFAULT_ADMIN_ROLE = await treasuryIntegration.DEFAULT_ADMIN_ROLE();
      const OPERATOR_ROLE = await treasuryIntegration.OPERATOR_ROLE();
      const PAUSER_ROLE = await treasuryIntegration.PAUSER_ROLE();
      const UPGRADER_ROLE = await treasuryIntegration.UPGRADER_ROLE();
      
      expect(await treasuryIntegration.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await treasuryIntegration.hasRole(OPERATOR_ROLE, admin.address)).to.be.true;
      expect(await treasuryIntegration.hasRole(PAUSER_ROLE, admin.address)).to.be.true;
      expect(await treasuryIntegration.hasRole(UPGRADER_ROLE, admin.address)).to.be.true;
    });
    
    it("Should set default distribution thresholds", async function () {
      const ethThreshold = await treasuryIntegration.distributionThresholds(ethers.ZeroAddress);
      expect(ethThreshold).to.equal(ethers.parseEther("0.1"));
      
      // USDC threshold on Base: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
      const usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
      const usdcThreshold = await treasuryIntegration.distributionThresholds(usdcAddress);
      expect(usdcThreshold).to.equal(100_000000); // 100 USDC with 6 decimals
    });
    
    it("Should not be paused initially", async function () {
      expect(await treasuryIntegration.paused()).to.be.false;
    });
  });
  
  describe("Market Authorization", function () {
    it("Should allow admin to authorize markets", async function () {
      await treasuryIntegration.connect(admin).setMarketAuthorization(market1.address, true);
      expect(await treasuryIntegration.authorizedMarkets(market1.address)).to.be.true;
    });
    
    it("Should emit MarketAuthorized event", async function () {
      await expect(treasuryIntegration.connect(admin).setMarketAuthorization(market1.address, true))
        .to.emit(treasuryIntegration, "MarketAuthorized")
        .withArgs(market1.address, true);
    });
    
    it("Should grant MARKET_ROLE when authorizing", async function () {
      await treasuryIntegration.connect(admin).setMarketAuthorization(market1.address, true);
      const MARKET_ROLE = await treasuryIntegration.MARKET_ROLE();
      expect(await treasuryIntegration.hasRole(MARKET_ROLE, market1.address)).to.be.true;
    });
    
    it("Should revoke MARKET_ROLE when deauthorizing", async function () {
      await treasuryIntegration.connect(admin).setMarketAuthorization(market1.address, true);
      await treasuryIntegration.connect(admin).setMarketAuthorization(market1.address, false);
      
      const MARKET_ROLE = await treasuryIntegration.MARKET_ROLE();
      expect(await treasuryIntegration.hasRole(MARKET_ROLE, market1.address)).to.be.false;
    });
    
    it("Should allow batch authorization", async function () {
      await treasuryIntegration.connect(admin).batchSetMarketAuthorization(
        [market1.address, market2.address],
        true
      );
      
      expect(await treasuryIntegration.authorizedMarkets(market1.address)).to.be.true;
      expect(await treasuryIntegration.authorizedMarkets(market2.address)).to.be.true;
    });
    
    it("Should revert if non-admin tries to authorize", async function () {
      await expect(
        treasuryIntegration.connect(unauthorized).setMarketAuthorization(market1.address, true)
      ).to.be.reverted;
    });
  });
  
  describe("ETH Fee Collection", function () {
    beforeEach(async function () {
      await treasuryIntegration.connect(admin).setMarketAuthorization(market1.address, true);
    });
    
    it("Should collect ETH fees from authorized market", async function () {
      await treasuryIntegration.connect(market1).collectFee(FEE_AMOUNT, { value: FEE_AMOUNT });
      
      expect(await treasuryIntegration.pendingFees(ethers.ZeroAddress)).to.equal(FEE_AMOUNT);
      expect(await treasuryIntegration.totalFeesCollected(ethers.ZeroAddress)).to.equal(FEE_AMOUNT);
    });
    
    it("Should emit FeeCollected event", async function () {
      await expect(
        treasuryIntegration.connect(market1).collectFee(FEE_AMOUNT, { value: FEE_AMOUNT })
      )
        .to.emit(treasuryIntegration, "FeeCollected")
        .withArgs(market1.address, ethers.ZeroAddress, FEE_AMOUNT, await time.latest());
    });
    
    it("Should revert if unauthorized market tries to collect", async function () {
      await expect(
        treasuryIntegration.connect(unauthorized).collectFee(FEE_AMOUNT, { value: FEE_AMOUNT })
      ).to.be.revertedWithCustomError(treasuryIntegration, "UnauthorizedMarket");
    });
    
    it("Should revert if amount is zero", async function () {
      await expect(
        treasuryIntegration.connect(market1).collectFee(0, { value: 0 })
      ).to.be.revertedWithCustomError(treasuryIntegration, "ZeroAmount");
    });
    
    it("Should revert if msg.value doesn't match amount", async function () {
      await expect(
        treasuryIntegration.connect(market1).collectFee(FEE_AMOUNT, { value: FEE_AMOUNT / 2n })
      ).to.be.revertedWithCustomError(treasuryIntegration, "InsufficientBalance");
    });
    
    it("Should accumulate fees from multiple collections", async function () {
      await treasuryIntegration.connect(market1).collectFee(FEE_AMOUNT, { value: FEE_AMOUNT });
      await treasuryIntegration.connect(market1).collectFee(FEE_AMOUNT, { value: FEE_AMOUNT });
      
      expect(await treasuryIntegration.pendingFees(ethers.ZeroAddress)).to.equal(FEE_AMOUNT * 2n);
    });
  });
  
  describe("ERC20 Fee Collection", function () {
    beforeEach(async function () {
      await treasuryIntegration.connect(admin).setMarketAuthorization(market1.address, true);
    });
    
    it("Should collect ERC20 fees from authorized market", async function () {
      const amount = ethers.parseUnits("100", 6); // 100 USDC
      
      // Approve and collect
      await mockToken.connect(market1).approve(treasuryIntegration.getAddress(), amount);
      await treasuryIntegration.connect(market1).collectTokenFee(mockToken.getAddress(), amount);
      
      expect(await treasuryIntegration.pendingFees(mockToken.getAddress())).to.equal(amount);
    });
    
    it("Should revert if token address is zero", async function () {
      await expect(
        treasuryIntegration.connect(market1).collectTokenFee(ethers.ZeroAddress, 100)
      ).to.be.revertedWithCustomError(treasuryIntegration, "ZeroAddress");
    });
    
    it("Should revert if transfer fails", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      // Don't approve - transfer should fail
      await expect(
        treasuryIntegration.connect(market1).collectTokenFee(mockToken.getAddress(), amount)
      ).to.be.revertedWithCustomError(treasuryIntegration, "TransferFailed");
    });
  });
  
  describe("Fee Forwarding", function () {
    beforeEach(async function () {
      await treasuryIntegration.connect(admin).setMarketAuthorization(market1.address, true);
    });
    
    it("Should forward ETH fees to treasury", async function () {
      await treasuryIntegration.connect(market1).collectFee(FEE_AMOUNT, { value: FEE_AMOUNT });
      
      const treasuryBalanceBefore = await ethers.provider.getBalance(treasury.address);
      
      await treasuryIntegration.connect(operator).forwardToTreasury(ethers.ZeroAddress);
      
      const treasuryBalanceAfter = await ethers.provider.getBalance(treasury.address);
      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(FEE_AMOUNT);
      expect(await treasuryIntegration.pendingFees(ethers.ZeroAddress)).to.equal(0);
    });
    
    it("Should emit FeesForwarded event", async function () {
      await treasuryIntegration.connect(market1).collectFee(FEE_AMOUNT, { value: FEE_AMOUNT });
      
      await expect(
        treasuryIntegration.connect(operator).forwardToTreasury(ethers.ZeroAddress)
      )
        .to.emit(treasuryIntegration, "FeesForwarded")
        .withArgs(ethers.ZeroAddress, FEE_AMOUNT, treasury.address, await time.latest());
    });
    
    it("Should forward ERC20 fees to treasury", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      await mockToken.connect(market1).approve(treasuryIntegration.getAddress(), amount);
      await treasuryIntegration.connect(market1).collectTokenFee(mockToken.getAddress(), amount);
      
      await treasuryIntegration.connect(operator).forwardToTreasury(mockToken.getAddress());
      
      expect(await mockToken.balanceOf(treasury.address)).to.equal(amount);
      expect(await treasuryIntegration.pendingFees(mockToken.getAddress())).to.equal(0);
    });
    
    it("Should revert if no pending fees", async function () {
      await expect(
        treasuryIntegration.connect(operator).forwardToTreasury(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(treasuryIntegration, "ZeroAmount");
    });
    
    it("Should allow batch forwarding", async function () {
      const ethAmount = ethers.parseEther("1");
      const tokenAmount = ethers.parseUnits("100", 6);
      
      // Collect both ETH and token fees
      await treasuryIntegration.connect(market1).collectFee(ethAmount, { value: ethAmount });
      await mockToken.connect(market1).approve(treasuryIntegration.getAddress(), tokenAmount);
      await treasuryIntegration.connect(market1).collectTokenFee(mockToken.getAddress(), tokenAmount);
      
      // Batch forward
      await treasuryIntegration.connect(operator).batchForwardToTreasury([
        ethers.ZeroAddress,
        mockToken.getAddress()
      ]);
      
      expect(await treasuryIntegration.pendingFees(ethers.ZeroAddress)).to.equal(0);
      expect(await treasuryIntegration.pendingFees(mockToken.getAddress())).to.equal(0);
    });
  });
  
  describe("Auto-Forwarding", function () {
    beforeEach(async function () {
      await treasuryIntegration.connect(admin).setMarketAuthorization(market1.address, true);
      await treasuryIntegration.connect(operator).setDistributionThreshold(ethers.ZeroAddress, THRESHOLD);
    });
    
    it("Should auto-forward when threshold is met", async function () {
      const treasuryBalanceBefore = await ethers.provider.getBalance(treasury.address);
      
      // Collect exactly the threshold amount
      await treasuryIntegration.connect(market1).collectFee(THRESHOLD, { value: THRESHOLD });
      
      const treasuryBalanceAfter = await ethers.provider.getBalance(treasury.address);
      
      // Should have auto-forwarded
      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(THRESHOLD);
      expect(await treasuryIntegration.pendingFees(ethers.ZeroAddress)).to.equal(0);
    });
    
    it("Should not auto-forward below threshold", async function () {
      const belowThreshold = THRESHOLD / 2n;
      
      await treasuryIntegration.connect(market1).collectFee(belowThreshold, { value: belowThreshold });
      
      // Should not have forwarded
      expect(await treasuryIntegration.pendingFees(ethers.ZeroAddress)).to.equal(belowThreshold);
    });
    
    it("Should check if auto-forwarding would trigger", async function () {
      expect(await treasuryIntegration.shouldAutoForward(ethers.ZeroAddress)).to.be.false;
      
      await treasuryIntegration.connect(market1).collectFee(THRESHOLD - 1n, { value: THRESHOLD - 1n });
      expect(await treasuryIntegration.shouldAutoForward(ethers.ZeroAddress)).to.be.false;
      
      // Forwarding already happened at threshold, so pending is 0
      await treasuryIntegration.connect(market1).collectFee(1n, { value: 1n });
      expect(await treasuryIntegration.shouldAutoForward(ethers.ZeroAddress)).to.be.false;
    });
    
    it("Should disable auto-forwarding when threshold is 0", async function () {
      await treasuryIntegration.connect(operator).setDistributionThreshold(ethers.ZeroAddress, 0);
      
      await treasuryIntegration.connect(market1).collectFee(FEE_AMOUNT, { value: FEE_AMOUNT });
      
      // Should not auto-forward
      expect(await treasuryIntegration.pendingFees(ethers.ZeroAddress)).to.equal(FEE_AMOUNT);
    });
  });
  
  describe("Admin Functions", function () {
    it("Should allow admin to update treasury", async function () {
      const newTreasury = unauthorized.address;
      
      await expect(treasuryIntegration.connect(admin).setTreasury(newTreasury))
        .to.emit(treasuryIntegration, "TreasuryUpdated")
        .withArgs(treasury.address, newTreasury);
      
      expect(await treasuryIntegration.treasury()).to.equal(newTreasury);
    });
    
    it("Should revert if setting zero address as treasury", async function () {
      await expect(
        treasuryIntegration.connect(admin).setTreasury(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(treasuryIntegration, "ZeroAddress");
    });
    
    it("Should allow operator to set thresholds", async function () {
      const newThreshold = ethers.parseEther("1");
      
      await expect(
        treasuryIntegration.connect(operator).setDistributionThreshold(ethers.ZeroAddress, newThreshold)
      )
        .to.emit(treasuryIntegration, "ThresholdUpdated")
        .withArgs(ethers.ZeroAddress, THRESHOLD, newThreshold);
      
      expect(await treasuryIntegration.distributionThresholds(ethers.ZeroAddress)).to.equal(newThreshold);
    });
  });
  
  describe("Pause Functionality", function () {
    beforeEach(async function () {
      await treasuryIntegration.connect(admin).setMarketAuthorization(market1.address, true);
    });
    
    it("Should allow pauser to pause contract", async function () {
      await treasuryIntegration.connect(admin).pause();
      expect(await treasuryIntegration.paused()).to.be.true;
    });
    
    it("Should prevent fee collection when paused", async function () {
      await treasuryIntegration.connect(admin).pause();
      
      await expect(
        treasuryIntegration.connect(market1).collectFee(FEE_AMOUNT, { value: FEE_AMOUNT })
      ).to.be.revertedWith("Pausable: paused");
    });
    
    it("Should allow unpausing", async function () {
      await treasuryIntegration.connect(admin).pause();
      await treasuryIntegration.connect(admin).unpause();
      
      expect(await treasuryIntegration.paused()).to.be.false;
      
      // Should work again
      await treasuryIntegration.connect(market1).collectFee(FEE_AMOUNT, { value: FEE_AMOUNT });
      expect(await treasuryIntegration.pendingFees(ethers.ZeroAddress)).to.equal(FEE_AMOUNT);
    });
  });
  
  describe("Emergency Withdrawal", function () {
    beforeEach(async function () {
      await treasuryIntegration.connect(admin).setMarketAuthorization(market1.address, true);
    });
    
    it("Should allow emergency ETH withdrawal when paused", async function () {
      // Collect fees
      await treasuryIntegration.connect(market1).collectFee(FEE_AMOUNT, { value: FEE_AMOUNT });
      
      // Pause
      await treasuryIntegration.connect(admin).pause();
      
      // Emergency withdraw
      const recipientBalanceBefore = await ethers.provider.getBalance(unauthorized.address);
      
      await expect(
        treasuryIntegration.connect(admin).emergencyWithdraw(
          ethers.ZeroAddress,
          FEE_AMOUNT,
          unauthorized.address
        )
      )
        .to.emit(treasuryIntegration, "EmergencyWithdrawal")
        .withArgs(ethers.ZeroAddress, FEE_AMOUNT, unauthorized.address, await time.latest());
      
      const recipientBalanceAfter = await ethers.provider.getBalance(unauthorized.address);
      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(FEE_AMOUNT);
    });
    
    it("Should allow emergency ERC20 withdrawal when paused", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      await mockToken.connect(market1).approve(treasuryIntegration.getAddress(), amount);
      await treasuryIntegration.connect(market1).collectTokenFee(mockToken.getAddress(), amount);
      
      await treasuryIntegration.connect(admin).pause();
      
      await treasuryIntegration.connect(admin).emergencyWithdraw(
        mockToken.getAddress(),
        amount,
        unauthorized.address
      );
      
      expect(await mockToken.balanceOf(unauthorized.address)).to.equal(amount);
    });
    
    it("Should revert emergency withdrawal when not paused", async function () {
      await treasuryIntegration.connect(market1).collectFee(FEE_AMOUNT, { value: FEE_AMOUNT });
      
      await expect(
        treasuryIntegration.connect(admin).emergencyWithdraw(
          ethers.ZeroAddress,
          FEE_AMOUNT,
          unauthorized.address
        )
      ).to.be.revertedWith("Pausable: not paused");
    });
    
    it("Should revert if non-admin tries emergency withdrawal", async function () {
      await treasuryIntegration.connect(admin).pause();
      
      await expect(
        treasuryIntegration.connect(unauthorized).emergencyWithdraw(
          ethers.ZeroAddress,
          FEE_AMOUNT,
          unauthorized.address
        )
      ).to.be.reverted;
    });
  });
  
  describe("View Functions", function () {
    beforeEach(async function () {
      await treasuryIntegration.connect(admin).setMarketAuthorization(market1.address, true);
    });
    
    it("Should return correct pending fees", async function () {
      await treasuryIntegration.connect(market1).collectFee(FEE_AMOUNT, { value: FEE_AMOUNT });
      expect(await treasuryIntegration.getPendingFees(ethers.ZeroAddress)).to.equal(FEE_AMOUNT);
    });
    
    it("Should return correct total fees collected", async function () {
      await treasuryIntegration.connect(market1).collectFee(FEE_AMOUNT, { value: FEE_AMOUNT });
      expect(await treasuryIntegration.getTotalFeesCollected(ethers.ZeroAddress)).to.equal(FEE_AMOUNT);
      
      // Forward fees
      await treasuryIntegration.connect(operator).forwardToTreasury(ethers.ZeroAddress);
      
      // Total should still be FEE_AMOUNT
      expect(await treasuryIntegration.getTotalFeesCollected(ethers.ZeroAddress)).to.equal(FEE_AMOUNT);
    });
    
    it("Should return correct contract balance", async function () {
      await treasuryIntegration.connect(market1).collectFee(FEE_AMOUNT, { value: FEE_AMOUNT });
      
      // Disable auto-forwarding to keep balance
      await treasuryIntegration.connect(operator).setDistributionThreshold(ethers.ZeroAddress, ethers.parseEther("10"));
      
      expect(await treasuryIntegration.getBalance(ethers.ZeroAddress)).to.equal(FEE_AMOUNT);
    });
  });
  
  describe("Upgradeability", function () {
    it("Should allow upgrade by upgrader role", async function () {
      const TreasuryIntegrationV2 = await ethers.getContractFactory("TreasuryIntegration");
      
      // This should not revert
      await upgrades.upgradeProxy(
        treasuryIntegration.getAddress(),
        TreasuryIntegrationV2
      );
    });
    
    it("Should preserve state after upgrade", async function () {
      await treasuryIntegration.connect(admin).setMarketAuthorization(market1.address, true);
      await treasuryIntegration.connect(market1).collectFee(FEE_AMOUNT, { value: FEE_AMOUNT });
      
      const TreasuryIntegrationV2 = await ethers.getContractFactory("TreasuryIntegration");
      const upgraded = await upgrades.upgradeProxy(
        treasuryIntegration.getAddress(),
        TreasuryIntegrationV2
      );
      
      // State should be preserved
      expect(await upgraded.treasury()).to.equal(treasury.address);
      expect(await upgraded.authorizedMarkets(market1.address)).to.be.true;
      expect(await upgraded.pendingFees(ethers.ZeroAddress)).to.equal(FEE_AMOUNT);
    });
  });
});

// Mock ERC20 contract for testing
const MockERC20 = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    uint8 private _decimals;
    
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) {
        _decimals = decimals_;
    }
    
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
`;
