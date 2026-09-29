// ============================================================
// Server status endpoint — reveals which services are configured
// and provides safe live connectivity tests without exposing keys.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const hindsightConfigured = !!(
    process.env.HINDSIGHT_API_KEY && process.env.HINDSIGHT_API_KEY.trim().length > 5
  );

  const llmProvider = process.env.LLM_PROVIDER || 'mock';
  const llmConfigured = !!(
    (process.env.LLM_API_KEY && process.env.LLM_API_KEY.trim().length > 5) ||
    llmProvider === 'ollama'
  );

  return NextResponse.json({
    hindsight: {
      configured: hindsightConfigured,
      bank: process.env.HINDSIGHT_BANK_ID || process.env.HINDSIGHT_BANK || 'rootrecall-incidents',
      baseUrl: process.env.HINDSIGHT_BASE_URL || 'https://api.hindsight.vectorize.io',
    },
    llm: {
      configured: llmConfigured,
      provider: llmProvider,
      model: process.env.LLM_MODEL || '',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { target } = await req.json().catch(() => ({ target: 'all' }));

    const results: {
      hindsight?: { ok: boolean; message: string; version?: string };
      llm?: { ok: boolean; message: string };
    } = {};

    // 1. Test Hindsight
    if (target === 'hindsight' || target === 'all') {
      const apiKey = process.env.HINDSIGHT_API_KEY;
      const baseUrl = process.env.HINDSIGHT_BASE_URL || 'https://api.hindsight.vectorize.io';
      const bank = process.env.HINDSIGHT_BANK_ID || process.env.HINDSIGHT_BANK || 'rootrecall-incidents';

      if (!apiKey || apiKey.trim().length <= 5) {
        results.hindsight = {
          ok: false,
          message: 'Not connected — HINDSIGHT_API_KEY is not set in environment (using local fallback)',
        };
      } else {
        try {
          const { HindsightClient } = await import('@vectorize-io/hindsight-client');
          const client = new HindsightClient({ baseUrl, apiKey });
          const version = await client.getVersion();
          results.hindsight = {
            ok: true,
            version: version?.api_version || 'connected',
            message: `Connected to Hindsight Cloud (Bank: ${bank})`,
          };
        } catch (err: any) {
          results.hindsight = {
            ok: false,
            message: `Hindsight connection failed: ${err.message || String(err)}`,
          };
        }
      }
    }

    // 2. Test LLM
    if (target === 'llm' || target === 'all') {
      const provider = process.env.LLM_PROVIDER || 'mock';
      const apiKey = process.env.LLM_API_KEY || '';
      const model = process.env.LLM_MODEL || '';

      if (provider === 'mock' || (!apiKey && provider !== 'ollama')) {
        results.llm = {
          ok: false,
          message: 'Not connected — LLM_API_KEY is not set in environment (using deterministic fallback)',
        };
      } else {
        try {
          // Lightweight ping depending on provider
          if (provider === 'openai') {
            const res = await fetch('https://api.openai.com/v1/models', {
              headers: { Authorization: `Bearer ${apiKey}` },
            });
            if (res.ok) {
              results.llm = { ok: true, message: `Connected to OpenAI (${model || 'default'})` };
            } else {
              const err = await res.json().catch(() => ({}));
              results.llm = { ok: false, message: `OpenAI error: ${err.error?.message || res.statusText}` };
            }
          } else if (provider === 'anthropic') {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
              },
              body: JSON.stringify({
                model: model || 'claude-3-haiku-20240307',
                max_tokens: 5,
                messages: [{ role: 'user', content: 'ping' }],
              }),
            });
            if (res.ok) {
              results.llm = { ok: true, message: `Connected to Anthropic (${model || 'claude'})` };
            } else {
              const err = await res.json().catch(() => ({}));
              results.llm = { ok: false, message: `Anthropic error: ${err.error?.message || res.statusText}` };
            }
          } else if (provider === 'google') {
            const res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
            );
            if (res.ok) {
              results.llm = { ok: true, message: `Connected to Google Gemini (${model || 'gemini-2.0-flash'})` };
            } else {
              const err = await res.json().catch(() => ({}));
              results.llm = { ok: false, message: `Google error: ${err.error?.message || res.statusText}` };
            }
          } else if (provider === 'ollama') {
            const baseUrl = process.env.LLM_BASE_URL || 'http://localhost:11434';
            const res = await fetch(`${baseUrl}/api/tags`);
            if (res.ok) {
              results.llm = { ok: true, message: `Connected to Ollama at ${baseUrl}` };
            } else {
              results.llm = { ok: false, message: `Ollama error: ${res.statusText}` };
            }
          } else {
            results.llm = { ok: false, message: `Unsupported provider: ${provider}` };
          }
        } catch (err: any) {
          results.llm = { ok: false, message: `LLM connection error: ${err.message || String(err)}` };
        }
      }
    }

    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
