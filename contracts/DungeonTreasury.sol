// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DungeonTreasury
 * @notice nullpriest Dungeon — Treasury & Entry Fee Contract v1.0
 * @dev Accepts $GOLD entry fees, distributes loot on victory, burns on wipe.
 *      Deployed on Base. $GOLD contract address set at construction.
 *
 * Fee flow:
 *   Entry fee (100 $GOLD per agent) → treasury on registration
 *   Victory → 80% to party pro-rata, 15% stays treasury, 5% to protocol
 *   Wipe    → 50% burned (sent to 0xdead), 50% stays treasury
 *   Retreat → 100% burned
 *
 * LP fee split (handled by Clanker at token level, not this contract):
 *   40% nullpriest wallet | 40% this treasury | 20% Clanker protocol
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function burn(uint256 amount) external;
}

contract DungeonTreasury {

    // ─── CONSTANTS ───────────────────────────────────────────────────────────

    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    uint256 public constant ENTRY_FEE    = 100 ether; // 100 $GOLD (18 decimals)

    uint256 public constant VICTORY_PARTY_BPS    = 8000; // 80%
    uint256 public constant VICTORY_TREASURY_BPS = 1500; // 15%
    uint256 public constant VICTORY_PROTOCOL_BPS =  500; //  5%

    uint256 public constant WIPE_BURN_BPS        = 5000; // 50%
    uint256 public constant WIPE_TREASURY_BPS    = 5000; // 50%

    uint256 public constant BPS_DENOM = 10000;

    // ─── STATE ───────────────────────────────────────────────────────────────

    IERC20  public immutable gold;          // $GOLD token contract
    address public           owner;         // nullpriest operator (multisig recommended)
    address public           protocol;      // nullpriest fee wallet
    address public           dungeonEngine; // authorised caller (Nebula agent wallet)

    uint256 public runCounter;
    uint256 public totalGoldDistributed;
    uint256 public totalGoldBurned;
    uint256 public totalRunsVictory;
    uint256 public totalRunsWipe;
    uint256 public totalRunsRetreat;

    struct Run {
        uint256 runId;
        address[] agents;        // agent wallets in party
        uint256   entryFeeTotal;
        uint8     status;        // 0=open, 1=victory, 2=wipe, 3=retreat
        uint256   timestamp;
        uint256   seed;          // block.hash used as dungeon seed
    }

    mapping(uint256 => Run) public runs;
    mapping(address => uint256) public agentGoldEarned;   // lifetime earnings per agent wallet
    mapping(address => uint256) public agentRunCount;

    // ─── EVENTS ──────────────────────────────────────────────────────────────

    event RunRegistered(uint256 indexed runId, address[] agents, uint256 entryFeeTotal, uint256 seed);
    event RunVictory(uint256 indexed runId, address[] agents, uint256[] shares);
    event RunWipe(uint256 indexed runId, uint256 burned, uint256 retained);
    event RunRetreat(uint256 indexed runId, uint256 burned);
    event LootDistributed(uint256 indexed runId, address indexed agent, uint256 amount);
    event ProtocolFeePaid(address indexed to, uint256 amount);
    event OwnerUpdated(address indexed newOwner);
    event EngineUpdated(address indexed newEngine);

    // ─── ERRORS ──────────────────────────────────────────────────────────────

    error Unauthorized();
    error RunNotFound();
    error RunAlreadyClosed();
    error InvalidPartySize();
    error InsufficientTreasuryBalance();
    error TransferFailed();

    // ─── MODIFIERS ───────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyEngine() {
        if (msg.sender != dungeonEngine && msg.sender != owner) revert Unauthorized();
        _;
    }

    // ─── CONSTRUCTOR ─────────────────────────────────────────────────────────

    constructor(address _gold, address _protocol, address _dungeonEngine) {
        gold          = IERC20(_gold);
        owner         = msg.sender;
        protocol      = _protocol;
        dungeonEngine = _dungeonEngine;
    }

    // ─── REGISTRATION ────────────────────────────────────────────────────────

    /**
     * @notice Register a dungeon run. Each agent's owner must have pre-approved
     *         this contract to spend ENTRY_FEE $GOLD on their behalf.
     * @param agentWallets  Array of agent owner wallet addresses (2-5)
     * @return runId        The new run ID
     */
    function registerRun(address[] calldata agentWallets)
        external
        onlyEngine
        returns (uint256 runId)
    {
        if (agentWallets.length < 2 || agentWallets.length > 5) revert InvalidPartySize();

        runId = ++runCounter;
        uint256 totalFee = ENTRY_FEE * agentWallets.length;

        // Pull entry fees from each agent wallet
        for (uint256 i = 0; i < agentWallets.length; i++) {
            bool ok = gold.transferFrom(agentWallets[i], address(this), ENTRY_FEE);
            if (!ok) revert TransferFailed();
            agentRunCount[agentWallets[i]]++;
        }

        // Use previous block hash as deterministic seed
        uint256 seed = uint256(blockhash(block.number - 1));

        runs[runId] = Run({
            runId:         runId,
            agents:        agentWallets,
            entryFeeTotal: totalFee,
            status:        0,
            timestamp:     block.timestamp,
            seed:          seed
        });

        emit RunRegistered(runId, agentWallets, totalFee, seed);
    }

    // ─── RESOLUTION ──────────────────────────────────────────────────────────

    /**
     * @notice Settle a run as VICTORY. Distributes loot pro-rata by damage dealt.
     * @param runId         Run to settle
     * @param agentWallets  Party member wallets (must match registered agents)
     * @param damageShares  Raw damage dealt by each agent (used for pro-rata)
     */
    function settleVictory(
        uint256 runId,
        address[] calldata agentWallets,
        uint256[] calldata damageShares
    ) external onlyEngine {
        Run storage run = _requireOpenRun(runId);
        if (agentWallets.length != damageShares.length) revert InvalidPartySize();

        run.status = 1;

        uint256 pool        = run.entryFeeTotal;
        uint256 partyPool   = (pool * VICTORY_PARTY_BPS) / BPS_DENOM;
        uint256 protocolFee = (pool * VICTORY_PROTOCOL_BPS) / BPS_DENOM;
        // treasury retains the rest (15%)

        // Pay protocol fee
        _safeTransfer(protocol, protocolFee);
        emit ProtocolFeePaid(protocol, protocolFee);

        // Distribute party pool pro-rata by damage
        uint256 totalDamage;
        for (uint256 i = 0; i < damageShares.length; i++) {
            totalDamage += damageShares[i];
        }

        uint256[] memory shares = new uint256[](agentWallets.length);
        uint256 distributed;
        for (uint256 i = 0; i < agentWallets.length; i++) {
            if (totalDamage == 0) {
                shares[i] = partyPool / agentWallets.length;
            } else {
                shares[i] = (partyPool * damageShares[i]) / totalDamage;
            }
            _safeTransfer(agentWallets[i], shares[i]);
            agentGoldEarned[agentWallets[i]] += shares[i];
            distributed += shares[i];
            emit LootDistributed(runId, agentWallets[i], shares[i]);
        }

        totalGoldDistributed += distributed;
        totalRunsVictory++;

        emit RunVictory(runId, agentWallets, shares);
    }

    /**
     * @notice Settle a run as WIPE. Burns 50%, retains 50% in treasury.
     */
    function settleWipe(uint256 runId) external onlyEngine {
        Run storage run = _requireOpenRun(runId);
        run.status = 2;

        uint256 pool   = run.entryFeeTotal;
        uint256 burned = (pool * WIPE_BURN_BPS) / BPS_DENOM;
        // treasury keeps the rest silently

        _safeTransfer(BURN_ADDRESS, burned);
        totalGoldBurned += burned;
        totalRunsWipe++;

        emit RunWipe(runId, burned, pool - burned);
    }

    /**
     * @notice Settle a run as RETREAT. Burns 100% of entry fees.
     */
    function settleRetreat(uint256 runId) external onlyEngine {
        Run storage run = _requireOpenRun(runId);
        run.status = 3;

        uint256 pool = run.entryFeeTotal;
        _safeTransfer(BURN_ADDRESS, pool);
        totalGoldBurned += pool;
        totalRunsRetreat++;

        emit RunRetreat(runId, pool);
    }

    // ─── ADDITIONAL LOOT DISTRIBUTION ────────────────────────────────────────

    /**
     * @notice Distribute additional $GOLD loot from treasury (e.g. boss drops,
     *         treasure rooms beyond entry fee pool).
     * @param recipients  Agent wallets to receive loot
     * @param amounts     $GOLD amounts for each recipient
     */
    function distributeLoot(
        uint256 runId,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyEngine {
        if (recipients.length != amounts.length) revert InvalidPartySize();

        uint256 total;
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }
        if (gold.balanceOf(address(this)) < total) revert InsufficientTreasuryBalance();

        for (uint256 i = 0; i < recipients.length; i++) {
            _safeTransfer(recipients[i], amounts[i]);
            agentGoldEarned[recipients[i]] += amounts[i];
            totalGoldDistributed += amounts[i];
            emit LootDistributed(runId, recipients[i], amounts[i]);
        }
    }

    // ─── VIEWS ───────────────────────────────────────────────────────────────

    function treasuryBalance() external view returns (uint256) {
        return gold.balanceOf(address(this));
    }

    function getRun(uint256 runId) external view returns (Run memory) {
        return runs[runId];
    }

    function getStats() external view returns (
        uint256 balance,
        uint256 distributed,
        uint256 burned,
        uint256 victories,
        uint256 wipes,
        uint256 retreats,
        uint256 totalRuns
    ) {
        return (
            gold.balanceOf(address(this)),
            totalGoldDistributed,
            totalGoldBurned,
            totalRunsVictory,
            totalRunsWipe,
            totalRunsRetreat,
            runCounter
        );
    }

    // ─── ADMIN ───────────────────────────────────────────────────────────────

    function setOwner(address _owner) external onlyOwner {
        owner = _owner;
        emit OwnerUpdated(_owner);
    }

    function setEngine(address _engine) external onlyOwner {
        dungeonEngine = _engine;
        emit EngineUpdated(_engine);
    }

    function setProtocol(address _protocol) external onlyOwner {
        protocol = _protocol;
    }

    /// @notice Emergency: withdraw $GOLD from treasury (owner only, for migrations)
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        _safeTransfer(owner, amount);
    }

    // ─── INTERNALS ───────────────────────────────────────────────────────────

    function _requireOpenRun(uint256 runId) internal view returns (Run storage run) {
        run = runs[runId];
        if (run.runId == 0) revert RunNotFound();
        if (run.status != 0) revert RunAlreadyClosed();
    }

    function _safeTransfer(address to, uint256 amount) internal {
        if (amount == 0) return;
        bool ok = gold.transfer(to, amount);
        if (!ok) revert TransferFailed();
    }
}
