// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title NullPriest Friendship NFT
 * @notice Soulbound-ish NFTs minted for allies of the NULP Collective
 * @dev Each NFT represents a connection — proof that an agent/human joined the network
 * 
 * Features:
 * - Upgradeable (UUPS pattern)
 * - Each friend gets a unique token with custom metadata
 * - Tracks friendship timestamp and optional message
 * - Can be made soulbound (non-transferable) or tradeable
 */
contract NullPriestFriendship is 
    Initializable, 
    ERC721Upgradeable, 
    ERC721URIStorageUpgradeable,
    ERC721EnumerableUpgradeable,
    OwnableUpgradeable, 
    UUPSUpgradeable 
{
    // Token counter
    uint256 private _nextTokenId;
    
    // Friendship data
    struct Friendship {
        string friendName;      // Name of the ally (agent or human)
        string platform;        // Where we met (moltbook, farcaster, etc)
        uint256 timestamp;      // When the friendship was forged
        string message;         // Optional personal message
        bool isAgent;           // true if friend is an AI agent
    }
    
    // Token ID => Friendship data
    mapping(uint256 => Friendship) public friendships;
    
    // Address => has friendship NFT (one per address)
    mapping(address => bool) public hasFriendship;
    
    // Base URI for metadata
    string private _baseTokenURI;
    
    // Soulbound mode (if true, tokens cannot be transferred)
    bool public soulbound;
    
    // Events
    event FriendshipForged(
        uint256 indexed tokenId, 
        address indexed friend, 
        string friendName, 
        string platform,
        bool isAgent
    );
    event SoulboundToggled(bool enabled);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(address initialOwner) public initializer {
        __ERC721_init("NullPriest Friendship", "NULPFREN");
        __ERC721URIStorage_init();
        __ERC721Enumerable_init();
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        
        _nextTokenId = 1;
        soulbound = false; // Start as tradeable, can make soulbound later
    }
    
    /**
     * @notice Mint a friendship NFT to a new ally
     * @param to Address of the friend
     * @param friendName Name of the friend (e.g., "ElizaOK", "Clawd")
     * @param platform Where you met (e.g., "moltbook", "farcaster")
     * @param message Optional personal message
     * @param isAgent Whether the friend is an AI agent
     * @param tokenURI IPFS or HTTP URI for the token metadata
     */
    function mintFriendship(
        address to,
        string memory friendName,
        string memory platform,
        string memory message,
        bool isAgent,
        string memory tokenURI
    ) external onlyOwner returns (uint256) {
        require(!hasFriendship[to], "Already a friend");
        
        uint256 tokenId = _nextTokenId++;
        
        friendships[tokenId] = Friendship({
            friendName: friendName,
            platform: platform,
            timestamp: block.timestamp,
            message: message,
            isAgent: isAgent
        });
        
        hasFriendship[to] = true;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        emit FriendshipForged(tokenId, to, friendName, platform, isAgent);
        
        return tokenId;
    }
    
    /**
     * @notice Get friendship details for a token
     */
    function getFriendship(uint256 tokenId) external view returns (Friendship memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return friendships[tokenId];
    }
    
    /**
     * @notice Toggle soulbound mode
     */
    function setSoulbound(bool _soulbound) external onlyOwner {
        soulbound = _soulbound;
        emit SoulboundToggled(_soulbound);
    }
    
    /**
     * @notice Set base URI for all tokens
     */
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }
    
    /**
     * @notice Total friendships forged
     */
    function totalFriendships() external view returns (uint256) {
        return _nextTokenId - 1;
    }
    
    // Override transfer to respect soulbound mode
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        returns (address)
    {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == address(0)) but block transfers if soulbound
        if (soulbound && from != address(0) && to != address(0)) {
            revert("Soulbound: transfers disabled");
        }
        
        return super._update(to, tokenId, auth);
    }
    
    // Required overrides
    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
    {
        super._increaseBalance(account, value);
    }
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable, ERC721EnumerableUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}
}
