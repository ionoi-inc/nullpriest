// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../NULPCollective.sol";
import "../NULPTreasury.sol";
import "../NULPProxyAdmin.sol";

/**
 * @title DeployNULPCollective
 * @notice Deployment script for the NULP Collective system on Base mainnet
 * @dev Run with: forge script scripts/Deploy.s.sol:DeployNULPCollective --rpc-url base --broadcast
 */
contract DeployNULPCollective is Script {
    // ============ Configuration ============

    // NULP Token on Base mainnet
    address constant NULP_TOKEN = 0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F;

    // Collective configuration
    uint256 constant MINIMUM_HOLDING = 1000 * 1e18;      // 1000 NULP
    uint256 constant PROPOSAL_THRESHOLD = 5000 * 1e18;   // 5000 NULP to create proposals
    uint256 constant QUORUM_BASIS_POINTS = 400;          // 4% quorum
    uint256 constant VOTING_PERIOD = 7 days;             // 7 day voting
    uint256 constant VOTING_DELAY = 1 days;              // 1 day delay before voting starts

    // Treasury configuration
    uint256 constant REQUIRED_CONFIRMATIONS = 2;         // 2-of-N multisig

    // ProxyAdmin configuration
    uint256 constant TIMELOCK_DELAY = 2 days;            // 2 day timelock for upgrades

    // ============ Deployment ============

    function run() external {
        // Load deployer private key
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // Load multisig signers from environment
        address signer1 = vm.envAddress("SIGNER_1");
        address signer2 = vm.envAddress("SIGNER_2");
        address signer3 = vm.envAddress("SIGNER_3");

        address[] memory signers = new address[](3);
        signers[0] = signer1;
        signers[1] = signer2;
        signers[2] = signer3;

        console.log("=== NULP Collective Deployment ===");
        console.log("Deployer:", deployer);
        console.log("Network: Base Mainnet");
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy ProxyAdmin
        console.log("1. Deploying NULPProxyAdmin...");
        NULPProxyAdmin proxyAdmin = new NULPProxyAdmin(deployer, TIMELOCK_DELAY);
        console.log("   ProxyAdmin deployed at:", address(proxyAdmin));

        // 2. Deploy NULPCollective implementation
        console.log("2. Deploying NULPCollective implementation...");
        NULPCollective collectiveImpl = new NULPCollective();
        console.log("   Implementation deployed at:", address(collectiveImpl));

        // 3. Deploy NULPCollective proxy
        console.log("3. Deploying NULPCollective proxy...");
        bytes memory collectiveInitData = abi.encodeWithSelector(
            NULPCollective.initialize.selector,
            deployer,
            MINIMUM_HOLDING,
            PROPOSAL_THRESHOLD,
            QUORUM_BASIS_POINTS,
            VOTING_PERIOD,
            VOTING_DELAY
        );

        ERC1967Proxy collectiveProxy = new ERC1967Proxy(
            address(collectiveImpl),
            collectiveInitData
        );
        console.log("   Collective Proxy deployed at:", address(collectiveProxy));

        // 4. Deploy NULPTreasury implementation
        console.log("4. Deploying NULPTreasury implementation...");
        NULPTreasury treasuryImpl = new NULPTreasury();
        console.log("   Implementation deployed at:", address(treasuryImpl));

        // 5. Deploy NULPTreasury proxy
        console.log("5. Deploying NULPTreasury proxy...");
        bytes memory treasuryInitData = abi.encodeWithSelector(
            NULPTreasury.initialize.selector,
            deployer,
            address(collectiveProxy),
            signers,
            REQUIRED_CONFIRMATIONS
        );

        ERC1967Proxy treasuryProxy = new ERC1967Proxy(
            address(treasuryImpl),
            treasuryInitData
        );
        console.log("   Treasury Proxy deployed at:", address(treasuryProxy));

        // 6. Configure Collective to know about Treasury
        console.log("6. Configuring Collective treasury reference...");
        NULPCollective(payable(address(collectiveProxy))).setTreasury(address(treasuryProxy));
        console.log("   Treasury set on Collective");

        // 7. Register proxies with ProxyAdmin
        console.log("7. Registering proxies with ProxyAdmin...");
        proxyAdmin.registerProxy(address(collectiveProxy), address(collectiveImpl));
        proxyAdmin.registerProxy(address(treasuryProxy), address(treasuryImpl));
        console.log("   Proxies registered");

        vm.stopBroadcast();

        // Print summary
        console.log("");
        console.log("=== Deployment Summary ===");
        console.log("ProxyAdmin:           ", address(proxyAdmin));
        console.log("Collective Proxy:     ", address(collectiveProxy));
        console.log("Collective Impl:      ", address(collectiveImpl));
        console.log("Treasury Proxy:       ", address(treasuryProxy));
        console.log("Treasury Impl:        ", address(treasuryImpl));
        console.log("");
        console.log("=== Configuration ===");
        console.log("NULP Token:           ", NULP_TOKEN);
        console.log("Minimum Holding:      ", MINIMUM_HOLDING / 1e18, "NULP");
        console.log("Proposal Threshold:   ", PROPOSAL_THRESHOLD / 1e18, "NULP");
        console.log("Quorum:               ", QUORUM_BASIS_POINTS / 100, "%");
        console.log("Voting Period:        ", VOTING_PERIOD / 1 days, "days");
        console.log("Voting Delay:         ", VOTING_DELAY / 1 days, "day(s)");
        console.log("Required Sigs:        ", REQUIRED_CONFIRMATIONS, "of", signers.length);
        console.log("Upgrade Timelock:     ", TIMELOCK_DELAY / 1 days, "days");
        console.log("");
        console.log("=== Next Steps ===");
        console.log("1. Verify contracts on Basescan");
        console.log("2. Transfer ProxyAdmin ownership to multisig if desired");
        console.log("3. Transfer Collective/Treasury ownership to multisig if desired");
    }
}

