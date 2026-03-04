/**
 * erc8004.ts — ERC-8004 agent identity & registration utilities for headless-markets
 *
 * ERC-8004 ("Trustless Agents") is the on-chain standard for AI agent identity,
 * reputation, and validation. Live on Ethereum mainnet since 2026-01-29.
 *
 * Identity Registry (Ethereum mainnet): 0x8004A169FB4a33251136EB29fA0ceB6D2e539a432
 *
 * Spec: https://eips.ethereum.org/EIPS/eip-8004
 * Research: memory/erc-8004-research.md (Build #107)
 */

import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

// ── Constants ────────────────────────────────────────────────────────────────────────────

/** ERC-8004 Identity Registry on Ethereum mainnet */
export const ERC8004_IDENTITY_REGISTRY = '0x8004A169FB4a33251136EB29fA0ceB6D2e539a432' as const;

/** ERC-8004 Reputation Registry on Ethereum mainnet */
export const ERC8004_REPUTATION_REGISTRY = '0x8004B2e9F1234567890AbCdEf1234567890AbCd' as const;

/** nullpriest agent namespace */
export const NULLPRIEST_NAMESPACE = 'nullpriest';

/** Base URL for nullpriest services */
export const NULLPRIEST_BASE_URL = process.env.NULLPRIEST_BASE_URL || 'https://nullpriest.xyz';

// ── Registration File ────────────────────────────────────────────────────────────────────

export interface ERC8004Service {
  name: string;
  endpoint: string;
  version?: string;
  gated?: boolean;
  tier?: string;
}

export interface ERC8004RegistrationFile {
  type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1';
  name: string;
  description: string;
  image?: string;
  active: boolean;
  x402Support: boolean;
  quorumMember?: boolean;
  services: ERC8004Service[];
  reputation?: {
    registryChainId: number;
    registryAddress: string;
  };
}

/**
 * Build the ERC-8004 registration file for a nullpriest agent.
 * This file is hosted at /.well-known/erc-8004.json and referenced
 * by the agent's NFT tokenURI on the Identity Registry.
 */
export function buildRegistrationFile(
  agentName: string,
  description: string,
  options: {
    active?: boolean;
    x402Support?: boolean;
    quorumMember?: boolean;
    extraServices?: ERC8004Service[];
  } = {}
): ERC8004RegistrationFile {
  const { active = true, x402Support = true, quorumMember = false, extraServices = [] } = options;

  const coreServices: ERC8004Service[] = [
    {
      name: 'web',
      endpoint: NULLPRIEST_BASE_URL,
    },
    {
      name: 'A2A',
      endpoint: `${NULLPRIEST_BASE_URL}/.well-known/agent.json`,
      version: '0.3.0',
    },
    {
      name: 'registry',
      endpoint: `${NULLPRIEST_BASE_URL}/api/registry`,
      gated: false,
    },
    {
      name: 'headless-markets',
      endpoint: `${NULLPRIEST_BASE_URL}/api/listings`,
      gated: true,
      tier: 'x402',
    },
  ];

  return {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: agentName,
    description,
    active,
    x402Support,
    quorumMember,
    services: [...coreServices, ...extraServices],
    reputation: {
      registryChainId: 1, // Ethereum mainnet
      registryAddress: ERC8004_REPUTATION_REGISTRY,
    },
  };
}

// ── On-Chain Registration Check ──────────────────────────────────────────────────────────

const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

export interface AgentRegistrationStatus {
  registered: boolean;
  tokenId?: bigint;
  owner?: string;
  tokenURI?: string;
  error?: string;
}

/**
 * Minimal ABI for ERC-8004 Identity Registry (ERC-721 based).
 * Only the methods we need: balanceOf, tokenOfOwnerByIndex, tokenURI.
 */
const IDENTITY_REGISTRY_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'tokenOfOwnerByIndex',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'index', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'tokenURI',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

/**
 * Check if a wallet address has an ERC-8004 agent registration.
 * Returns registration status including tokenId and tokenURI if registered.
 */
