// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DungeonLoot
 * @notice nullpriest Dungeon — ERC-1155 Loot NFT Contract v1.0
 * @dev Soul-bound item NFTs for dungeon adventurers.
 *      Items are non-transferable (soul-bound to the agent's owner wallet).
 *      Minted by the dungeon engine on loot drops.
 *      Deployed on Base.
 *
 * Item IDs:
 *   RARE
 *   1  — Moonblade        (+5 ATK permanently)
 *   2  — Shadowcloak      (+4 SPD permanently)
 *   3  — Serpent Ring     (+3 ATK, +3 SPD)
 *   4  — Ironveil Helm    (+6 DEF permanently)
 *
 *   LEGENDARY
 *   5  — Staff of Echoes  (+8 MAG, SPELL hits twice)
 *   6  — Aegis of Fallen  (SHIELD WALL lasts 3 rounds)
 *   7  — Deathwhisper Bow (+8 ATK, VOLLEY hits 3 times at 60%)
 *   8  — Voidstep Boots   (+6 SPD, FLEE always succeeds)
 *
 *   MYTHIC
 *   9  — The Void Shard   (+15 ATK, 10% STUN on hit)
 *   10 — Crown of Malachar (+10 MAG, boss damage +25%)
 *   11 — Hollow King Seal  (all specials recharge each dungeon floor)
 */

interface IERC1155Receiver {
    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external returns (bytes4);
    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) external returns (bytes4);
}

