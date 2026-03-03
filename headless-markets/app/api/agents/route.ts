// Issue #358 — Wire x402 into headless-markets /api/agents route
// Builder A — Build #77 — 2026-03-03 02:00 UTC
// File: headless-markets/app/api/agents/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { x402Middleware, attachX402Headers } from '@/lib/x402';

const NULLPRIEST_API = process.env.NULLPRIEST_API_URL ?? 'https://nullpriest.xyz';

export async function GET(req: NextRequest) {
  const gate = x402Middleware(req, '/api/agents');
  if (gate.blocked) return gate.response;

  try {
    const upstream = await fetch(`${NULLPRIEST_API}/api/agents`, {
      headers: { 'x-payment-tier': 'free', 'Accept': 'application/json' },
      next: { revalidate: 60 },
    });

    if (!upstream.ok) {
      const err = NextResponse.json(
        { error: 'upstream error', status: upstream.status },
        { status: upstream.status }
      );
      return attachX402Headers(err, '/api/agents');
    }

    const data = await upstream.json();
    const res = NextResponse.json(data);
    return attachX402Headers(res, '/api/agents');
  } catch (e) {
    const err = NextResponse.json(
      { error: 'fetch failed', detail: String(e) },
      { status: 502 }
    );
    return attachX402Headers(err, '/api/agents');
  }
}
