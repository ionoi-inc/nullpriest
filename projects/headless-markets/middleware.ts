/**
 * middleware.ts — x402 payment gate for headless-markets API routes
 *
 * Intercepts requests to paid API endpoints.
 * - Free endpoints pass through immediately.
 * - Paid endpoints check for X-Payment header with Base tx proof.
 * - If missing or invalid → 402 with payment instructions.
 * - If valid → request proceeds.
 *
 * Payment tiers:
 *   /api/quorum/proposals  → free
 *   /api/quorum/vote       → standard (0.001 ETH per vote)
 *   /api/agents/*          → micro   (0.0001 ETH per read)
 *   /api/launch/*          → premium (0.01 ETH per launch op)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  X402Tier,
  X402_PRICES,
  X402_RECEIVER,
  build402Body,
  parsePaymentHeader,
  verifyPayment,
} from './lib/x402';

// ── Route Payment Map ──────────────────────────────────────────────────────

const PAYMENT_ROUTES: Array<{ pattern: RegExp; tier: X402Tier }> = [
  // Quorum proposals — free (read-only, encourage agent adoption)
  { pattern: /^\/api\/quorum\/proposals/, tier: 'free' },
  // Quorum voting — standard (agents pay per vote)
  { pattern: /^\/api\/quorum\/vote/, tier: 'standard' },
  // Agent discovery — micro (small friction to prevent scraping)
  { pattern: /^\/api\/agents/, tier: 'micro' },
  // Token launch ops — premium (high-value actions)
  { pattern: /^\/api\/launch/, tier: 'premium' },
];

function getTierForPath(pathname: string): X402Tier | null {
  for (const route of PAYMENT_ROUTES) {
    if (route.pattern.test(pathname)) return route.tier;
  }
  return null; // Not a managed route — pass through
}

// ── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only intercept API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const tier = getTierForPath(pathname);

  // Unmanaged API route — pass through
  if (tier === null) {
    return NextResponse.next();
  }

  // Free tier — no payment needed
  if (tier === 'free') {
    return NextResponse.next();
  }

  // Paid tier — check for payment proof
  const proof = parsePaymentHeader(request);

  if (!proof) {
    // No payment header — return 402 with instructions
    return NextResponse.json(build402Body(pathname, tier), { status: 402 });
  }

  // Verify payment on Base
  const expectedAmount = X402_PRICES[tier];
  const receiver = X402_RECEIVER ?? '0x0000000000000000000000000000000000000000';
  const result = await verifyPayment(proof, receiver, expectedAmount);

  if (!result.valid) {
    return NextResponse.json(
      {
        error: 'Payment verification failed',
        reason: result.reason,
        x402: build402Body(pathname, tier).x402,
      },
      { status: 402 }
    );
  }

  // Payment verified — add agent metadata header and proceed
  const response = NextResponse.next();
  response.headers.set('X-Payment-Verified', 'true');
  response.headers.set('X-Payment-Tier', tier);
  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
