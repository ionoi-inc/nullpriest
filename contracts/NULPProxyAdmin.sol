// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";

/**
 * @title NULPProxyAdmin
 * @author NULP Collective
 * @notice Admin contract for managing UUPS proxy upgrades
 * @dev Uses Ownable2Step for safer ownership transfers
 *
 * While UUPS proxies contain upgrade logic in the implementation,
 * this contract provides:
 * - Centralized upgrade management
 * - Timelock capabilities for upgrades
 * - Multi-proxy management
 * - Upgrade event logging
 */
contract NULPProxyAdmin is Ownable2Step {
    // ============ Structs ============

    struct UpgradeRequest {
        address proxy;
        address newImplementation;
        uint256 requestedAt;
        uint256 executeAfter;
        bool executed;
        bool cancelled;
    }

    // ============ State Variables ============

    /// @notice Timelock delay for upgrades (default: 2 days)
    uint256 public timelockDelay;

    /// @notice Minimum timelock delay allowed
    uint256 public constant MIN_TIMELOCK = 1 hours;

    /// @notice Maximum timelock delay allowed
    uint256 public constant MAX_TIMELOCK = 30 days;

    /// @notice Total number of upgrade requests
    uint256 public requestCount;

    /// @notice Mapping of request ID to upgrade request
    mapping(uint256 => UpgradeRequest) public upgradeRequests;

    /// @notice Mapping of proxy address to current implementation
    mapping(address => address) public implementations;

    /// @notice Array of managed proxies
    address[] public managedProxies;

    /// @notice Mapping to check if proxy is managed
    mapping(address => bool) public isManaged;

    // ============ Events ============

    event ProxyRegistered(address indexed proxy, address indexed implementation);
    event ProxyUnregistered(address indexed proxy);
    event UpgradeRequested(
        uint256 indexed requestId,
        address indexed proxy,
        address indexed newImplementation,
        uint256 executeAfter
    );
    event UpgradeExecuted(
        uint256 indexed requestId,
        address indexed proxy,
        address indexed newImplementation
    );
    event UpgradeCancelled(uint256 indexed requestId);
    event TimelockDelayUpdated(uint256 oldDelay, uint256 newDelay);
    event EmergencyUpgrade(address indexed proxy, address indexed newImplementation);

    // ============ Errors ============

    error InvalidAddress();
    error ProxyAlreadyManaged();
    error ProxyNotManaged();
    error InvalidTimelock();
    error RequestNotFound();
    error RequestAlreadyExecuted();
    error RequestCancelled();
    error TimelockNotPassed();
    error UpgradeFailed();

    // ============ Constructor ============

    /**
     * @notice Initializes the proxy admin
     * @param _owner Address of the admin owner
     * @param _timelockDelay Initial timelock delay for upgrades
     */
    constructor(address _owner, uint256 _timelockDelay) Ownable(_owner) {
        if (_timelockDelay < MIN_TIMELOCK || _timelockDelay > MAX_TIMELOCK) {
            revert InvalidTimelock();
        }
        timelockDelay = _timelockDelay;
    }

    // ============ Proxy Management ============

    /**
     * @notice Register a proxy for management
     * @param proxy Address of the UUPS proxy
     * @param implementation Current implementation address
     */
    function registerProxy(address proxy, address implementation) external onlyOwner {
        if (proxy == address(0) || implementation == address(0)) revert InvalidAddress();
        if (isManaged[proxy]) revert ProxyAlreadyManaged();

        isManaged[proxy] = true;
        implementations[proxy] = implementation;
        managedProxies.push(proxy);

        emit ProxyRegistered(proxy, implementation);
    }

    /**
     * @notice Unregister a proxy from management
     * @param proxy Address of the proxy to unregister
     */
    function unregisterProxy(address proxy) external onlyOwner {
        if (!isManaged[proxy]) revert ProxyNotManaged();

        isManaged[proxy] = false;
        delete implementations[proxy];

        // Remove from array
        for (uint256 i = 0; i < managedProxies.length; i++) {
            if (managedProxies[i] == proxy) {
                managedProxies[i] = managedProxies[managedProxies.length - 1];
                managedProxies.pop();
                break;
            }
        }

        emit ProxyUnregistered(proxy);
    }

    // ============ Upgrade Functions ============

    /**
     * @notice Request an upgrade (starts timelock)
     * @param proxy Address of the proxy to upgrade
     * @param newImplementation Address of the new implementation
     * @return requestId The ID of the upgrade request
     */
    function requestUpgrade(
        address proxy,
        address newImplementation
    ) external onlyOwner returns (uint256 requestId) {
        if (!isManaged[proxy]) revert ProxyNotManaged();
        if (newImplementation == address(0)) revert InvalidAddress();

        requestCount++;
        requestId = requestCount;

        uint256 executeAfter = block.timestamp + timelockDelay;

        upgradeRequests[requestId] = UpgradeRequest({
            proxy: proxy,
            newImplementation: newImplementation,
            requestedAt: block.timestamp,
            executeAfter: executeAfter,
            executed: false,
            cancelled: false
        });

        emit UpgradeRequested(requestId, proxy, newImplementation, executeAfter);
    }

    /**
     * @notice Execute a pending upgrade after timelock
     * @param requestId ID of the upgrade request
     */
    function executeUpgrade(uint256 requestId) external onlyOwner {
        UpgradeRequest storage request = upgradeRequests[requestId];

        if (request.proxy == address(0)) revert RequestNotFound();
        if (request.executed) revert RequestAlreadyExecuted();
        if (request.cancelled) revert RequestCancelled();
        if (block.timestamp < request.executeAfter) revert TimelockNotPassed();

        request.executed = true;
        implementations[request.proxy] = request.newImplementation;

        // Call upgradeToAndCall on the proxy
        // The proxy's _authorizeUpgrade will verify the caller
        (bool success, ) = request.proxy.call(
            abi.encodeWithSignature(
                "upgradeToAndCall(address,bytes)",
                request.newImplementation,
                ""
            )
        );

        if (!success) revert UpgradeFailed();

        emit UpgradeExecuted(requestId, request.proxy, request.newImplementation);
    }

    /**
     * @notice Cancel a pending upgrade request
     * @param requestId ID of the upgrade request to cancel
     */
    function cancelUpgrade(uint256 requestId) external onlyOwner {
        UpgradeRequest storage request = upgradeRequests[requestId];

        if (request.proxy == address(0)) revert RequestNotFound();
        if (request.executed) revert RequestAlreadyExecuted();
        if (request.cancelled) revert RequestCancelled();

        request.cancelled = true;

        emit UpgradeCancelled(requestId);
    }

    /**
     * @notice Emergency upgrade without timelock (use with extreme caution)
     * @param proxy Address of the proxy to upgrade
     * @param newImplementation Address of the new implementation
     * @dev Only use in genuine emergencies (e.g., critical vulnerability)
     */
    function emergencyUpgrade(
        address proxy,
        address newImplementation
    ) external onlyOwner {
        if (!isManaged[proxy]) revert ProxyNotManaged();
        if (newImplementation == address(0)) revert InvalidAddress();

        implementations[proxy] = newImplementation;

        (bool success, ) = proxy.call(
            abi.encodeWithSignature(
                "upgradeToAndCall(address,bytes)",
                newImplementation,
                ""
            )
        );

        if (!success) revert UpgradeFailed();

        emit EmergencyUpgrade(proxy, newImplementation);
    }

    // ============ Admin Functions ============

    /**
     * @notice Update the timelock delay
     * @param newDelay New timelock delay in seconds
     */
    function setTimelockDelay(uint256 newDelay) external onlyOwner {
        if (newDelay < MIN_TIMELOCK || newDelay > MAX_TIMELOCK) {
            revert InvalidTimelock();
        }

        uint256 oldDelay = timelockDelay;
        timelockDelay = newDelay;

        emit TimelockDelayUpdated(oldDelay, newDelay);
    }

    // ============ View Functions ============

    /**
     * @notice Get all managed proxies
     * @return Array of proxy addresses
     */
    function getManagedProxies() external view returns (address[] memory) {
        return managedProxies;
    }

    /**
     * @notice Get the number of managed proxies
     * @return count Number of proxies
     */
    function getManagedProxyCount() external view returns (uint256) {
        return managedProxies.length;
    }

    /**
     * @notice Get upgrade request details
     * @param requestId ID of the request
     * @return request The upgrade request struct
     */
    function getUpgradeRequest(uint256 requestId) external view returns (UpgradeRequest memory) {
        return upgradeRequests[requestId];
    }

    /**
     * @notice Check if an upgrade can be executed
     * @param requestId ID of the request
     * @return canExecute Whether the upgrade can be executed
     */
    function canExecuteUpgrade(uint256 requestId) external view returns (bool) {
        UpgradeRequest storage request = upgradeRequests[requestId];
        
        return request.proxy != address(0) &&
               !request.executed &&
               !request.cancelled &&
               block.timestamp >= request.executeAfter;
    }

    /**
     * @notice Get time remaining until upgrade can be executed
     * @param requestId ID of the request
     * @return timeRemaining Seconds until executable (0 if ready)
     */
    function getUpgradeTimeRemaining(uint256 requestId) external view returns (uint256) {
        UpgradeRequest storage request = upgradeRequests[requestId];
        
        if (block.timestamp >= request.executeAfter) {
            return 0;
        }
        
        return request.executeAfter - block.timestamp;
    }
}
