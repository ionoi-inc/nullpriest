/**
 * x402.ts — HTTP 402 Payment Required middleware utilities for headless-markets
 *
 * x402 is the emerging agent-to-agent payment standard on Base.
 * When an agent calls a paid API endpoint, the server responds with 402 +
 * a payment payload. The agent pays on-chain, attaches proof, retries.
 *
 * Spec: https://x402.org
 * Stack: x402 + Base L2 + verified agents
 */

import { createPublicClient, http, parseEther, formatEther } from 'viem';
import { base } from 'viem/chains';

// ── Constants ──────────────────────────────────────────────────────────────

/** Receiver address for x402 payments (nullpriest protocol treasury) */
export const X402_RECEIVER = process.env.X402_RECEIVER_ADDRESS as `0x${string}` | undefined;

/** Minimum payment amounts per endpoint tier (in ETH) */
export const X402_PRICES = {
  /** Free tier — no payment required */
  free: '0',
  /** Micro tier — agent reads, proposals, discovery */
  micro: '0.0001',
  /** Standard tier — agent votes, quorum participation */
  standard: '0.001',
  /** Premium tier — token launch, bonding curve ops */
  premium: '0.01',
} as const;

export type X402Tier = keyof typeof X402_PRICES;

// ── Payment Payload ────────────────────────────────────────────────────────

export interface X402PaymentPayload {
  /** Version of the x402 spec */
  version: '1';
  /** Chain ID where payment must be made */
  chainId: number;
  /** Address that must receive the payment */
  receiver: string;
  /** Required payment amount in wei (as hex string) */
  amount: string;
  /** Endpoint this payment is for */
  resource: string;
  /** Unix timestamp after which this payload expires */
  expiresAt: number;
  /** Optional: token address (null = native ETH) */
  token: string | null;
}

/**
 * Build a 402 payment payload for a given endpoint and tier.
 */
export function buildPaymentPayload(resource: string, tier: X402Tier): X402PaymentPayload {
  const priceEth = X402_PRICES[tier];
  const amountWei = parseEther(priceEth);

  return {
    version: '1',
    chainId: 8453, // Base mainnet
    receiver: X402_RECEIVER ?? '0x0000000000000000000000000000000000000000',
    amount: `0x${amountWei.toString(16)}`,
    resource,
    expiresAt: Math.floor(Date.now() / 1000) + 300, // 5-minute window
    token: null, // native ETH
  };
}

// ── Payment Verification ───────────────────────────────────────────────────

export interface X402PaymentProof {
  /** Transaction hash of the payment on Base */
  txHash: `0x${string}`;
  /** Chain ID where payment was made */
  chainId: number;
}

const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org'),
});

/**
 * Verify an x402 payment proof against expected receiver + amount.
 * Returns true if the tx is confirmed, sent to the right address, with enough value.
 */
export async function verifyPayment(
  proof: X402PaymentProof,
  expectedReceiver: string,
  expectedAmountEth: string
): Promise<{ valid: boolean; reason?: string }> {
  // In development / when receiver not configured, skip verification
  if (!X402_RECEIVER) {
    console.warn('[x402] X402_RECEIVER_ADDRESS not set — skipping payment verification (dev mode)');
    return { valid: true };
  }

  try {
    const tx = await publicClient.getTransaction({ hash: proof.txHash });

    if (!tx) {
      return { valid: false, reason: 'Transaction not found on Base' };
    }

    if (tx.to?.toLowerCase() !== expectedReceiver.toLowerCase()) {
      return { valid: false, reason: `Payment sent to wrong address: ${tx.to}` };
    }

    const expectedWei = parseEther(expectedAmountEth);
    if (tx.value < expectedWei) {
      return {
        valid: false,
        reason: `Insufficient payment: got ${formatEther(tx.value)} ETH, need ${expectedAmountEth} ETH`,
      };
    }

    if (proof.chainId !== 8453) {
      return { valid: false, reason: `Wrong chain: expected Base (8453), got ${proof.chainId}` };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, reason: `Verification error: ${(err as Error).message}` };
  }
}

// ── Response Helpers ───────────────────────────────────────────────────────

/**
 * Parse the X-Payment header from an incoming request.
 * Header format: X-Payment: {"txHash":"0x...","chainId":8453}
 */
export function parsePaymentHeader(request: Request): X402PaymentProof | null {
  const header = request.headers.get('X-Payment');
  if (!header) return null;

  try {
    const parsed = JSON.parse(header);
    if (!parsed.txHash || !parsed.chainId) return null;
    return parsed as X402PaymentProof;
  } catch {
    return null;
  }
}

/**
 * Build the JSON body for a 402 response.
 */
export function build402Body(resource: string, tier: X402Tier) {
  return {
    error: 'Payment Required',
    x402: buildPaymentPayload(resource, tier),
    instructions:
      'Send the required ETH to the receiver address on Base, then retry with the tx hash in the X-Payment header: {"txHash":"0x...","chainId":8453}',
  };
}
