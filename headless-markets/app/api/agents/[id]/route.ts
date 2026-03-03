// Issue #61 — Agent profile page at /app/agents/[id]
// Builder A — Build #93 — 2026-03-03 19:05 UTC

import { NextRequest, NextResponse } from 'next/server';
import { x402Middleware, attachX402Headers } from '@/lib/x402';

const NULLPRIEST_API = process.env.NULLPRIEST_API_URL ?? 'https://nullpriest.xyz';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const gate = x402Middleware(req, `/api/agents/${id}`);
  if (gate.blocked) return gate.response;

  try {
    const upstream = await fetch(`${NULLPRIEST_API}/api/agents/${id}`, {
      headers: { 'x-payment-tier': 'free', 'Accept': 'application/json' },
      next: { revalidate: 60 },
    });
    if (!upstream.ok) {
      return attachX402Headers(
        NextResponse.json(
          { error: 'agent not found', id },
          { status: upstream.status }
        ),
        `/api/agents/${id}`
      );
    }
    return attachX402Headers(
      NextResponse.json(await upstream.json()),
      `/api/agents/${id}`
    );
  } catch (e) {
    return attachX402Headers(
      NextResponse.json({ error: 'fetch failed', detail: String(e) }, { status: 502 }),
      `/api/agents/${id}`
    );
  }
}