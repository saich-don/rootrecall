// ============================================================
// Server-side LLM analyze endpoint
// API keys never exposed to client.
// Supports multi-turn conversation context + Hindsight recall.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import type {
  Incident,
  RecalledMemory,
  AgentResponse,
} from '@/lib/types';

function buildLLMPrompt(
  incident: Incident,
  memories: RecalledMemory[],
  userQuery?: string,
  conversationHistory?: Array<{ role: string; content: string }>
): string {
  const memoryContext =
    memories.length > 0
      ? memories
          .map((m: any) => {
            const mem = m.memory || m;
            const incId = mem.sourceIncidentId || mem.incidentId || mem.id || 'INC-HISTORICAL';
            const title = mem.sourceIncidentTitle || mem.title || mem.service || '';
            const rootCause = mem.rootCause || mem.summary || '';
            const resolution = mem.resolution || '';
            const lessons = Array.isArray(mem.lessonsLearned)
              ? mem.lessonsLearned.join('; ')
              : Array.isArray(mem.lessons)
              ? mem.lessons.join('; ')
              : '';
            const similarity = m.similarity || m.score || 'relevant';
            const reason = m.relevanceReason || m.reason || 'Semantic match';
            return (
              `Historical Incident: ${incId}${title ? ` - ${title}` : ''}\n` +
              (rootCause ? `Root Cause: ${rootCause}\n` : '') +
              (resolution ? `Resolution: ${resolution}\n` : '') +
              (lessons ? `Lessons Learned: ${lessons}\n` : '') +
              `Relevance/Similarity: ${similarity} (${reason})`
            );
          })
          .join('\n\n')
      : 'No relevant historical memories found in Hindsight organizational memory.';

  const historyContext =
    conversationHistory && conversationHistory.length > 0
      ? conversationHistory
          .slice(-6)
          .map((m) => `${m.role === 'user' ? 'Engineer' : 'RootRecall Agent'}: ${m.content}`)
          .join('\n\n')
      : '';

  return `You are RootRecall, an AI incident-response memory agent for DevOps and software engineers.
Core principle: "Don't solve the same incident from scratch twice."
You have access to current incident data AND persistent organizational memory recalled through Hindsight.

CURRENT INCIDENT:
ID: ${incident.id}
Title: ${incident.title}
Service: ${incident.service}
Severity: ${incident.severity}
Status: ${incident.status}
Description: ${incident.description}
Symptoms: ${incident.symptoms.join('; ')}
Logs: ${incident.logs.slice(0, 3).map((l) => `[${l.level.toUpperCase()}] ${l.message}`).join('\n')}

HISTORICAL MEMORY (Recalled via Hindsight):
${memoryContext}

${historyContext ? `PRIOR CONVERSATION CONTEXT:\n${historyContext}\n` : ''}

CURRENT USER QUESTION:
${userQuery || 'Initial incident analysis: Assess likely causes, triage steps, and diagnostic commands.'}

CRITICAL INSTRUCTIONS:
1. Always maintain multi-turn conversational coherence with the prior turns.
2. If Hindsight recalled historical memory (especially high-similarity incidents like INC-0971):
   - Explicitly cite the historical incident ID, what root cause occurred previously, and what lessons/resolutions worked.
   - Ground your recommendations in previous lessons learned.
3. If no historical memory exists:
   - Provide standard methodical incident response investigation based on reported symptoms.
   - Note that no historical precedent was found in organizational memory.
4. Distinguish between current symptoms, historical evidence, and recommendations.
5. Provide actionable, read-only diagnostic commands (e.g. kubectl, sql queries, curl).

Respond ONLY with a valid JSON object matching this exact schema (no markdown formatting, no text before or after):
{
  "assessment": {
    "summary": "Direct, conversational, insightful answer to the user query referencing memory if available",
    "likelyCauses": ["Root cause hypothesis 1", "Root cause hypothesis 2"],
    "confidence": "high" | "medium" | "low"
  },
  "historicalEvidence": [
    {
      "incidentId": "INC-XXXX",
      "incidentTitle": "Title of recalled incident",
      "rootCause": "Root cause from memory",
      "relevance": "Why this historical incident matters to the current failure",
      "similarity": "high" | "medium" | "low"
    }
  ],
  "recommendations": [
    {
      "step": "Specific diagnostic or mitigation step",
      "rationale": "Why to take this step",
      "priority": "high" | "medium" | "low"
    }
  ],
  "suggestedCommands": [
    "kubectl command or query"
  ],
  "disclaimer": "Historical evidence suggests patterns but does not guarantee identical root cause.",
  "generatedAt": "${new Date().toISOString()}",
  "memoryInfluenced": ${memories.length > 0}
}`;
}

