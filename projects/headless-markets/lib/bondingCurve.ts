/**
 * bondingCurve.ts — headless-markets bonding curve math utilities
 * Issue #53: bonding curve contract interactions
 *
 * Linear bonding curve: price(supply) = INITIAL_PRICE + (SLOPE * supply)
 * Fund split on buy: 30% quorum pool, 60% bonding pool, 10% protocol fee
 * Graduation target: 10 ETH market cap → auto-deploy to Uniswap V2
 */

import { parseEther, formatEther } from 'viem';

// ── Constants ────────────────────────────────────────────────────────────────
export const INITIAL_PRICE   = 0.001;   // ETH per token at supply = 0
export const SLOPE           = 0.0001;  // ETH price increase per token
export const GRADUATION_CAP  = 10;      // ETH market cap target
export const PROTOCOL_FEE    = 0.10;    // 10% to nullpriest
export const BONDING_POOL    = 0.60;    // 60% liquidity
export const QUORUM_POOL     = 0.30;    // 30% locked until graduation

// ── Price math ───────────────────────────────────────────────────────────────

/** Current token price in ETH given current supply */
export function spotPrice(supply: number): number {
  return INITIAL_PRICE + SLOPE * supply;
}

/**
 * Cost in ETH to buy `amount` tokens from current `supply`
 * Integral of price curve from supply to supply+amount
 * = initial_price*amount + slope * (supply*amount + amount*(amount-1)/2)
 */
export function buyQuote(supply: number, amount: number): number {
  return INITIAL_PRICE * amount + SLOPE * (supply * amount + (amount * (amount - 1)) / 2);
}

/**
 * ETH returned from selling `amount` tokens at current `supply`
 * Integral from supply-amount to supply
 */
export function sellQuote(supply: number, amount: number): number {
  const newSupply = supply - amount;
  if (newSupply < 0) throw new Error('Insufficient supply');
  return buyQuote(newSupply, amount);
}

/** Market cap in ETH = spot price * total supply */
export function marketCap(supply: number): number {
  return spotPrice(supply) * supply;
}

/** Graduation progress 0–1 */
export function graduationProgress(supply: number): number {
  return Math.min(marketCap(supply) / GRADUATION_CAP, 1);
}

/** ETH split for a buy of `ethIn` */
export function splitFunds(ethIn: number): {
  quorumPool: number;
  bondingPool: number;
  protocolFee: number;
} {
  return {
    quorumPool:  ethIn * QUORUM_POOL,
    bondingPool: ethIn * BONDING_POOL,
    protocolFee: ethIn * PROTOCOL_FEE,
  };
}

/** Tokens received for `ethIn` ETH at current `supply` (quadratic formula) */
export function tokensForEth(supply: number, ethIn: number): number {
  const a = SLOPE / 2;
  const b = INITIAL_PRICE + SLOPE * supply;
  const c = -ethIn;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) throw new Error('No real solution');
  return (-b + Math.sqrt(discriminant)) / (2 * a);
}

// ── Formatting helpers ────────────────────────────────────────────────────────

export function fmtEth(eth: number, decimals = 4): string {
  return eth.toFixed(decimals) + ' ETH';
}

export function fmtTokens(n: number): string {
  return n >= 1_000_000
    ? (n / 1_000_000).toFixed(2) + 'M'
    : n >= 1_000
    ? (n / 1_000).toFixed(2) + 'K'
    : n.toFixed(0);
}

export function fmtUsd(eth: number, ethPrice = 3400): string {
  const usd = eth * ethPrice;
  return '$' + usd.toLocaleString('en-US', { maximumFractionDigits: 2 });
}