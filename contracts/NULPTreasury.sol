// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/INULP.sol";
import "./interfaces/ISwapRouter.sol";

interface INULPCollective {
    function isValidMember(address account) external view returns (bool);
    function receiveDistribution() external payable;
}

/**
 * @title NULPTreasury
 * @author NULP Collective
 * @notice Upgradeable treasury contract for the NULP Collective
 * @dev Implements UUPS upgrade pattern with multisig execution
 *
 * Features:
 * - Accepts ETH and ERC20 deposits
 * - 5% auto-swap to NULP and burn on all deposits
 * - Multisig proposal execution
 * - Integration with Uniswap V3 for swaps
 */
contract NULPTreasury is 
    Initializable, 
    UUPSUpgradeable, 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable,
    PausableUpgradeable 
{
    using SafeERC20 for IERC20;

    // ============ Constants ============

    /// @notice NULP token address on Base mainnet
    address public constant NULP_TOKEN = 0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F;
    
    /// @notice WETH address on Base mainnet
    address public constant WETH = 0x4200000000000000000000000000000000000006;
    
    /// @notice Uniswap V3 SwapRouter on Base
    address public constant SWAP_ROUTER = 0x2626664c2603336E57B271c5C0b26F421741e481;
    
    /// @notice Burn percentage in basis points (500 = 5%)
    uint256 public constant BURN_PERCENTAGE = 500;
    
    /// @notice Basis points denominator
    uint256 public constant BASIS_POINTS = 10000;
    
    /// @notice Maximum signers allowed
    uint256 public constant MAX_SIGNERS = 10;

    // ============ Enums ============

    enum TransactionState {
        Pending,
        Executed,
        Cancelled
    }

    // ============ Structs ============

    struct Transaction {
        uint256 id;
        address proposer;
        address target;
        uint256 value;
        bytes data;
        string description;
        uint256 confirmations;
        uint256 createdAt;
        TransactionState state;
    }

    struct DepositRecord {
        address depositor;
        address token;
        uint256 amount;
        uint256 burnedAmount;
        uint256 timestamp;
    }

    // ============ State Variables ============

    /// @notice Reference to the NULPCollective contract
    address public collective;

    /// @notice Required number of confirmations for multisig
    uint256 public requiredConfirmations;

    /// @notice Total number of transactions created
    uint256 public transactionCount;

    /// @notice Total ETH burned (swapped to NULP and burned)
    uint256 public totalEthBurned;

    /// @notice Total NULP tokens burned
    uint256 public totalNulpBurned;

    /// @notice Array of authorized signers
    address[] public signers;

    /// @notice Mapping of signer address to authorization status
    mapping(address => bool) public isSigner;

    /// @notice Mapping of transaction ID to transaction data
    mapping(uint256 => Transaction) public transactions;

    /// @notice Mapping of transaction ID to signer to confirmation status
    mapping(uint256 => mapping(address => bool)) public confirmations;

    /// @notice Mapping of token address to total deposited amount
    mapping(address => uint256) public tokenBalances;

    /// @notice Array of supported tokens (for enumeration)
    address[] public supportedTokens;

    /// @notice Mapping to check if token is already in supportedTokens
    mapping(address => bool) public isSupported;

    /// @notice Deposit history
    DepositRecord[] public deposits;

    /// @notice Uniswap pool fee tier for NULP swaps (default 3000 = 0.3%)
    uint24 public swapPoolFee;

    /// @notice Maximum slippage for swaps in basis points (default 500 = 5%)
    uint256 public maxSlippage;

    /// @notice Whether auto-burn is enabled
    bool public autoBurnEnabled;

    // ============ Events ============

    event ETHDeposited(
        address indexed depositor, 
        uint256 amount, 
        uint256 burnAmount, 
        uint256 nulpBurned
    );
    
    event ERC20Deposited(
        address indexed depositor, 
        address indexed token, 
        uint256 amount, 
        uint256 burnAmount,
        uint256 nulpBurned
    );
    
    event TransactionSubmitted(
        uint256 indexed txId, 
        address indexed proposer, 
        address target, 
        uint256 value, 
        bytes data
    );
    
    event TransactionConfirmed(uint256 indexed txId, address indexed signer);
    event TransactionRevoked(uint256 indexed txId, address indexed signer);
    event TransactionExecuted(uint256 indexed txId);
    event TransactionCancelled(uint256 indexed txId);
    
    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    event RequiredConfirmationsChanged(uint256 oldValue, uint256 newValue);
    
    event CollectiveUpdated(address indexed oldCollective, address indexed newCollective);
    event SwapConfigUpdated(uint24 poolFee, uint256 maxSlippage);
    event AutoBurnToggled(bool enabled);
    
    event DistributionSent(address indexed collective, uint256 amount);
    event EmergencyWithdraw(address indexed token, address indexed recipient, uint256 amount);

    // ============ Errors ============

    error InvalidAddress();
    error InvalidAmount();
    error NotASigner();
    error NotACollectiveMember();
    error AlreadySigner();
    error NotEnoughSigners();
    error TooManySigners();
    error TransactionNotFound();
    error TransactionAlreadyExecuted();
    error TransactionNotPending();
    error AlreadyConfirmed();
    error NotConfirmed();
    error NotEnoughConfirmations();
    error ExecutionFailed();
    error SwapFailed();
    error InsufficientBalance();
    error InvalidConfirmationCount();

    // ============ Modifiers ============

    /**
     * @notice Ensures caller is an authorized signer
     */
    modifier onlySigner() {
        if (!isSigner[msg.sender]) revert NotASigner();
        _;
    }

    /**
     * @notice Ensures caller is a valid collective member
     */
    modifier onlyCollectiveMember() {
        if (collective == address(0)) revert InvalidAddress();
        if (!INULPCollective(collective).isValidMember(msg.sender)) {
            revert NotACollectiveMember();
        }
        _;
    }

    // ============ Initializer ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the treasury contract
     * @param _owner Address of the contract owner
     * @param _collective Address of the NULPCollective contract
     * @param _signers Initial array of multisig signers
     * @param _requiredConfirmations Number of confirmations required
     */
    function initialize(
        address _owner,
        address _collective,
        address[] calldata _signers,
        uint256 _requiredConfirmations
    ) external initializer {
        if (_owner == address(0)) revert InvalidAddress();
        if (_signers.length == 0) revert NotEnoughSigners();
        if (_signers.length > MAX_SIGNERS) revert TooManySigners();
        if (_requiredConfirmations == 0 || _requiredConfirmations > _signers.length) {
            revert InvalidConfirmationCount();
        }

        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        collective = _collective;
        requiredConfirmations = _requiredConfirmations;
        swapPoolFee = 3000; // 0.3%
        maxSlippage = 500;  // 5%
        autoBurnEnabled = true;

        for (uint256 i = 0; i < _signers.length; i++) {
            if (_signers[i] == address(0)) revert InvalidAddress();
            if (isSigner[_signers[i]]) revert AlreadySigner();
            
            isSigner[_signers[i]] = true;
            signers.push(_signers[i]);
            
            emit SignerAdded(_signers[i]);
        }
    }

    // ============ Deposit Functions ============

    /**
     * @notice Deposit ETH to the treasury
     * @dev 5% is swapped to NULP and burned
     */
    function depositETH() external payable nonReentrant whenNotPaused {
        if (msg.value == 0) revert InvalidAmount();

        uint256 burnAmount = 0;
        uint256 nulpBurned = 0;

        if (autoBurnEnabled) {
            burnAmount = (msg.value * BURN_PERCENTAGE) / BASIS_POINTS;
            if (burnAmount > 0) {
                nulpBurned = _swapETHToNULPAndBurn(burnAmount);
            }
        }

        uint256 netAmount = msg.value - burnAmount;
        
        // Track ETH as address(0)
        if (!isSupported[address(0)]) {
            supportedTokens.push(address(0));
            isSupported[address(0)] = true;
        }
        tokenBalances[address(0)] += netAmount;

        deposits.push(DepositRecord({
            depositor: msg.sender,
            token: address(0),
            amount: msg.value,
            burnedAmount: nulpBurned,
            timestamp: block.timestamp
        }));

        totalEthBurned += burnAmount;
        totalNulpBurned += nulpBurned;

        emit ETHDeposited(msg.sender, msg.value, burnAmount, nulpBurned);
    }

    /**
     * @notice Deposit ERC20 tokens to the treasury
     * @param token Address of the ERC20 token
     * @param amount Amount to deposit
     * @dev 5% is swapped to NULP (via ETH) and burned
     */
    function depositERC20(address token, uint256 amount) external nonReentrant whenNotPaused {
        if (token == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        uint256 burnAmount = 0;
        uint256 nulpBurned = 0;

        if (autoBurnEnabled) {
            burnAmount = (amount * BURN_PERCENTAGE) / BASIS_POINTS;
            if (burnAmount > 0) {
                nulpBurned = _swapERC20ToNULPAndBurn(token, burnAmount);
            }
        }

        uint256 netAmount = amount - burnAmount;

        if (!isSupported[token]) {
            supportedTokens.push(token);
            isSupported[token] = true;
        }
        tokenBalances[token] += netAmount;

        deposits.push(DepositRecord({
            depositor: msg.sender,
            token: token,
            amount: amount,
            burnedAmount: nulpBurned,
            timestamp: block.timestamp
        }));

        totalNulpBurned += nulpBurned;

        emit ERC20Deposited(msg.sender, token, amount, burnAmount, nulpBurned);
    }

    // ============ Multisig Functions ============

    /**
     * @notice Submit a new transaction proposal
     * @param target Target address for the transaction
     * @param value ETH value to send
     * @param data Encoded function call data
     * @param description Human-readable description
     * @return txId The ID of the created transaction
     */
    function submitTransaction(
        address target,
        uint256 value,
        bytes calldata data,
        string calldata description
    ) external onlyCollectiveMember whenNotPaused returns (uint256 txId) {
        if (target == address(0)) revert InvalidAddress();

        transactionCount++;
        txId = transactionCount;

        transactions[txId] = Transaction({
            id: txId,
            proposer: msg.sender,
            target: target,
            value: value,
            data: data,
            description: description,
            confirmations: 0,
            createdAt: block.timestamp,
            state: TransactionState.Pending
        });

        emit TransactionSubmitted(txId, msg.sender, target, value, data);
    }

    /**
     * @notice Confirm a pending transaction
     * @param txId Transaction ID to confirm
     */
    function confirmTransaction(uint256 txId) external onlySigner whenNotPaused {
        Transaction storage txn = transactions[txId];
        
        if (txn.id == 0) revert TransactionNotFound();
        if (txn.state != TransactionState.Pending) revert TransactionNotPending();
        if (confirmations[txId][msg.sender]) revert AlreadyConfirmed();

        confirmations[txId][msg.sender] = true;
        txn.confirmations++;

        emit TransactionConfirmed(txId, msg.sender);
    }

    /**
     * @notice Revoke confirmation for a transaction
     * @param txId Transaction ID to revoke confirmation from
     */
    function revokeConfirmation(uint256 txId) external onlySigner {
        Transaction storage txn = transactions[txId];
        
        if (txn.id == 0) revert TransactionNotFound();
        if (txn.state != TransactionState.Pending) revert TransactionNotPending();
        if (!confirmations[txId][msg.sender]) revert NotConfirmed();

        confirmations[txId][msg.sender] = false;
        txn.confirmations--;

        emit TransactionRevoked(txId, msg.sender);
    }

    /**
     * @notice Execute a confirmed transaction
     * @param txId Transaction ID to execute
     */
    function executeTransaction(uint256 txId) external nonReentrant onlySigner whenNotPaused {
        Transaction storage txn = transactions[txId];
        
        if (txn.id == 0) revert TransactionNotFound();
        if (txn.state != TransactionState.Pending) revert TransactionNotPending();
        if (txn.confirmations < requiredConfirmations) revert NotEnoughConfirmations();

        txn.state = TransactionState.Executed;

        (bool success, ) = txn.target.call{value: txn.value}(txn.data);
        if (!success) revert ExecutionFailed();

        emit TransactionExecuted(txId);
    }

    /**
     * @notice Cancel a pending transaction
     * @param txId Transaction ID to cancel
     */
    function cancelTransaction(uint256 txId) external {
        Transaction storage txn = transactions[txId];
        
        if (txn.id == 0) revert TransactionNotFound();
        if (txn.state != TransactionState.Pending) revert TransactionNotPending();
        if (msg.sender != txn.proposer && msg.sender != owner()) {
            revert NotASigner();
        }

        txn.state = TransactionState.Cancelled;

        emit TransactionCancelled(txId);
    }

    // ============ Distribution Functions ============

    /**
     * @notice Send ETH distribution to the collective
     * @param amount Amount of ETH to send
     */
    function sendDistribution(uint256 amount) external onlySigner nonReentrant {
        if (collective == address(0)) revert InvalidAddress();
        if (amount == 0 || amount > address(this).balance) revert InsufficientBalance();

        INULPCollective(collective).receiveDistribution{value: amount}();

        emit DistributionSent(collective, amount);
    }

    // ============ Admin Functions ============

    /**
     * @notice Add a new signer
     * @param signer Address of the new signer
     */
    function addSigner(address signer) external onlyOwner {
        if (signer == address(0)) revert InvalidAddress();
        if (isSigner[signer]) revert AlreadySigner();
        if (signers.length >= MAX_SIGNERS) revert TooManySigners();

        isSigner[signer] = true;
        signers.push(signer);

        emit SignerAdded(signer);
    }

    /**
     * @notice Remove a signer
     * @param signer Address of the signer to remove
     */
    function removeSigner(address signer) external onlyOwner {
        if (!isSigner[signer]) revert NotASigner();
        if (signers.length <= requiredConfirmations) revert NotEnoughSigners();

        isSigner[signer] = false;

        // Remove from array
        for (uint256 i = 0; i < signers.length; i++) {
            if (signers[i] == signer) {
                signers[i] = signers[signers.length - 1];
                signers.pop();
                break;
            }
        }

        emit SignerRemoved(signer);
    }

    /**
     * @notice Update required confirmations
     * @param _requiredConfirmations New required confirmation count
     */
    function setRequiredConfirmations(uint256 _requiredConfirmations) external onlyOwner {
        if (_requiredConfirmations == 0 || _requiredConfirmations > signers.length) {
            revert InvalidConfirmationCount();
        }

        uint256 oldValue = requiredConfirmations;
        requiredConfirmations = _requiredConfirmations;

        emit RequiredConfirmationsChanged(oldValue, _requiredConfirmations);
    }

    /**
     * @notice Update the collective contract address
     * @param _collective New collective address
     */
    function setCollective(address _collective) external onlyOwner {
        address oldCollective = collective;
        collective = _collective;

        emit CollectiveUpdated(oldCollective, _collective);
    }

    /**
     * @notice Update swap configuration
     * @param _poolFee Uniswap pool fee tier
     * @param _maxSlippage Maximum slippage in basis points
     */
    function setSwapConfig(uint24 _poolFee, uint256 _maxSlippage) external onlyOwner {
        if (_maxSlippage > BASIS_POINTS) revert InvalidAmount();
        
        swapPoolFee = _poolFee;
        maxSlippage = _maxSlippage;

        emit SwapConfigUpdated(_poolFee, _maxSlippage);
    }

    /**
     * @notice Toggle auto-burn feature
     * @param enabled Whether auto-burn should be enabled
     */
    function setAutoBurnEnabled(bool enabled) external onlyOwner {
        autoBurnEnabled = enabled;
        emit AutoBurnToggled(enabled);
    }

    /**
     * @notice Emergency withdraw function (owner only)
     * @param token Token address (address(0) for ETH)
     * @param recipient Recipient address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(
        address token,
        address recipient,
        uint256 amount
    ) external onlyOwner nonReentrant {
        if (recipient == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        if (token == address(0)) {
            if (amount > address(this).balance) revert InsufficientBalance();
            (bool success, ) = recipient.call{value: amount}("");
            if (!success) revert ExecutionFailed();
        } else {
            IERC20(token).safeTransfer(recipient, amount);
        }

        emit EmergencyWithdraw(token, recipient, amount);
    }

    /**
     * @notice Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ View Functions ============

    /**
     * @notice Get the number of signers
     * @return count Number of signers
     */
    function getSignerCount() external view returns (uint256) {
        return signers.length;
    }

    /**
     * @notice Get all signers
     * @return Array of signer addresses
     */
    function getSigners() external view returns (address[] memory) {
        return signers;
    }

    /**
     * @notice Get transaction details
     * @param txId Transaction ID
     * @return Transaction struct
     */
    function getTransaction(uint256 txId) external view returns (Transaction memory) {
        return transactions[txId];
    }

    /**
     * @notice Check if a signer has confirmed a transaction
     * @param txId Transaction ID
     * @param signer Signer address
     * @return confirmed Whether the signer has confirmed
     */
    function hasConfirmed(uint256 txId, address signer) external view returns (bool) {
        return confirmations[txId][signer];
    }

    /**
     * @notice Get all supported tokens
     * @return Array of token addresses
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokens;
    }

    /**
     * @notice Get deposit count
     * @return Number of deposits
     */
    function getDepositCount() external view returns (uint256) {
        return deposits.length;
    }

    /**
     * @notice Get deposit record
     * @param index Deposit index
     * @return DepositRecord struct
     */
    function getDeposit(uint256 index) external view returns (DepositRecord memory) {
        return deposits[index];
    }

    /**
     * @notice Get treasury ETH balance
     * @return balance ETH balance
     */
    function getETHBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // ============ Internal Functions ============

    /**
     * @notice Swap ETH to NULP and burn
     * @param ethAmount Amount of ETH to swap
     * @return nulpBurned Amount of NULP burned
     */
    function _swapETHToNULPAndBurn(uint256 ethAmount) internal returns (uint256 nulpBurned) {
        if (ethAmount == 0) return 0;

        // Wrap ETH to WETH
        (bool wrapSuccess, ) = WETH.call{value: ethAmount}("");
        if (!wrapSuccess) revert SwapFailed();

        // Approve router
        IERC20(WETH).approve(SWAP_ROUTER, ethAmount);

        // Calculate minimum output with slippage protection
        // In production, use an oracle for price reference
        uint256 minOut = 0; // Accept any amount for now (MEV protected via private mempool recommended)

        try ISwapRouter(SWAP_ROUTER).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: WETH,
                tokenOut: NULP_TOKEN,
                fee: swapPoolFee,
                recipient: address(this),
                deadline: block.timestamp + 300,
                amountIn: ethAmount,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 amountOut) {
            nulpBurned = amountOut;
            
            // Burn the NULP
            if (nulpBurned > 0) {
                INULP(NULP_TOKEN).burn(nulpBurned);
            }
        } catch {
            // If swap fails, unwrap WETH back to ETH
            // This keeps funds safe if there's no liquidity
            (bool unwrapSuccess, ) = WETH.call(
                abi.encodeWithSignature("withdraw(uint256)", ethAmount)
            );
            if (!unwrapSuccess) revert SwapFailed();
            nulpBurned = 0;
        }
    }

    /**
     * @notice Swap ERC20 to NULP and burn (via WETH)
     * @param token Token to swap
     * @param amount Amount to swap
     * @return nulpBurned Amount of NULP burned
     */
    function _swapERC20ToNULPAndBurn(address token, uint256 amount) internal returns (uint256 nulpBurned) {
        if (amount == 0) return 0;

        // If token is NULP, just burn it directly
        if (token == NULP_TOKEN) {
            INULP(NULP_TOKEN).burn(amount);
            return amount;
        }

        // If token is WETH, swap directly to NULP
        if (token == WETH) {
            IERC20(WETH).approve(SWAP_ROUTER, amount);
            
            try ISwapRouter(SWAP_ROUTER).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: WETH,
                    tokenOut: NULP_TOKEN,
                    fee: swapPoolFee,
                    recipient: address(this),
                    deadline: block.timestamp + 300,
                    amountIn: amount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            ) returns (uint256 amountOut) {
                nulpBurned = amountOut;
                if (nulpBurned > 0) {
                    INULP(NULP_TOKEN).burn(nulpBurned);
                }
            } catch {
                nulpBurned = 0;
            }
            return nulpBurned;
        }

        // For other tokens, do a multi-hop swap: Token -> WETH -> NULP
        IERC20(token).approve(SWAP_ROUTER, amount);

        bytes memory path = abi.encodePacked(
            token,
            uint24(3000), // Token -> WETH pool fee
            WETH,
            swapPoolFee,  // WETH -> NULP pool fee
            NULP_TOKEN
        );

        try ISwapRouter(SWAP_ROUTER).exactInput(
            ISwapRouter.ExactInputParams({
                path: path,
                recipient: address(this),
                deadline: block.timestamp + 300,
                amountIn: amount,
                amountOutMinimum: 0
            })
        ) returns (uint256 amountOut) {
            nulpBurned = amountOut;
            if (nulpBurned > 0) {
                INULP(NULP_TOKEN).burn(nulpBurned);
            }
        } catch {
            nulpBurned = 0;
        }
    }

    /**
     * @notice Authorization check for upgrades
     * @param newImplementation Address of new implementation
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @notice Receive ETH (auto-deposits)
     */
    receive() external payable {
        if (msg.value > 0 && !paused()) {
            // Track as direct deposit (no burn for direct transfers)
            if (!isSupported[address(0)]) {
                supportedTokens.push(address(0));
                isSupported[address(0)] = true;
            }
            tokenBalances[address(0)] += msg.value;
        }
    }
}
