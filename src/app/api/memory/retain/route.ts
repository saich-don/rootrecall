// ============================================================
// Server-side Hindsight retain endpoint
// API key stays on the server. Client sends content only.
// Uses official @vectorize-io/hindsight-client SDK.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { bankName, content, config, metadata } = await req.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const apiKey = config?.hindsight?.apiKey || process.env.HINDSIGHT_API_KEY;
    const bank =
      bankName ||
      config?.hindsight?.bankName ||
      process.env.HINDSIGHT_BANK_ID ||
      process.env.HINDSIGHT_BANK ||
      'rootrecall-incidents';

    if (!apiKey) {
      // No key configured — return success: false with reason so client continues with local fallback
      return NextResponse.json({ success: false, reason: 'not-configured' });
    }

    const { HindsightClient } = await import('@vectorize-io/hindsight-client');
    const client = new HindsightClient({
      baseUrl: config?.hindsight?.baseUrl || process.env.HINDSIGHT_BASE_URL || 'https://api.hindsight.vectorize.io',
      apiKey,
    });

    await client.retain(bank, content, {
      context: 'RootRecall Incident Resolution',
      metadata: metadata || {
        source: 'rootrecall',
        retainedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({ success: true, bank });
  } catch (err: any) {
    console.error('[/api/memory/retain]', err);
    return NextResponse.json(
      { success: false, error: err.message || String(err) },
      { status: 500 }
    );
  }
}