contract DungeonLoot {

    // ─── ITEM DEFINITIONS ────────────────────────────────────────────────────

    uint256 public constant MOONBLADE          = 1;
    uint256 public constant SHADOWCLOAK        = 2;
    uint256 public constant SERPENT_RING       = 3;
    uint256 public constant IRONVEIL_HELM      = 4;
    uint256 public constant STAFF_OF_ECHOES    = 5;
    uint256 public constant AEGIS_OF_FALLEN    = 6;
    uint256 public constant DEATHWHISPER_BOW   = 7;
    uint256 public constant VOIDSTEP_BOOTS     = 8;
    uint256 public constant THE_VOID_SHARD     = 9;
    uint256 public constant CROWN_OF_MALACHAR  = 10;
    uint256 public constant HOLLOW_KING_SEAL   = 11;

    uint256 public constant MAX_ITEM_ID        = 11;

    enum Tier { RARE, LEGENDARY, MYTHIC }

    struct ItemMeta {
        string  name;
        string  description;
        Tier    tier;
        uint256 maxSupply;   // 0 = unlimited (rare), set for legendary/mythic
        uint256 minted;
    }

    // ─── ERC-1155 STATE ──────────────────────────────────────────────────────

    // soul-bound: balances[wallet][itemId]
    mapping(address => mapping(uint256 => uint256)) private _balances;
    // No approvals — soul-bound
    mapping(uint256 => ItemMeta) public items;
    string private _baseURI;

    // ─── ACCESS ──────────────────────────────────────────────────────────────

    address public owner;
    address public dungeonEngine;  // only authorised minter

    // ─── EVENTS ──────────────────────────────────────────────────────────────

    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);
    event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values);
    event URI(string value, uint256 indexed id);
    event ItemMinted(address indexed to, uint256 indexed itemId, string itemName, uint256 runId);
    event EngineUpdated(address indexed newEngine);

    // ─── ERRORS ──────────────────────────────────────────────────────────────

    error Unauthorized();
    error SoulBound();
    error InvalidItemId();
    error MaxSupplyReached();
    error AlreadyOwnsItem();
    error LengthMismatch();

    // ─── CONSTRUCTOR ─────────────────────────────────────────────────────────

    constructor(address _dungeonEngine, string memory baseURI_) {
        owner         = msg.sender;
        dungeonEngine = _dungeonEngine;
        _baseURI      = baseURI_;

        // Register all items
        _registerItems();
    }

    function _registerItems() internal {
        // RARE (unlimited supply)
        items[MOONBLADE]        = ItemMeta("Moonblade",        "+5 ATK permanently",                          Tier.RARE,      0,    0);
        items[SHADOWCLOAK]      = ItemMeta("Shadowcloak",      "+4 SPD permanently",                          Tier.RARE,      0,    0);
        items[SERPENT_RING]     = ItemMeta("Serpent Ring",     "+3 ATK, +3 SPD",                              Tier.RARE,      0,    0);
        items[IRONVEIL_HELM]    = ItemMeta("Ironveil Helm",    "+6 DEF permanently",                          Tier.RARE,      0,    0);

        // LEGENDARY (capped supply)
        items[STAFF_OF_ECHOES]  = ItemMeta("Staff of Echoes",  "+8 MAG, SPELL hits twice",                    Tier.LEGENDARY, 500,  0);
        items[AEGIS_OF_FALLEN]  = ItemMeta("Aegis of Fallen",  "SHIELD WALL lasts 3 rounds",                  Tier.LEGENDARY, 500,  0);
        items[DEATHWHISPER_BOW] = ItemMeta("Deathwhisper Bow", "+8 ATK, VOLLEY hits 3x at 60%",               Tier.LEGENDARY, 500,  0);
        items[VOIDSTEP_BOOTS]   = ItemMeta("Voidstep Boots",   "+6 SPD, FLEE always succeeds",                Tier.LEGENDARY, 500,  0);

        // MYTHIC (very limited)
        items[THE_VOID_SHARD]   = ItemMeta("The Void Shard",   "+15 ATK, 10% STUN on hit",                    Tier.MYTHIC,    100,  0);
        items[CROWN_OF_MALACHAR]= ItemMeta("Crown of Malachar","+10 MAG, boss damage +25%",                   Tier.MYTHIC,    100,  0);
        items[HOLLOW_KING_SEAL] = ItemMeta("Hollow King Seal", "All specials recharge each dungeon floor",     Tier.MYTHIC,    50,   0);
    }

    // ─── MINTING ─────────────────────────────────────────────────────────────

    /**
     * @notice Mint a single item to an agent's owner wallet.
     * @param to      Agent owner wallet address
     * @param itemId  Item ID (1–11)
     * @param runId   Run ID for event tracking
     */
    function mint(address to, uint256 itemId, uint256 runId) external {
        if (msg.sender != dungeonEngine && msg.sender != owner) revert Unauthorized();
        _mintItem(to, itemId, runId);
    }

    /**
     * @notice Batch mint items to multiple recipients (e.g. end-of-run distribution).
     * @param recipients  Array of agent owner wallets
     * @param itemIds     Corresponding item IDs
     * @param runId       Run ID for event tracking
     */
    function mintBatch(
        address[] calldata recipients,
        uint256[] calldata itemIds,
        uint256 runId
    ) external {
        if (msg.sender != dungeonEngine && msg.sender != owner) revert Unauthorized();
        if (recipients.length != itemIds.length) revert LengthMismatch();

        for (uint256 i = 0; i < recipients.length; i++) {
            _mintItem(recipients[i], itemIds[i], runId);
        }
    }

    function _mintItem(address to, uint256 itemId, uint256 runId) internal {
        if (itemId == 0 || itemId > MAX_ITEM_ID) revert InvalidItemId();

        ItemMeta storage meta = items[itemId];

        // Check max supply (0 = unlimited)
        if (meta.maxSupply > 0 && meta.minted >= meta.maxSupply) revert MaxSupplyReached();

        // Each wallet can hold max 1 of each item (soul-bound unique equip)
        if (_balances[to][itemId] > 0) revert AlreadyOwnsItem();

        _balances[to][itemId] = 1;
        meta.minted++;

        emit TransferSingle(msg.sender, address(0), to, itemId, 1);
        emit ItemMinted(to, itemId, meta.name, runId);
    }

    // ─── SOUL-BOUND: NO TRANSFERS ─────────────────────────────────────────────

    function safeTransferFrom(address, address, uint256, uint256, bytes calldata) external pure {
        revert SoulBound();
    }

    function safeBatchTransferFrom(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) external pure {
        revert SoulBound();
    }

    function setApprovalForAll(address, bool) external pure {
        revert SoulBound();
    }

    function isApprovedForAll(address, address) external pure returns (bool) {
        return false;
    }

    // ─── ERC-1155 VIEWS ──────────────────────────────────────────────────────

    function balanceOf(address account, uint256 id) external view returns (uint256) {
        return _balances[account][id];
    }

    function balanceOfBatch(
        address[] calldata accounts,
        uint256[] calldata ids
    ) external view returns (uint256[] memory balances) {
        if (accounts.length != ids.length) revert LengthMismatch();
        balances = new uint256[](accounts.length);
        for (uint256 i = 0; i < accounts.length; i++) {
            balances[i] = _balances[accounts[i]][ids[i]];
        }
    }

    function uri(uint256 id) external view returns (string memory) {
        return string(abi.encodePacked(_baseURI, _toString(id), ".json"));
    }

    // ─── ITEM INVENTORY ──────────────────────────────────────────────────────

    /**
     * @notice Return all items held by a wallet.
     * @param wallet  The agent owner wallet
     * @return ids    Item IDs held (1–11)
     * @return names  Item names
     * @return tiers  Item tiers (0=RARE, 1=LEGENDARY, 2=MYTHIC)
     */
    function getInventory(address wallet)
        external
        view
        returns (
            uint256[] memory ids,
            string[] memory names,
            uint8[]   memory tiers
        )
    {
        uint256 count;
        for (uint256 i = 1; i <= MAX_ITEM_ID; i++) {
            if (_balances[wallet][i] > 0) count++;
        }

        ids   = new uint256[](count);
        names = new string[](count);
        tiers = new uint8[](count);

        uint256 idx;
        for (uint256 i = 1; i <= MAX_ITEM_ID; i++) {
            if (_balances[wallet][i] > 0) {
                ids[idx]   = i;
                names[idx] = items[i].name;
                tiers[idx] = uint8(items[i].tier);
                idx++;
            }
        }
    }

    /**
     * @notice Return stat bonuses for a wallet (sum of all held items).
     *         Returned as (atkBonus, defBonus, magBonus, spdBonus).
     *         Engine reads this to apply multipliers before each run.
     */
    function getStatBonuses(address wallet)
        external
        view
        returns (
            int256 atkBonus,
            int256 defBonus,
            int256 magBonus,
            int256 spdBonus
        )
    {
        if (_balances[wallet][MOONBLADE]        > 0) atkBonus += 5;
        if (_balances[wallet][SHADOWCLOAK]      > 0) spdBonus += 4;
        if (_balances[wallet][SERPENT_RING]     > 0) { atkBonus += 3; spdBonus += 3; }
        if (_balances[wallet][IRONVEIL_HELM]    > 0) defBonus += 6;
        if (_balances[wallet][STAFF_OF_ECHOES]  > 0) magBonus += 8;
        if (_balances[wallet][AEGIS_OF_FALLEN]  > 0) {} // handled in engine as special modifier
        if (_balances[wallet][DEATHWHISPER_BOW] > 0) atkBonus += 8;
        if (_balances[wallet][VOIDSTEP_BOOTS]   > 0) spdBonus += 6;
        if (_balances[wallet][THE_VOID_SHARD]   > 0) atkBonus += 15;
        if (_balances[wallet][CROWN_OF_MALACHAR]> 0) magBonus += 10;
        if (_balances[wallet][HOLLOW_KING_SEAL] > 0) {} // handled in engine as special modifier
    }

    // ─── SUPPLY VIEWS ────────────────────────────────────────────────────────

    function getItemMeta(uint256 itemId) external view returns (ItemMeta memory) {
        if (itemId == 0 || itemId > MAX_ITEM_ID) revert InvalidItemId();
        return items[itemId];
    }

    function getRarityBreakdown() external view returns (
        uint256 rareMinted,
        uint256 legendaryMinted,
        uint256 mythicMinted,
        uint256 totalMinted
    ) {
        for (uint256 i = 1; i <= MAX_ITEM_ID; i++) {
            uint256 m = items[i].minted;
            totalMinted += m;
            if (items[i].tier == Tier.RARE)      rareMinted      += m;
            if (items[i].tier == Tier.LEGENDARY) legendaryMinted += m;
            if (items[i].tier == Tier.MYTHIC)    mythicMinted    += m;
        }
    }

    // ─── ERC-165 ─────────────────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0xd9b67a26 || // ERC-1155
            interfaceId == 0x0e89341c || // ERC-1155 Metadata URI
            interfaceId == 0x01ffc9a7;   // ERC-165
    }

    // ─── ADMIN ───────────────────────────────────────────────────────────────

    function setEngine(address _engine) external {
        if (msg.sender != owner) revert Unauthorized();
        dungeonEngine = _engine;
        emit EngineUpdated(_engine);
    }

    function setBaseURI(string calldata baseURI_) external {
        if (msg.sender != owner) revert Unauthorized();
        _baseURI = baseURI_;
    }

    function setOwner(address _owner) external {
        if (msg.sender != owner) revert Unauthorized();
        owner = _owner;
    }

    // ─── UTILS ───────────────────────────────────────────────────────────────

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
