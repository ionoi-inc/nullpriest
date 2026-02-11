// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title NULPTreasuryV2
 * @notice Unified treasury that funnels all value toward NULP token
 * @dev Handles ETH, NULP, and NULLPRIEST deposits with smart buyback routing
 * 
 * Flow Logic:
 * - NULP deposits: 5% burned directly, 95% to treasury
 * - NULLPRIEST deposits: 100% swapped to NULP, then 5% burned, 95% to treasury
 * - ETH deposits: 5% swaps to NULP and burns, 95% stays as ETH in treasury
 * 
 * Goal: Everything flows INTO NULP. Stream token converts to main token.
 */
contract NULPTreasuryV2 is 
    Initializable, 
    UUPSUpgradeable, 
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable 
{
    using SafeERC20 for IERC20;

    // ============ Constants ============
    
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    uint256 public constant BURN_BPS = 500; // 5% = 500 basis points
    uint256 public constant BPS_DENOMINATOR = 10000;

    // ============ State Variables ============
    
    /// @notice NULP token address (main token)
    address public nulpToken;
    
    /// @notice NULLPRIEST token address (stream token to be converted)
    address public nullpriestToken;
    
    /// @notice Uniswap V2 Router for swaps
    address public uniswapRouter;
    
    /// @notice WETH address for swap paths
    address public weth;
    
    /// @notice Total NULP burned through this treasury
    uint256 public totalNulpBurned;
    
    /// @notice Total NULLPRIEST converted to NULP
    uint256 public totalNullpriestConverted;
    
    /// @notice Total ETH used for buyback burns
    uint256 public totalEthBuybackBurned;
    
    /// @notice Minimum output for swaps (slippage protection, can be adjusted)
    uint256 public minSwapOutput;
    
    /// @notice Pause state for emergency
    bool public paused;

    // ============ Events ============
    
    event NulpDeposited(address indexed from, uint256 amount, uint256 burned, uint256 toTreasury);
    event NullpriestConverted(address indexed from, uint256 nullpriestIn, uint256 nulpOut, uint256 burned);
    event EthDeposited(address indexed from, uint256 amount, uint256 buybackAmount, uint256 nulpBurned);
    event TreasuryWithdrawal(address indexed token, address indexed to, uint256 amount);
    event SwapRouterUpdated(address indexed oldRouter, address indexed newRouter);
    event MinSwapOutputUpdated(uint256 oldMin, uint256 newMin);
    event EmergencyPause(bool paused);

    // ============ Errors ============
    
    error ZeroAmount();
    error ZeroAddress();
    error ContractPaused();
    error SwapFailed();
    error InsufficientOutput();
    error TransferFailed();

    // ============ Modifiers ============
    
    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    // ============ Initializer ============
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the treasury (called once on deployment)
     * @param _nulpToken NULP token address
     * @param _nullpriestToken NULLPRIEST stream token address
     * @param _uniswapRouter Uniswap V2 compatible router
     * @param _weth WETH address
     * @param _owner Treasury owner
     */
    function initialize(
        address _nulpToken,
        address _nullpriestToken,
        address _uniswapRouter,
        address _weth,
        address _owner
    ) external initializer {
        if (_nulpToken == address(0) || _nullpriestToken == address(0) || 
            _uniswapRouter == address(0) || _weth == address(0) || _owner == address(0)) {
            revert ZeroAddress();
        }

        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        nulpToken = _nulpToken;
        nullpriestToken = _nullpriestToken;
        uniswapRouter = _uniswapRouter;
        weth = _weth;
        minSwapOutput = 1; // Minimum 1 wei output, can be adjusted
    }

    // ============ Deposit Functions ============

    /**
     * @notice Deposit NULP tokens - 5% burned, 95% to treasury
     * @param amount Amount of NULP to deposit
     */
    function depositNulp(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();

        // Transfer NULP from sender
        IERC20(nulpToken).safeTransferFrom(msg.sender, address(this), amount);

        // Calculate burn amount (5%)
        uint256 burnAmount = (amount * BURN_BPS) / BPS_DENOMINATOR;
        uint256 treasuryAmount = amount - burnAmount;

        // Burn 5%
        IERC20(nulpToken).safeTransfer(BURN_ADDRESS, burnAmount);
        totalNulpBurned += burnAmount;

        emit NulpDeposited(msg.sender, amount, burnAmount, treasuryAmount);
    }

    /**
     * @notice Deposit NULLPRIEST tokens - 100% swapped to NULP, then 5% burned
     * @dev Converts stream token to main token, funneling value to NULP
     * @param amount Amount of NULLPRIEST to deposit
     * @param minNulpOut Minimum NULP to receive (slippage protection)
     */
    function depositNullpriest(uint256 amount, uint256 minNulpOut) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();

        // Transfer NULLPRIEST from sender
        IERC20(nullpriestToken).safeTransferFrom(msg.sender, address(this), amount);

        // Approve router
        IERC20(nullpriestToken).approve(uniswapRouter, amount);

        // Swap NULLPRIEST -> WETH -> NULP (or direct if pool exists)
        address[] memory path = _getNullpriestToNulpPath();
        
        uint256 nulpBalanceBefore = IERC20(nulpToken).balanceOf(address(this));
        
        // Execute swap
        IUniswapV2Router(uniswapRouter).swapExactTokensForTokensSupportingFeeOnTransferTokens(
            amount,
            minNulpOut,
            path,
            address(this),
            block.timestamp + 300
        );

        uint256 nulpReceived = IERC20(nulpToken).balanceOf(address(this)) - nulpBalanceBefore;
        if (nulpReceived < minNulpOut) revert InsufficientOutput();

        // Burn 5% of received NULP
        uint256 burnAmount = (nulpReceived * BURN_BPS) / BPS_DENOMINATOR;
        IERC20(nulpToken).safeTransfer(BURN_ADDRESS, burnAmount);
        
        totalNulpBurned += burnAmount;
        totalNullpriestConverted += amount;

        emit NullpriestConverted(msg.sender, amount, nulpReceived, burnAmount);
    }

    /**
     * @notice Deposit ETH - 5% buys and burns NULP, 95% to treasury
     * @param minNulpOut Minimum NULP to receive from buyback (slippage protection)
     */
    function depositEth(uint256 minNulpOut) external payable nonReentrant whenNotPaused {
        if (msg.value == 0) revert ZeroAmount();

        // Calculate buyback amount (5%)
        uint256 buybackAmount = (msg.value * BURN_BPS) / BPS_DENOMINATOR;

        // Swap 5% ETH -> NULP and burn
        address[] memory path = new address[](2);
        path[0] = weth;
        path[1] = nulpToken;

        uint256 nulpBalanceBefore = IERC20(nulpToken).balanceOf(address(this));

        IUniswapV2Router(uniswapRouter).swapExactETHForTokensSupportingFeeOnTransferTokens{value: buybackAmount}(
            minNulpOut,
            path,
            address(this),
            block.timestamp + 300
        );

        uint256 nulpReceived = IERC20(nulpToken).balanceOf(address(this)) - nulpBalanceBefore;
        if (nulpReceived < minNulpOut) revert InsufficientOutput();

        // Burn all NULP from buyback
        IERC20(nulpToken).safeTransfer(BURN_ADDRESS, nulpReceived);
        
        totalNulpBurned += nulpReceived;
        totalEthBuybackBurned += buybackAmount;

        emit EthDeposited(msg.sender, msg.value, buybackAmount, nulpReceived);
    }

    /**
     * @notice Receive ETH directly - same as depositEth but no slippage param
     * @dev Uses minSwapOutput as default slippage protection
     */
    receive() external payable {
        if (msg.value > 0 && !paused) {
            uint256 buybackAmount = (msg.value * BURN_BPS) / BPS_DENOMINATOR;

            address[] memory path = new address[](2);
            path[0] = weth;
            path[1] = nulpToken;

            try IUniswapV2Router(uniswapRouter).swapExactETHForTokensSupportingFeeOnTransferTokens{value: buybackAmount}(
                minSwapOutput,
                path,
                address(this),
                block.timestamp + 300
            ) {
                uint256 nulpBalance = IERC20(nulpToken).balanceOf(address(this));
                if (nulpBalance > 0) {
                    // Burn any NULP received
                    uint256 burnAmount = nulpBalance; // Burn all from this swap
                    IERC20(nulpToken).safeTransfer(BURN_ADDRESS, burnAmount);
                    totalNulpBurned += burnAmount;
                    totalEthBuybackBurned += buybackAmount;
                }
            } catch {
                // Swap failed, ETH stays in treasury (no revert to not block direct sends)
            }

            emit EthDeposited(msg.sender, msg.value, buybackAmount, 0);
        }
    }

    // ============ View Functions ============

    /**
     * @notice Get treasury balances
     */
    function getBalances() external view returns (
        uint256 ethBalance,
        uint256 nulpBalance,
        uint256 nullpriestBalance
    ) {
        ethBalance = address(this).balance;
        nulpBalance = IERC20(nulpToken).balanceOf(address(this));
        nullpriestBalance = IERC20(nullpriestToken).balanceOf(address(this));
    }

    /**
     * @notice Get total burn statistics
     */
    function getBurnStats() external view returns (
        uint256 _totalNulpBurned,
        uint256 _totalNullpriestConverted,
        uint256 _totalEthBuybackBurned
    ) {
        return (totalNulpBurned, totalNullpriestConverted, totalEthBuybackBurned);
    }

    // ============ Admin Functions ============

    /**
     * @notice Withdraw tokens from treasury (owner only)
     * @param token Token address (address(0) for ETH)
     * @param to Recipient
     * @param amount Amount to withdraw
     */
    function withdraw(address token, address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        
        if (token == address(0)) {
            // Withdraw ETH
            (bool success, ) = to.call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
        
        emit TreasuryWithdrawal(token, to, amount);
    }

    /**
     * @notice Update Uniswap router (owner only)
     */
    function setUniswapRouter(address _router) external onlyOwner {
        if (_router == address(0)) revert ZeroAddress();
        emit SwapRouterUpdated(uniswapRouter, _router);
        uniswapRouter = _router;
    }

    /**
     * @notice Update minimum swap output (owner only)
     */
    function setMinSwapOutput(uint256 _minOutput) external onlyOwner {
        emit MinSwapOutputUpdated(minSwapOutput, _minOutput);
        minSwapOutput = _minOutput;
    }

    /**
     * @notice Emergency pause/unpause (owner only)
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit EmergencyPause(_paused);
    }

    // ============ Internal Functions ============

    /**
     * @notice Get swap path from NULLPRIEST to NULP
     * @dev Goes through WETH as intermediary
     */
    function _getNullpriestToNulpPath() internal view returns (address[] memory) {
        address[] memory path = new address[](3);
        path[0] = nullpriestToken;
        path[1] = weth;
        path[2] = nulpToken;
        return path;
    }

    /**
     * @notice Authorize upgrade (owner only)
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ============ Gap for future upgrades ============
    uint256[50] private __gap;
}

// ============ Interfaces ============

interface IUniswapV2Router {
    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;

    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable;

    function getAmountsOut(uint256 amountIn, address[] calldata path) 
        external view returns (uint256[] memory amounts);
}
