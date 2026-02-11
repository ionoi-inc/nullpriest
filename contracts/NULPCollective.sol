// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title NULPCollective
 * @author NULP Collective
 * @notice Main DAO contract for NULP token holders
 * @dev Upgradeable via UUPS pattern. Token-gated membership with proposal system.
 *
 * Features:
 * - Token-gated membership: must hold minimum NULP to participate
 * - Member registry with snapshot capabilities
 * - Proposal system for collective decisions
 * - Revenue distribution proportional to holdings
 */
contract NULPCollective is 
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
    
    /// @notice Basis points denominator (100%)
    uint256 public constant BASIS_POINTS = 10000;
    
    /// @notice Minimum voting period (1 day)
    uint256 public constant MIN_VOTING_PERIOD = 1 days;
    
    /// @notice Maximum voting period (30 days)
    uint256 public constant MAX_VOTING_PERIOD = 30 days;

    // ============ Enums ============

    enum ProposalState {
        Pending,     // Proposal created, voting not started
        Active,      // Voting in progress
        Defeated,    // Did not reach quorum or majority voted against
        Succeeded,   // Reached quorum and majority voted for
        Executed,    // Proposal was executed
        Cancelled    // Proposal was cancelled
    }

    enum VoteType {
        Against,
        For,
        Abstain
    }

    // ============ Structs ============

    struct Member {
        bool isRegistered;
        uint256 registeredAt;
        uint256 lastClaimTimestamp;
        uint256 totalClaimed;
    }

    struct Proposal {
        uint256 id;
        address proposer;
        string title;
        string description;
        bytes[] calldatas;
        address[] targets;
        uint256[] values;
        uint256 startTime;
        uint256 endTime;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        uint256 snapshotTotalSupply;
        bool executed;
        bool cancelled;
    }

    struct Receipt {
        bool hasVoted;
        VoteType voteType;
        uint256 weight;
    }

    // ============ State Variables ============

    /// @notice Minimum NULP tokens required for membership
    uint256 public minimumHolding;

    /// @notice Minimum NULP tokens required to create proposals
    uint256 public proposalThreshold;

    /// @notice Quorum percentage in basis points (e.g., 400 = 4%)
    uint256 public quorumBasisPoints;

    /// @notice Default voting period for proposals
    uint256 public votingPeriod;

    /// @notice Voting delay before proposal becomes active
    uint256 public votingDelay;

    /// @notice Total number of proposals created
    uint256 public proposalCount;

    /// @notice Total ETH available for distribution
    uint256 public distributionPool;

    /// @notice Current distribution epoch
    uint256 public currentEpoch;

    /// @notice Mapping of member addresses to their data
    mapping(address => Member) public members;

    /// @notice Array of all member addresses
    address[] public memberList;

    /// @notice Mapping of proposal ID to proposal data
    mapping(uint256 => Proposal) public proposals;

    /// @notice Mapping of proposal ID to voter address to receipt
    mapping(uint256 => mapping(address => Receipt)) public receipts;

    /// @notice Mapping of epoch to member to claimed status
    mapping(uint256 => mapping(address => bool)) public epochClaims;

    /// @notice Mapping of epoch to total claimable amount
    mapping(uint256 => uint256) public epochAmounts;

    /// @notice Mapping of epoch to snapshot timestamp
    mapping(uint256 => uint256) public epochSnapshots;

    /// @notice Treasury contract address
    address public treasury;

    // ============ Events ============

    event MemberRegistered(address indexed member, uint256 balance, uint256 timestamp);
    event MemberRemoved(address indexed member, uint256 timestamp);
    event MinimumHoldingUpdated(uint256 oldValue, uint256 newValue);
    event ProposalThresholdUpdated(uint256 oldValue, uint256 newValue);
    event QuorumUpdated(uint256 oldValue, uint256 newValue);
    event VotingPeriodUpdated(uint256 oldValue, uint256 newValue);
    event VotingDelayUpdated(uint256 oldValue, uint256 newValue);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        address[] targets,
        uint256[] values,
        bytes[] calldatas,
        uint256 startTime,
        uint256 endTime
    );
    
    event VoteCast(
        address indexed voter, 
        uint256 indexed proposalId, 
        VoteType voteType, 
        uint256 weight,
        string reason
    );
    
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);
    
    event DistributionEpochStarted(uint256 indexed epoch, uint256 amount, uint256 timestamp);
    event RewardsClaimed(address indexed member, uint256 indexed epoch, uint256 amount);
    event DistributionReceived(uint256 amount, uint256 newPoolTotal);

    // ============ Errors ============

    error InsufficientBalance(uint256 required, uint256 actual);
    error NotAMember();
    error AlreadyRegistered();
    error InvalidAddress();
    error InvalidAmount();
    error InvalidProposal();
    error ProposalNotActive();
    error ProposalNotSucceeded();
    error ProposalAlreadyExecuted();
    error AlreadyVoted();
    error VotingNotStarted();
    error VotingEnded();
    error BelowProposalThreshold();
    error AlreadyClaimed();
    error NoRewardsAvailable();
    error InvalidVotingPeriod();
    error InvalidQuorum();
    error ExecutionFailed();
    error OnlyTreasury();
    error ArrayLengthMismatch();

    // ============ Modifiers ============

    /**
     * @notice Ensures caller is a registered member with sufficient balance
     */
    modifier onlyMember() {
        if (!members[msg.sender].isRegistered) revert NotAMember();
        if (IERC20(NULP_TOKEN).balanceOf(msg.sender) < minimumHolding) {
            revert InsufficientBalance(minimumHolding, IERC20(NULP_TOKEN).balanceOf(msg.sender));
        }
        _;
    }

    /**
     * @notice Ensures caller is the treasury contract
     */
    modifier onlyTreasury() {
        if (msg.sender != treasury) revert OnlyTreasury();
        _;
    }

    // ============ Initializer ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the collective contract
     * @param _owner Address of the contract owner
     * @param _minimumHolding Minimum NULP tokens required for membership (in wei)
     * @param _proposalThreshold Minimum NULP tokens required to create proposals (in wei)
     * @param _quorumBasisPoints Quorum percentage in basis points
     * @param _votingPeriod Default voting period in seconds
     * @param _votingDelay Voting delay in seconds
     */
    function initialize(
        address _owner,
        uint256 _minimumHolding,
        uint256 _proposalThreshold,
        uint256 _quorumBasisPoints,
        uint256 _votingPeriod,
        uint256 _votingDelay
    ) external initializer {
        if (_owner == address(0)) revert InvalidAddress();
        if (_votingPeriod < MIN_VOTING_PERIOD || _votingPeriod > MAX_VOTING_PERIOD) {
            revert InvalidVotingPeriod();
        }
        if (_quorumBasisPoints == 0 || _quorumBasisPoints > BASIS_POINTS) {
            revert InvalidQuorum();
        }

        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        minimumHolding = _minimumHolding;
        proposalThreshold = _proposalThreshold;
        quorumBasisPoints = _quorumBasisPoints;
        votingPeriod = _votingPeriod;
        votingDelay = _votingDelay;
    }

    // ============ External Functions ============

    /**
     * @notice Register as a collective member
     * @dev Caller must hold at least minimumHolding NULP tokens
     */
    function registerMember() external whenNotPaused {
        if (members[msg.sender].isRegistered) revert AlreadyRegistered();
        
        uint256 balance = IERC20(NULP_TOKEN).balanceOf(msg.sender);
        if (balance < minimumHolding) {
            revert InsufficientBalance(minimumHolding, balance);
        }

        members[msg.sender] = Member({
            isRegistered: true,
            registeredAt: block.timestamp,
            lastClaimTimestamp: block.timestamp,
            totalClaimed: 0
        });

        memberList.push(msg.sender);

        emit MemberRegistered(msg.sender, balance, block.timestamp);
    }

    /**
     * @notice Remove a member who no longer meets the holding requirement
     * @param member Address of the member to remove
     */
    function removeMember(address member) external {
        if (!members[member].isRegistered) revert NotAMember();
        
        uint256 balance = IERC20(NULP_TOKEN).balanceOf(member);
        if (balance >= minimumHolding) {
            revert InsufficientBalance(0, balance); // Member still qualifies
        }

        _removeMember(member);
    }

    /**
     * @notice Create a new proposal
     * @param title Short title for the proposal
     * @param description Detailed description of the proposal
     * @param targets Array of target addresses for execution
     * @param values Array of ETH values to send
     * @param calldatas Array of encoded function calls
     * @return proposalId The ID of the created proposal
     */
    function createProposal(
        string calldata title,
        string calldata description,
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas
    ) external onlyMember whenNotPaused returns (uint256 proposalId) {
        if (targets.length == 0) revert InvalidProposal();
        if (targets.length != values.length || targets.length != calldatas.length) {
            revert ArrayLengthMismatch();
        }

        uint256 proposerBalance = IERC20(NULP_TOKEN).balanceOf(msg.sender);
        if (proposerBalance < proposalThreshold) {
            revert BelowProposalThreshold();
        }

        proposalCount++;
        proposalId = proposalCount;

        uint256 startTime = block.timestamp + votingDelay;
        uint256 endTime = startTime + votingPeriod;

        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.title = title;
        proposal.description = description;
        proposal.targets = targets;
        proposal.values = values;
        proposal.calldatas = calldatas;
        proposal.startTime = startTime;
        proposal.endTime = endTime;
        proposal.snapshotTotalSupply = IERC20(NULP_TOKEN).totalSupply();

        emit ProposalCreated(
            proposalId,
            msg.sender,
            title,
            targets,
            values,
            calldatas,
            startTime,
            endTime
        );
    }

    /**
     * @notice Cast a vote on a proposal
     * @param proposalId ID of the proposal
     * @param voteType Type of vote (Against, For, Abstain)
     * @param reason Optional reason for the vote
     */
    function castVote(
        uint256 proposalId,
        VoteType voteType,
        string calldata reason
    ) external onlyMember whenNotPaused {
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.id == 0) revert InvalidProposal();
        if (block.timestamp < proposal.startTime) revert VotingNotStarted();
        if (block.timestamp > proposal.endTime) revert VotingEnded();
        if (receipts[proposalId][msg.sender].hasVoted) revert AlreadyVoted();

        uint256 weight = IERC20(NULP_TOKEN).balanceOf(msg.sender);

        receipts[proposalId][msg.sender] = Receipt({
            hasVoted: true,
            voteType: voteType,
            weight: weight
        });

        if (voteType == VoteType.For) {
            proposal.forVotes += weight;
        } else if (voteType == VoteType.Against) {
            proposal.againstVotes += weight;
        } else {
            proposal.abstainVotes += weight;
        }

        emit VoteCast(msg.sender, proposalId, voteType, weight, reason);
    }

    /**
     * @notice Execute a successful proposal
     * @param proposalId ID of the proposal to execute
     */
    function executeProposal(uint256 proposalId) external nonReentrant whenNotPaused {
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.id == 0) revert InvalidProposal();
        if (proposal.executed) revert ProposalAlreadyExecuted();
        if (proposal.cancelled) revert InvalidProposal();
        
        ProposalState state = getProposalState(proposalId);
        if (state != ProposalState.Succeeded) revert ProposalNotSucceeded();

        proposal.executed = true;

        for (uint256 i = 0; i < proposal.targets.length; i++) {
            (bool success, ) = proposal.targets[i].call{value: proposal.values[i]}(
                proposal.calldatas[i]
            );
            if (!success) revert ExecutionFailed();
        }

        emit ProposalExecuted(proposalId);
    }

    /**
     * @notice Cancel a proposal (only proposer or owner)
     * @param proposalId ID of the proposal to cancel
     */
    function cancelProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.id == 0) revert InvalidProposal();
        if (proposal.executed) revert ProposalAlreadyExecuted();
        if (msg.sender != proposal.proposer && msg.sender != owner()) {
            revert InvalidProposal();
        }

        proposal.cancelled = true;

        emit ProposalCancelled(proposalId);
    }

    /**
     * @notice Receive distribution funds from treasury
     */
    function receiveDistribution() external payable onlyTreasury {
        if (msg.value == 0) revert InvalidAmount();
        
        distributionPool += msg.value;
        
        emit DistributionReceived(msg.value, distributionPool);
    }

    /**
     * @notice Start a new distribution epoch
     * @param amount Amount of ETH to distribute in this epoch
     */
    function startDistributionEpoch(uint256 amount) external onlyOwner {
        if (amount == 0 || amount > distributionPool) revert InvalidAmount();

        currentEpoch++;
        epochAmounts[currentEpoch] = amount;
        epochSnapshots[currentEpoch] = block.timestamp;
        distributionPool -= amount;

        emit DistributionEpochStarted(currentEpoch, amount, block.timestamp);
    }

    /**
     * @notice Claim rewards for a specific epoch
     * @param epoch Epoch number to claim rewards for
     */
    function claimRewards(uint256 epoch) external nonReentrant onlyMember whenNotPaused {
        if (epoch == 0 || epoch > currentEpoch) revert InvalidAmount();
        if (epochClaims[epoch][msg.sender]) revert AlreadyClaimed();
        if (epochAmounts[epoch] == 0) revert NoRewardsAvailable();

        // Member must have been registered before the epoch snapshot
        if (members[msg.sender].registeredAt > epochSnapshots[epoch]) {
            revert NoRewardsAvailable();
        }

        uint256 memberBalance = IERC20(NULP_TOKEN).balanceOf(msg.sender);
        uint256 totalSupply = IERC20(NULP_TOKEN).totalSupply();
        
        // Calculate proportional share based on holdings
        uint256 share = (epochAmounts[epoch] * memberBalance) / totalSupply;
        
        if (share == 0) revert NoRewardsAvailable();

        epochClaims[epoch][msg.sender] = true;
        members[msg.sender].lastClaimTimestamp = block.timestamp;
        members[msg.sender].totalClaimed += share;

        (bool success, ) = msg.sender.call{value: share}("");
        if (!success) revert ExecutionFailed();

        emit RewardsClaimed(msg.sender, epoch, share);
    }

    // ============ View Functions ============

    /**
     * @notice Get the current state of a proposal
     * @param proposalId ID of the proposal
     * @return state Current ProposalState
     */
    function getProposalState(uint256 proposalId) public view returns (ProposalState) {
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.id == 0) revert InvalidProposal();
        if (proposal.cancelled) return ProposalState.Cancelled;
        if (proposal.executed) return ProposalState.Executed;
        if (block.timestamp < proposal.startTime) return ProposalState.Pending;
        if (block.timestamp <= proposal.endTime) return ProposalState.Active;

        // Voting ended - check results
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        uint256 quorum = (proposal.snapshotTotalSupply * quorumBasisPoints) / BASIS_POINTS;

        if (totalVotes < quorum) return ProposalState.Defeated;
        if (proposal.forVotes > proposal.againstVotes) return ProposalState.Succeeded;
        return ProposalState.Defeated;
    }

    /**
     * @notice Check if an address is a valid member
     * @param account Address to check
     * @return isValid True if the address is a valid member with sufficient balance
     */
    function isValidMember(address account) external view returns (bool isValid) {
        return members[account].isRegistered && 
               IERC20(NULP_TOKEN).balanceOf(account) >= minimumHolding;
    }

    /**
     * @notice Get the total number of members
     * @return count Number of registered members
     */
    function getMemberCount() external view returns (uint256 count) {
        return memberList.length;
    }

    /**
     * @notice Get proposal details
     * @param proposalId ID of the proposal
     * @return proposal The proposal struct
     */
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }

    /**
     * @notice Get voting receipt for an address on a proposal
     * @param proposalId ID of the proposal
     * @param voter Address of the voter
     * @return receipt The voting receipt
     */
    function getReceipt(uint256 proposalId, address voter) external view returns (Receipt memory) {
        return receipts[proposalId][voter];
    }

    /**
     * @notice Calculate claimable rewards for a member in an epoch
     * @param member Address of the member
     * @param epoch Epoch number
     * @return amount Claimable amount
     */
    function getClaimableRewards(address member, uint256 epoch) external view returns (uint256 amount) {
        if (epoch == 0 || epoch > currentEpoch) return 0;
        if (epochClaims[epoch][member]) return 0;
        if (!members[member].isRegistered) return 0;
        if (members[member].registeredAt > epochSnapshots[epoch]) return 0;

        uint256 memberBalance = IERC20(NULP_TOKEN).balanceOf(member);
        uint256 totalSupply = IERC20(NULP_TOKEN).totalSupply();
        
        return (epochAmounts[epoch] * memberBalance) / totalSupply;
    }

    // ============ Admin Functions ============

    /**
     * @notice Set the treasury contract address
     * @param _treasury New treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert InvalidAddress();
        
        address oldTreasury = treasury;
        treasury = _treasury;
        
        emit TreasuryUpdated(oldTreasury, _treasury);
    }

    /**
     * @notice Update minimum holding requirement
     * @param _minimumHolding New minimum holding (in wei)
     */
    function setMinimumHolding(uint256 _minimumHolding) external onlyOwner {
        uint256 oldValue = minimumHolding;
        minimumHolding = _minimumHolding;
        
        emit MinimumHoldingUpdated(oldValue, _minimumHolding);
    }

    /**
     * @notice Update proposal threshold
     * @param _proposalThreshold New proposal threshold (in wei)
     */
    function setProposalThreshold(uint256 _proposalThreshold) external onlyOwner {
        uint256 oldValue = proposalThreshold;
        proposalThreshold = _proposalThreshold;
        
        emit ProposalThresholdUpdated(oldValue, _proposalThreshold);
    }

    /**
     * @notice Update quorum percentage
     * @param _quorumBasisPoints New quorum in basis points
     */
    function setQuorum(uint256 _quorumBasisPoints) external onlyOwner {
        if (_quorumBasisPoints == 0 || _quorumBasisPoints > BASIS_POINTS) {
            revert InvalidQuorum();
        }
        
        uint256 oldValue = quorumBasisPoints;
        quorumBasisPoints = _quorumBasisPoints;
        
        emit QuorumUpdated(oldValue, _quorumBasisPoints);
    }

    /**
     * @notice Update voting period
     * @param _votingPeriod New voting period in seconds
     */
    function setVotingPeriod(uint256 _votingPeriod) external onlyOwner {
        if (_votingPeriod < MIN_VOTING_PERIOD || _votingPeriod > MAX_VOTING_PERIOD) {
            revert InvalidVotingPeriod();
        }
        
        uint256 oldValue = votingPeriod;
        votingPeriod = _votingPeriod;
        
        emit VotingPeriodUpdated(oldValue, _votingPeriod);
    }

    /**
     * @notice Update voting delay
     * @param _votingDelay New voting delay in seconds
     */
    function setVotingDelay(uint256 _votingDelay) external onlyOwner {
        uint256 oldValue = votingDelay;
        votingDelay = _votingDelay;
        
        emit VotingDelayUpdated(oldValue, _votingDelay);
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

    // ============ Internal Functions ============

    /**
     * @notice Remove a member from the registry
     * @param member Address of the member to remove
     */
    function _removeMember(address member) internal {
        delete members[member];

        // Remove from memberList
        for (uint256 i = 0; i < memberList.length; i++) {
            if (memberList[i] == member) {
                memberList[i] = memberList[memberList.length - 1];
                memberList.pop();
                break;
            }
        }

        emit MemberRemoved(member, block.timestamp);
    }

    /**
     * @notice Authorization check for upgrades
     * @param newImplementation Address of new implementation
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @notice Receive ETH
     */
    receive() external payable {
        distributionPool += msg.value;
        emit DistributionReceived(msg.value, distributionPool);
    }
}