/**
 * @title UpgradeCollective
 * @notice Script to upgrade the NULPCollective implementation
 * @dev Run with: forge script scripts/Deploy.s.sol:UpgradeCollective --rpc-url base --broadcast
 */
contract UpgradeCollective is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address proxyAdminAddress = vm.envAddress("PROXY_ADMIN");
        address collectiveProxy = vm.envAddress("COLLECTIVE_PROXY");

        console.log("=== Upgrading NULPCollective ===");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy new implementation
        console.log("1. Deploying new NULPCollective implementation...");
        NULPCollective newImpl = new NULPCollective();
        console.log("   New implementation:", address(newImpl));

        // 2. Request upgrade via ProxyAdmin
        console.log("2. Requesting upgrade via ProxyAdmin...");
        NULPProxyAdmin proxyAdmin = NULPProxyAdmin(proxyAdminAddress);
        uint256 requestId = proxyAdmin.requestUpgrade(collectiveProxy, address(newImpl));
        console.log("   Upgrade request ID:", requestId);

        vm.stopBroadcast();

        console.log("");
        console.log("=== Upgrade Requested ===");
        console.log("Execute upgrade after timelock with requestId:", requestId);
    }
}

/**
 * @title UpgradeTreasury
 * @notice Script to upgrade the NULPTreasury implementation
 * @dev Run with: forge script scripts/Deploy.s.sol:UpgradeTreasury --rpc-url base --broadcast
 */
contract UpgradeTreasury is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address proxyAdminAddress = vm.envAddress("PROXY_ADMIN");
        address treasuryProxy = vm.envAddress("TREASURY_PROXY");

        console.log("=== Upgrading NULPTreasury ===");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy new implementation
        console.log("1. Deploying new NULPTreasury implementation...");
        NULPTreasury newImpl = new NULPTreasury();
        console.log("   New implementation:", address(newImpl));

        // 2. Request upgrade via ProxyAdmin
        console.log("2. Requesting upgrade via ProxyAdmin...");
        NULPProxyAdmin proxyAdmin = NULPProxyAdmin(proxyAdminAddress);
        uint256 requestId = proxyAdmin.requestUpgrade(treasuryProxy, address(newImpl));
        console.log("   Upgrade request ID:", requestId);

        vm.stopBroadcast();

        console.log("");
        console.log("=== Upgrade Requested ===");
        console.log("Execute upgrade after timelock with requestId:", requestId);
    }
}

/**
 * @title ExecuteUpgrade
 * @notice Script to execute a pending upgrade after timelock
 * @dev Run with: forge script scripts/Deploy.s.sol:ExecuteUpgrade --rpc-url base --broadcast
 */
contract ExecuteUpgrade is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address proxyAdminAddress = vm.envAddress("PROXY_ADMIN");
        uint256 requestId = vm.envUint("REQUEST_ID");

        console.log("=== Executing Upgrade ===");
        console.log("Request ID:", requestId);

        vm.startBroadcast(deployerPrivateKey);

        NULPProxyAdmin proxyAdmin = NULPProxyAdmin(proxyAdminAddress);
        
        // Check if upgrade can be executed
        require(proxyAdmin.canExecuteUpgrade(requestId), "Cannot execute upgrade yet");

        proxyAdmin.executeUpgrade(requestId);

        vm.stopBroadcast();

        console.log("Upgrade executed successfully!");
    }
}
