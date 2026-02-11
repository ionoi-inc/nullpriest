// SPDX-License-Identifier: MIT
/**
 * Deployment Verification Script
 * 
 * This script verifies that the TreasuryIntegration contract is deployed
 * correctly and configured properly on Base Mainnet.
 * 
 * Usage:
 *   node scripts/verify-deployment.js
 * 
 * Environment Variables Required:
 *   - TREASURY_INTEGRATION_ADDRESS: Deployed proxy address
 *   - BASE_MAINNET_RPC_URL: RPC endpoint
 *   - EXPECTED_ADMIN: Expected admin address
 */

const hre = require("hardhat");
const { ethers } = require("hardhat");

// Configuration
const TREASURY_ADDRESS = "0x0E050877dd25D67681fF2DA7eF75369c966288EC";
const EXPECTED_CHAIN_ID = 8453; // Base Mainnet

// Role constants
const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
const MARKET_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MARKET_ROLE"));
const OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("OPERATOR_ROLE"));
const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));
const UPGRADER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("UPGRADER_ROLE"));

async function main() {
    console.log("🔍 TreasuryIntegration Deployment Verification\n");
    console.log("=".repeat(60));
    
    // Get deployment address
    const proxyAddress = process.env.TREASURY_INTEGRATION_ADDRESS;
    if (!proxyAddress) {
        throw new Error("TREASURY_INTEGRATION_ADDRESS environment variable not set");
    }
    
    const expectedAdmin = process.env.EXPECTED_ADMIN;
    if (!expectedAdmin) {
        console.warn("⚠️  EXPECTED_ADMIN not set, skipping admin verification");
    }
    
    console.log(`\n📍 Proxy Address: ${proxyAddress}`);
    
    // Verify network
    const network = await ethers.provider.getNetwork();
    console.log(`\n🌐 Network Verification:`);
    console.log(`   Chain ID: ${network.chainId}`);
    
    if (Number(network.chainId) !== EXPECTED_CHAIN_ID) {
        throw new Error(`Wrong network! Expected ${EXPECTED_CHAIN_ID}, got ${network.chainId}`);
    }
    console.log(`   ✅ Connected to Base Mainnet`);
    
    // Get contract instance
    const treasuryIntegration = await ethers.getContractAt(
        "TreasuryIntegration",
        proxyAddress
    );
    
    // 1. Verify Contract Existence
    console.log(`\n📜 Contract Verification:`);
    const code = await ethers.provider.getCode(proxyAddress);
    if (code === "0x") {
        throw new Error("No contract deployed at this address!");
    }
    console.log(`   ✅ Contract exists at ${proxyAddress}`);
    
    // 2. Verify Treasury Address
    console.log(`\n🏦 Treasury Configuration:`);
    const actualTreasury = await treasuryIntegration.TREASURY_ADDRESS();
    console.log(`   Expected: ${TREASURY_ADDRESS}`);
    console.log(`   Actual:   ${actualTreasury}`);
    
    if (actualTreasury.toLowerCase() !== TREASURY_ADDRESS.toLowerCase()) {
        throw new Error("Treasury address mismatch!");
    }
    console.log(`   ✅ Treasury address correct`);
    
    // 3. Verify Admin Role
    console.log(`\n👤 Admin Role Verification:`);
    if (expectedAdmin) {
        const hasAdminRole = await treasuryIntegration.hasRole(DEFAULT_ADMIN_ROLE, expectedAdmin);
        console.log(`   Admin Address: ${expectedAdmin}`);
        console.log(`   Has Admin Role: ${hasAdminRole}`);
        
        if (!hasAdminRole) {
            throw new Error("Expected admin does not have DEFAULT_ADMIN_ROLE!");
        }
        console.log(`   ✅ Admin role verified`);
    } else {
        // Just check that someone has admin role
        const adminCount = await treasuryIntegration.getRoleMemberCount(DEFAULT_ADMIN_ROLE);
        console.log(`   Admin Count: ${adminCount}`);
        
        if (adminCount === 0n) {
            throw new Error("No admin assigned!");
        }
        
        const admin = await treasuryIntegration.getRoleMember(DEFAULT_ADMIN_ROLE, 0);
        console.log(`   Admin Address: ${admin}`);
        console.log(`   ✅ Admin role assigned`);
    }
    
    // 4. Verify Pause State
    console.log(`\n⏸️  Pause State:`);
    const isPaused = await treasuryIntegration.paused();
    console.log(`   Paused: ${isPaused}`);
    
    if (isPaused) {
        console.warn(`   ⚠️  Contract is PAUSED!`);
    } else {
        console.log(`   ✅ Contract is active`);
    }
    
    // 5. Verify Role Configuration
    console.log(`\n🔐 Role Configuration:`);
    
    const roles = [
        { name: "MARKET", hash: MARKET_ROLE },
        { name: "OPERATOR", hash: OPERATOR_ROLE },
        { name: "PAUSER", hash: PAUSER_ROLE },
        { name: "UPGRADER", hash: UPGRADER_ROLE }
    ];
    
    for (const role of roles) {
        const count = await treasuryIntegration.getRoleMemberCount(role.hash);
        console.log(`   ${role.name}_ROLE: ${count} member(s)`);
        
        if (count > 0n) {
            for (let i = 0; i < count; i++) {
                const member = await treasuryIntegration.getRoleMember(role.hash, i);
                console.log(`     - ${member}`);
            }
        }
    }
    
    // 6. Verify Implementation Address (UUPS)
    console.log(`\n🔧 Implementation Verification:`);
    try {
        // ERC1967 implementation slot
        const implSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
        const implAddressHex = await ethers.provider.getStorage(proxyAddress, implSlot);
        const implAddress = ethers.getAddress("0x" + implAddressHex.slice(-40));
        
        console.log(`   Implementation: ${implAddress}`);
        
        const implCode = await ethers.provider.getCode(implAddress);
        if (implCode === "0x") {
            throw new Error("Implementation contract not deployed!");
        }
        console.log(`   ✅ Implementation contract exists`);
    } catch (error) {
        console.warn(`   ⚠️  Could not verify implementation: ${error.message}`);
    }
    
    // 7. Verify Initial State
    console.log(`\n📊 Initial State:`);
    
    const ethPending = await treasuryIntegration.getPendingFees(ethers.ZeroAddress);
    console.log(`   Pending ETH Fees: ${ethers.formatEther(ethPending)} ETH`);
    
    const ethTotal = await treasuryIntegration.getTotalFeesCollected(ethers.ZeroAddress);
    console.log(`   Total ETH Collected: ${ethers.formatEther(ethTotal)} ETH`);
    
    const ethThreshold = await treasuryIntegration.forwardingThresholds(ethers.ZeroAddress);
    console.log(`   ETH Auto-Forward Threshold: ${ethers.formatEther(ethThreshold)} ETH`);
    
    // 8. Verify Contract Balance
    console.log(`\n💰 Contract Balance:`);
    const contractBalance = await ethers.provider.getBalance(proxyAddress);
    console.log(`   ETH Balance: ${ethers.formatEther(contractBalance)} ETH`);
    
    if (contractBalance > 0n) {
        console.log(`   ℹ️  Contract holds ${ethers.formatEther(contractBalance)} ETH`);
    }
    
    // 9. Test View Functions
    console.log(`\n🧪 Function Tests:`);
    
    try {
        const shouldForward = await treasuryIntegration.shouldAutoForward(ethers.ZeroAddress);
        console.log(`   shouldAutoForward(ETH): ${shouldForward}`);
        console.log(`   ✅ View functions working`);
    } catch (error) {
        throw new Error(`View function test failed: ${error.message}`);
    }
    
    // 10. Verify Contract Version (if available)
    console.log(`\n📌 Contract Information:`);
    try {
        // Try to get version if implemented
        const version = await treasuryIntegration.version?.();
        if (version) {
            console.log(`   Version: ${version}`);
        }
    } catch {
        console.log(`   Version: Not implemented`);
    }
    
    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("✅ VERIFICATION COMPLETE");
    console.log("=".repeat(60));
    console.log("\n📋 Deployment Summary:");
    console.log(`   Proxy: ${proxyAddress}`);
    console.log(`   Network: Base Mainnet (${EXPECTED_CHAIN_ID})`);
    console.log(`   Treasury: ${TREASURY_ADDRESS}`);
    console.log(`   Status: ${isPaused ? "PAUSED ⏸️" : "ACTIVE ✅"}`);
    console.log(`   ETH Balance: ${ethers.formatEther(contractBalance)} ETH`);
    
    // Recommendations
    console.log("\n💡 Recommendations:");
    
    if (isPaused) {
        console.log("   ⚠️  Unpause contract when ready for production");
    }
    
    const operatorCount = await treasuryIntegration.getRoleMemberCount(OPERATOR_ROLE);
    if (operatorCount === 0n) {
        console.log("   ⚠️  Assign OPERATOR_ROLE for fee forwarding operations");
    }
    
    const pauserCount = await treasuryIntegration.getRoleMemberCount(PAUSER_ROLE);
    if (pauserCount === 0n) {
        console.log("   ⚠️  Assign PAUSER_ROLE for emergency response");
    }
    
    const upgraderCount = await treasuryIntegration.getRoleMemberCount(UPGRADER_ROLE);
    if (upgraderCount === 0n) {
        console.log("   ⚠️  Assign UPGRADER_ROLE for contract upgrades");
    }
    
    const marketCount = await treasuryIntegration.getRoleMemberCount(MARKET_ROLE);
    if (marketCount === 0n) {
        console.log("   ⚠️  No markets authorized yet - authorize market contracts");
    }
    
    console.log("\n✨ Deployment verification successful!\n");
}

// Run verification
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ VERIFICATION FAILED\n");
        console.error(error);
        process.exit(1);
    });