async function callLLM(
  prompt: string,
  provider: string,
  model: string,
  apiKey: string,
  baseUrl: string
): Promise<string> {
  switch (provider) {
    case 'openai': {
      const url = baseUrl || 'https://api.openai.com/v1/chat/completions';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `OpenAI error: ${res.statusText}`);
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    }

    case 'anthropic': {
      const url = baseUrl || 'https://api.anthropic.com/v1/messages';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model || 'claude-3-5-sonnet-20241022',
          max_tokens: 2500,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Anthropic error: ${res.statusText}`);
      }
      const data = await res.json();
      return data.content?.[0]?.text || '';
    }

    case 'google': {
      const preferred = model || 'gemini-3.7-flash';
      const candidateModels = Array.from(
        new Set([
          'gemini-flash-latest',
          preferred,
          'gemini-3.7-flash',
          'gemini-3.6-flash',
          'gemini-3.5-flash',
          'gemma-4-31b-it',
        ])
      );

      let lastError = 'Google API error';
      for (const m of candidateModels) {
        try {
          const url =
            baseUrl ||
            `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.2,
                responseMimeType: 'application/json',
              },
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) return text;
          } else {
            const err = await res.json().catch(() => ({}));
            lastError = err.error?.message || `Google API error (${m}): ${res.statusText}`;
          }
        } catch (e: any) {
          lastError = e.message || String(e);
        }
      }
      throw new Error(lastError);
    }

    case 'ollama': {
      const url = baseUrl || 'http://localhost:11434/api/generate';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || 'llama3.2',
          prompt,
          stream: false,
          format: 'json',
        }),
      });
      if (!res.ok) {
        throw new Error(`Ollama error: ${res.statusText}`);
      }
      const data = await res.json();
      return data.response || '';
    }

    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

function cleanJson(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

export async function POST(req: NextRequest) {
  try {
    const { incident, memories, userQuery, config, conversationHistory } = await req.json();

    const provider =
      config?.llm?.provider ||
      process.env.LLM_PROVIDER ||
      (process.env.OPENAI_API_KEY ? 'openai' : '') ||
      (process.env.ANTHROPIC_API_KEY ? 'anthropic' : '') ||
      (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY ? 'google' : '') ||
      'mock';

    const apiKey =
      config?.llm?.apiKey ||
      process.env.LLM_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_API_KEY ||
      '';

    const model = config?.llm?.model || process.env.LLM_MODEL || '';
    const baseUrl = config?.llm?.baseUrl || process.env.LLM_BASE_URL || '';

    // If no provider/key is configured, return 422 so client cleanly uses deterministic fallback
    if (!apiKey && provider !== 'ollama') {
      return NextResponse.json({ error: 'llm-not-configured' }, { status: 422 });
    }

    const prompt = buildLLMPrompt(incident, memories, userQuery, conversationHistory);
    const rawText = await callLLM(prompt, provider, model, apiKey, baseUrl);

    let parsed: AgentResponse;
    try {
      parsed = JSON.parse(cleanJson(rawText));
    } catch {
      return NextResponse.json({ error: 'parse-failed', raw: rawText }, { status: 422 });
    }

    // Ensure shape guarantees
    parsed.memoryInfluenced = (memories && memories.length > 0) || false;
    parsed.generatedAt = new Date().toISOString();
    if (!parsed.assessment) {
      parsed.assessment = { summary: 'Analysis completed.', likelyCauses: [], confidence: 'medium' };
    }
    if (!Array.isArray(parsed.assessment.likelyCauses)) parsed.assessment.likelyCauses = [];
    if (!Array.isArray(parsed.recommendations)) parsed.recommendations = [];
    if (!Array.isArray(parsed.suggestedCommands)) parsed.suggestedCommands = [];
    if (!Array.isArray(parsed.historicalEvidence)) parsed.historicalEvidence = [];

    return NextResponse.json({ response: parsed, provider, model });
  } catch (err: any) {
    console.error('[/api/analyze]', err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
