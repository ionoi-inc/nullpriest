// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title INULP
 * @notice Interface for the NULP token on Base mainnet
 * @dev Extends IERC20 with burn functionality
 */
interface INULP is IERC20 {
    /**
     * @notice Burns tokens from the caller's balance
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) external;

    /**
     * @notice Burns tokens from a specified account (requires allowance)
     * @param account Account to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burnFrom(address account, uint256 amount) external;
}
