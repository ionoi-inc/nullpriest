// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../NULPCollective.sol";
import "../NULPTreasury.sol";

/**
 * @title MockNULP
 * @notice Mock NULP token for testing
 */
contract MockNULP is ERC20 {
    constructor() ERC20("NULP", "NULP") {
        _mint(msg.sender, 1_000_000 * 1e18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    function burnFrom(address account, uint256 amount) external {
        _spendAllowance(account, msg.sender, amount);
        _burn(account, amount);
    }
}

/**
 * @title NULPCollectiveTest
 * @notice Test suite for NULPCollective contract
 */
contract NULPCollectiveTest is Test {
    NULPCollective public collective;
    NULPCollective public collectiveImpl;
    MockNULP public nulp;

    address public owner = address(1);
    address public member1 = address(2);
    address public member2 = address(3);
    address public member3 = address(4);
    address public nonMember = address(5);

    uint256 constant MINIMUM_HOLDING = 1000 * 1e18;
    uint256 constant PROPOSAL_THRESHOLD = 5000 * 1e18;
    uint256 constant QUORUM_BASIS_POINTS = 400;
    uint256 constant VOTING_PERIOD = 7 days;
    uint256 constant VOTING_DELAY = 1 days;

    function setUp() public {
        // Deploy mock NULP
        nulp = new MockNULP();

        // Deploy implementation
        collectiveImpl = new NULPCollective();

        // Deploy proxy
        bytes memory initData = abi.encodeWithSelector(
            NULPCollective.initialize.selector,
            owner,
            MINIMUM_HOLDING,
            PROPOSAL_THRESHOLD,
            QUORUM_BASIS_POINTS,
            VOTING_PERIOD,
            VOTING_DELAY
        );

        ERC1967Proxy proxy = new ERC1967Proxy(
            address(collectiveImpl),
            initData
        );

        collective = NULPCollective(payable(address(proxy)));

        // Distribute tokens
        nulp.mint(member1, 10000 * 1e18);
        nulp.mint(member2, 5000 * 1e18);
        nulp.mint(member3, 2000 * 1e18);
        nulp.mint(nonMember, 500 * 1e18); // Below threshold
    }

    // ============ Initialization Tests ============

    function test_Initialize() public view {
        assertEq(collective.owner(), owner);
        assertEq(collective.minimumHolding(), MINIMUM_HOLDING);
        assertEq(collective.proposalThreshold(), PROPOSAL_THRESHOLD);
        assertEq(collective.quorumBasisPoints(), QUORUM_BASIS_POINTS);
        assertEq(collective.votingPeriod(), VOTING_PERIOD);
        assertEq(collective.votingDelay(), VOTING_DELAY);
    }

    function test_CannotReinitialize() public {
        vm.expectRevert();
        collective.initialize(
            owner,
            MINIMUM_HOLDING,
            PROPOSAL_THRESHOLD,
            QUORUM_BASIS_POINTS,
            VOTING_PERIOD,
            VOTING_DELAY
        );
    }

    // ============ Membership Tests ============

    function test_RegisterMember() public {
        vm.prank(member1);
        collective.registerMember();

        assertTrue(collective.isValidMember(member1));
        assertEq(collective.getMemberCount(), 1);
    }

    function test_CannotRegisterWithInsufficientBalance() public {
        vm.prank(nonMember);
        vm.expectRevert();
        collective.registerMember();
    }

    function test_CannotRegisterTwice() public {
        vm.prank(member1);
        collective.registerMember();

        vm.prank(member1);
        vm.expectRevert();
        collective.registerMember();
    }

    function test_RemoveMemberBelowThreshold() public {
        // Register member
        vm.prank(member1);
        collective.registerMember();

        // Transfer tokens away
        vm.prank(member1);
        nulp.transfer(address(0xdead), 9500 * 1e18);

        // Anyone can remove them now
        collective.removeMember(member1);
        assertFalse(collective.isValidMember(member1));
    }

    // ============ Proposal Tests ============

    function test_CreateProposal() public {
        // Register member with enough tokens
        vm.prank(member1);
        collective.registerMember();

        // Create proposal
        address[] memory targets = new address[](1);
        targets[0] = address(this);
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = "";

        vm.prank(member1);
        uint256 proposalId = collective.createProposal(
            "Test Proposal",
            "Description",
            targets,
            values,
            calldatas
        );

        assertEq(proposalId, 1);
        assertEq(collective.proposalCount(), 1);
    }

    function test_CannotCreateProposalBelowThreshold() public {
        // Register member with insufficient tokens for proposals
        vm.prank(member3);
        collective.registerMember();

        address[] memory targets = new address[](1);
        targets[0] = address(this);
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = "";

        vm.prank(member3);
        vm.expectRevert();
        collective.createProposal(
            "Test Proposal",
            "Description",
            targets,
            values,
            calldatas
        );
    }

    function test_VoteOnProposal() public {
        // Setup
        vm.prank(member1);
        collective.registerMember();
        vm.prank(member2);
        collective.registerMember();

        // Create proposal
        address[] memory targets = new address[](1);
        targets[0] = address(this);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);

        vm.prank(member1);
        uint256 proposalId = collective.createProposal(
            "Test",
            "Description",
            targets,
            values,
            calldatas
        );

        // Fast forward past voting delay
        vm.warp(block.timestamp + VOTING_DELAY + 1);

        // Vote
        vm.prank(member1);
        collective.castVote(proposalId, NULPCollective.VoteType.For, "Support");

        vm.prank(member2);
        collective.castVote(proposalId, NULPCollective.VoteType.Against, "Oppose");

        // Check votes
        NULPCollective.Proposal memory proposal = collective.getProposal(proposalId);
        assertEq(proposal.forVotes, 10000 * 1e18);
        assertEq(proposal.againstVotes, 5000 * 1e18);
    }

    function test_CannotVoteTwice() public {
        vm.prank(member1);
        collective.registerMember();

        address[] memory targets = new address[](1);
        targets[0] = address(this);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);

        vm.prank(member1);
        uint256 proposalId = collective.createProposal(
            "Test",
            "Description",
            targets,
            values,
            calldatas
        );

        vm.warp(block.timestamp + VOTING_DELAY + 1);

        vm.prank(member1);
        collective.castVote(proposalId, NULPCollective.VoteType.For, "");

        vm.prank(member1);
        vm.expectRevert();
        collective.castVote(proposalId, NULPCollective.VoteType.For, "");
    }

    // ============ Distribution Tests ============

    function test_ReceiveDistribution() public {
        // Set treasury
        vm.prank(owner);
        collective.setTreasury(address(this));

        // Send distribution
        collective.receiveDistribution{value: 1 ether}();

        assertEq(collective.distributionPool(), 1 ether);
    }

    function test_ClaimRewards() public {
        // Setup
        vm.prank(member1);
        collective.registerMember();

        // Set treasury and send funds
        vm.prank(owner);
        collective.setTreasury(address(this));
        collective.receiveDistribution{value: 1 ether}();

        // Start epoch
        vm.prank(owner);
        collective.startDistributionEpoch(1 ether);

        // Claim
        uint256 balanceBefore = member1.balance;
        vm.prank(member1);
        collective.claimRewards(1);

        assertTrue(member1.balance > balanceBefore);
    }

    // ============ Admin Tests ============

    function test_SetMinimumHolding() public {
        vm.prank(owner);
        collective.setMinimumHolding(2000 * 1e18);
        assertEq(collective.minimumHolding(), 2000 * 1e18);
    }

    function test_OnlyOwnerCanSetMinimumHolding() public {
        vm.prank(member1);
        vm.expectRevert();
        collective.setMinimumHolding(2000 * 1e18);
    }

    function test_Pause() public {
        vm.prank(owner);
        collective.pause();

        vm.prank(member1);
        vm.expectRevert();
        collective.registerMember();
    }

    // ============ Receive ETH ============

    receive() external payable {}
}
