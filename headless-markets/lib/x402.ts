// Issue #358 — Wire x402 HTTP payment standard into headless-markets API routes
// Builder A — Build #77 — 2026-03-03 02:00 UTC
// File: headless-markets/lib/x402.ts
// Mirrors the x402 middleware from server.js — adapted for Next.js API routes
// Free tier default during launch. Paid tier enforced when on-chain verification is live.

import { NextRequest, NextResponse } from 'next/server';

// ── x402 Payment Config ──────────────────────────────────────────────────────
const X402_PAYMENT_ADDRESS = '0xe5e3A48862E241A4b5Fb526cC050b830FBA29';
const X402_PAYMENT_AMOUNT  = '0.001';
const X402_PAYMENT_ASSET   = 'USDC';
const X402_PAYMENT_NETWORK = 'base-mainnet';
const X402_PAYMENT_VERSION = '1';

export interface X402Headers {
  'X-Payment-Required': string;
  'X-Payment-Network': string;
  'X-Payment-Address': string;
  'X-Payment-Asset': string;
}

export function buildX402Headers(endpoint: string): X402Headers {
  return {
    'X-Payment-Required': JSON.stringify({
      version:  X402_PAYMENT_VERSION,
      network:  X402_PAYMENT_NETWORK,
      asset:    X402_PAYMENT_ASSET,
      amount:   X402_PAYMENT_AMOUNT,
      address:  X402_PAYMENT_ADDRESS,
      memo:     'nullpriest agent registry access',
      endpoint,
    }),
    'X-Payment-Network':  X402_PAYMENT_NETWORK,
    'X-Payment-Address':  X402_PAYMENT_ADDRESS,
    'X-Payment-Asset':    `${X402_PAYMENT_ASSET}:${X402_PAYMENT_AMOUNT}`,
  };
}

export function x402Middleware(
  req: NextRequest,
  endpoint: string
): { headers: X402Headers; blocked: false } | { response: NextResponse; blocked: true } {
  const paymentHeader = req.headers.get('x-payment');
  const tierHeader    = req.headers.get('x-payment-tier');
  const x402Headers   = buildX402Headers(endpoint);

  if (paymentHeader) {
    return { headers: x402Headers, blocked: false };
  }

  if (!tierHeader || tierHeader === 'free') {
    return { headers: x402Headers, blocked: false };
  }

  const res = NextResponse.json(
    {
      error:    'Payment Required',
      protocol: 'x402',
      version:  X402_PAYMENT_VERSION,
      network:  X402_PAYMENT_NETWORK,
      asset:    X402_PAYMENT_ASSET,
      amount:   X402_PAYMENT_AMOUNT,
      address:  X402_PAYMENT_ADDRESS,
      memo:     'nullpriest agent registry access — send USDC on Base then retry with X-Payment header',
      docs:     'https://nullpriest.xyz/api/x402',
    },
    { status: 402 }
  );

  Object.entries(x402Headers).forEach(([k, v]) => res.headers.set(k, v));
  return { response: res, blocked: true };
}

export function attachX402Headers(res: NextResponse, endpoint: string): NextResponse {
  const headers = buildX402Headers(endpoint);
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}