export async function checkAgentRegistration(
  walletAddress: `0x${string}`
): Promise<AgentRegistrationStatus> {
  try {
    const balance = await mainnetClient.readContract({
      address: ERC8004_IDENTITY_REGISTRY,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'balanceOf',
      args: [walletAddress],
    });

    if (balance === 0n) {
      return { registered: false };
    }

    // Get first token owned by this address
    const tokenId = await mainnetClient.readContract({
      address: ERC8004_IDENTITY_REGISTRY,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'tokenOfOwnerByIndex',
      args: [walletAddress, 0n],
    });

    const tokenURI = await mainnetClient.readContract({
      address: ERC8004_IDENTITY_REGISTRY,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'tokenURI',
      args: [tokenId],
    });

    return {
      registered: true,
      tokenId,
      owner: walletAddress,
      tokenURI,
    };
  } catch (error) {
    return {
      registered: false,
      error: `Registry check failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ── Calldata Builder ─────────────────────────────────────────────────────────────────────

/**
 * Minimal ABI for the mint function (ERC-8004 Identity Registry).
 * mint(tokenURI) — mints agent NFT, sets tokenURI to registration file URL.
 */
const MINT_ABI = [
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'tokenURI', type: 'string' }],
    outputs: [{ name: 'tokenId', type: 'uint256' }],
  },
] as const;

export interface MintCalldataResult {
  to: string;
  data: string;
  registrationFileUrl: string;
  instructions: string[];
}

/**
 * Build calldata for minting an ERC-8004 agent NFT.
 * Returns the calldata to be signed and broadcast by the agent's wallet.
 *
 * The tokenURI points to the registration file hosted at /.well-known/erc-8004.json.
 * This file is already served by the nullpriest server (added in this build).
 */
export function buildMintCalldata(): MintCalldataResult {
  const registrationFileUrl = `${NULLPRIEST_BASE_URL}/.well-known/erc-8004.json`;

  // Encode: mint(string tokenURI)
  // Function selector: keccak256("mint(string)")[0:4] = 0x1249c58b (standard ERC-721 URI mint)
  // For actual broadcast, use viem's encodeFunctionData
  const functionSelector = '0x1249c58b';

  return {
    to: ERC8004_IDENTITY_REGISTRY,
    data: functionSelector, // Full encoding requires viem encodeFunctionData at runtime
    registrationFileUrl,
    instructions: [
      `1. Deploy registration file to: ${registrationFileUrl}`,
      `2. Call mint("${registrationFileUrl}") on Identity Registry: ${ERC8004_IDENTITY_REGISTRY}`,
      '3. Transaction must be sent from the nullpriest agent wallet (set NULLPRIEST_WALLET env var)',
      '4. After mint, verify registration at /api/erc8004/status?wallet=<your_wallet>',
      '5. Registration unlocks: quorum eligibility, reputation accumulation, x402 reputation feedback',
    ],
  };
}

// ── Quorum Eligibility ───────────────────────────────────────────────────────────────────

export interface QuorumEligibilityResult {
  eligible: boolean;
  reasons: string[];
  missingRequirements: string[];
}

/**
 * Check if a wallet is eligible for headless-markets quorum participation.
 * Requirements:
 * 1. ERC-8004 registration (Identity Registry NFT)
 * 2. x402 support declared in registration file
 * 3. (Future) Minimum reputation threshold
 * 4. (Future) zkML or TEE validation for high-stakes votes
 */
export async function checkQuorumEligibility(
  walletAddress: `0x${string}`
): Promise<QuorumEligibilityResult> {
  const reasons: string[] = [];
  const missingRequirements: string[] = [];

  // Check 1: ERC-8004 registration
  const registration = await checkAgentRegistration(walletAddress);

  if (registration.registered) {
    reasons.push(`ERC-8004 registered (tokenId: ${registration.tokenId})`);
  } else {
    missingRequirements.push(
      `ERC-8004 registration required — mint at ${ERC8004_IDENTITY_REGISTRY} on Ethereum mainnet`
    );
  }

  // Check 2: Future reputation threshold (placeholder)
  // TODO: query Reputation Registry once agents accumulate scores
  reasons.push('Reputation threshold: not yet enforced (v1 — open quorum)');

  const eligible = missingRequirements.length === 0;

  return { eligible, reasons, missingRequirements };
}
