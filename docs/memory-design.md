# Memory Design

## Core Principle

> "An AI agent becomes genuinely useful when it remembers what happened before."

RootRecall treats memory as a first-class product feature, not a hidden implementation detail. Memory is visible, browsable, and central to the user experience.

## What Gets Remembered

When an incident is resolved, RootRecall retains:

| Field | Purpose |
|-------|---------|
| `sourceIncidentId` | Trace back to the original incident |
| `sourceIncidentTitle` | Human-readable reference |
| `service` | Service-level grouping |
| `keywords` | Fast local matching |
| `rootCause` | The actual cause (most valuable) |
| `resolution` | How it was fixed |
| `lessonsLearned` | Preventive knowledge |
| `severity` | Impact context |

## Retain Format

Memories are sent to Hindsight as structured text:

```
INCIDENT: INC-0971 — Payment API 502 after deployment
SERVICE: payment-api
SEVERITY: SEV-2
DESCRIPTION: Payment API started returning intermittent HTTP 502 errors...
SYMPTOMS: HTTP 502 errors; Connection pool saturation; Increased p99 latency
ROOT CAUSE: Deployment v2.14.3 reduced connection pool from 200 to 50...
RESOLUTION: Rolled back deployment, restored pool config...
LESSONS LEARNED: Check connection pool metrics after deployment; Add pool utilization to canary
KEYWORDS: payment-api, 502, connection-pool, deployment
```

## Recall Strategy

When recalling memories for a new incident, RootRecall queries with:

```
Service: payment-api
Description: Payment API returning HTTP 502 errors after deployment...
Symptoms: HTTP 502 errors, connection pool saturation...
Looking for: similar incidents, root causes, resolutions, lessons learned
```

## Similarity Scoring (Local Fallback)

When Hindsight is unavailable, local similarity uses:

| Signal | Weight | Description |
|--------|--------|-------------|
| Service match | +40 | Same service is a strong signal |
| Keyword overlap | +10 each | Shared keywords (502, timeout, etc.) |
| Text overlap | +3 each word | Common significant words (>3 chars) |

Thresholds:
- **High similarity**: score ≥ 50
- **Medium similarity**: score ≥ 30
- **Low similarity**: score ≥ 20

## Memory Lifecycle

```
Incident Created
    ↓
Agent Recalls Memories ← Hindsight recall()
    ↓
Memory-Informed Analysis
    ↓
Incident Resolved (root cause + resolution + lessons)
    ↓
Memory Retained → Hindsight retain()
    ↓
Available for Future Recall
```

## MemoryService API

```typescript
class MemoryService {
  // Store knowledge from a resolved incident
  retainIncident(incident: Incident): Promise<MemoryEntry>

  // Find relevant memories for a new incident
  recallForIncident(incident: Incident): Promise<RecalledMemory[]>

  // Get all stored memories
  getAllMemories(): MemoryEntry[]

  // Load seed memories
  loadMemories(memories: MemoryEntry[]): void

  // Clear all memories (demo reset)
  clearMemories(): void
}
```

## Hindsight Integration

The `MemoryService` uses `@vectorize-io/hindsight-client`:

```typescript
import { HindsightClient } from '@vectorize-io/hindsight-client';

const client = new HindsightClient({
  baseUrl: 'https://hindsight.vectorize.io'
});

// Retain
await client.retain(bankName, structuredText);

// Recall
const results = await client.recall(bankName, query);
```

When Hindsight is unavailable, the local fallback ensures the app continues to function.
