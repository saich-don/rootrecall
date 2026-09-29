// ============================================================
// Server-side Hindsight recall endpoint
// Uses official @vectorize-io/hindsight-client SDK.
// RecallResponse = { results: Array<RecallResult>, ... }
// Each RecallResult has a `text: string` field.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { bankName, query, config } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ results: [], items: [] });
    }

    const apiKey = config?.hindsight?.apiKey || process.env.HINDSIGHT_API_KEY;
    const bank =
      bankName ||
      config?.hindsight?.bankName ||
      process.env.HINDSIGHT_BANK_ID ||
      process.env.HINDSIGHT_BANK ||
      'rootrecall-incidents';

    if (!apiKey) {
      return NextResponse.json({ results: [], items: [], reason: 'not-configured' });
    }

    const { HindsightClient } = await import('@vectorize-io/hindsight-client');
    const client = new HindsightClient({
      baseUrl: config?.hindsight?.baseUrl || process.env.HINDSIGHT_BASE_URL || 'https://api.hindsight.vectorize.io',
      apiKey,
    });

    const recallResponse = await client.recall(bank, query, { budget: 'mid' });
    const rawResults = recallResponse.results ?? [];
    const results: string[] = rawResults.map((r: { text?: string }) => r.text || '');

    return NextResponse.json({
      results,
      items: rawResults,
      bank,
    });
  } catch (err: any) {
    console.error('[/api/memory/recall]', err);
    return NextResponse.json(
      { results: [], items: [], error: err.message || String(err) },
      { status: 500 }
    );
  }
}
