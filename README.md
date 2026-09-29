# RootRecall

> Your incident response agent that remembers what happened before.

RootRecall is an AI incident-response memory agent for software and DevOps engineers. It remembers production incidents — symptoms, logs, root causes, resolutions, and lessons learned — so when a similar incident happens later, your team gets contextual guidance instead of starting from scratch.

Built with [Hindsight](https://hindsight.vectorize.io/) by Vectorize for persistent semantic memory.

## The Problem

During production incidents, engineers repeatedly:
- Search through old tickets, Slack threads, and postmortems
- Try to remember how similar issues were solved months ago
- Lose time rediscovering the same root causes
- Make the same investigative mistakes

**The knowledge exists, but it's fragmented and hard to recall.**

## The Solution

RootRecall creates persistent organizational memory around incidents:

1. **Before Memory** — Generic troubleshooting guidance
2. **With Memory** — Historical evidence + contextual investigation steps
3. **Accumulated Learning** — Growing knowledge base from every resolved incident

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  RootRecall UI                   │
│  Dashboard · Incidents · Agent Chat · Memory    │
│            Demo Mode · Floating Widget          │
├─────────────────────────────────────────────────┤
│                 Application Layer                │
│  Zustand Store · Incident Service · Agent Service│
├──────────────┬──────────────────────────────────┤
│ Memory Layer │         Agent Layer               │
│ MemoryService│      AgentService                 │
│ retain()     │      analyze()                    │
│ recall()     │      buildAssessment()            │
│ reflect()    │      buildRecommendations()       │
├──────────────┼──────────────────────────────────┤
│  Hindsight   │    LLM Provider (configurable)    │
│  (Vectorize) │  OpenAI / Anthropic / Google /    │
│              │  Ollama / Deterministic            │
└──────────────┴──────────────────────────────────┘
```

## Agent Chat & Direct Availability

RootRecall provides direct, universal access to the Incident Intelligence Agent without requiring an incident ticket:

- **Dedicated Agent Chat Page** (`/chat`): Full-featured 2-column workspace for free-form engineering inquiries, root cause queries, diagnostic questions, and rollback plan generation with live Hindsight memory grounding.
- **Floating Quick-Chat Assistant**: Persistent slide-out widget docked at the bottom-right across dashboard, incident lists, and settings for instant on-call assistance anywhere in the app.
- **One-Click Promotion & Navigation**: 1-click jumps directly from chat memories into historical incident tickets.
- **Omnipresent Access**: Launch inquiries via the **Sidebar** (`Agent Chat`), **Topbar** (`Ask Agent`), **Dashboard Hero** (`Ask RootRecall`), or **⌘K Command Palette**.

## Memory Lifecycle

1. **Incident Created** — Engineer reports an issue
2. **Agent Analyzes** — Recalls relevant memories, provides contextual guidance
3. **Incident Resolved** — Engineer documents root cause, resolution, lessons
4. **Memory Retained** — Knowledge stored in Hindsight for future recall
5. **Similar Incident** — Memory recalled, investigation accelerated

## Tech Stack

- **Framework**: Next.js 16 + TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Memory**: Hindsight by Vectorize (`@vectorize-io/hindsight-client`)
- **LLM**: Configurable (OpenAI, Anthropic, Google, Ollama, or deterministic)
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone <repo-url>
cd rootrecall
npm install
cp .env.example .env.local
```

### Environment Variables

Edit `.env.local`:

```env
# Hindsight Memory (Vectorize) — Server-side only (never exposed to browser)
HINDSIGHT_API_KEY=your-hindsight-key
HINDSIGHT_BANK=rootrecall-incidents # or HINDSIGHT_BANK_ID
HINDSIGHT_BASE_URL=https://hindsight.vectorize.io

# LLM Provider (optional) — Server-side only
LLM_PROVIDER=openai # openai | anthropic | google | ollama | mock
LLM_API_KEY=your-api-key # or OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY
LLM_MODEL=gpt-4o-mini
```

> **Note:** RootRecall works without any API keys using deterministic analysis and local memory — ideal for demos.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

## Demo Mode

RootRecall includes a guided 4-phase demo:

| Phase | What Happens |
|-------|-------------|
| **1. Before Memory** | Create an incident with no historical context → generic guidance |
| **2. Teach RootRecall** | Resolve the incident → memory retained |
| **3. After Memory** | Create a similar incident → contextual, memory-informed guidance |
| **4. Accumulated Learning** | Resolve again → knowledge base grows |

Navigate to **Demo** in the sidebar and click **Run Phase** to step through.

## Seeded Data

RootRecall includes realistic synthetic incidents:

| ID | Service | Issue |
|----|---------|-------|
| INC-0971 | payment-api | 502 after deployment (connection pool) |
| INC-1018 | checkout-service | Latency spike (Redis memory) |
| INC-1029 | auth-service | Database timeout (runaway query) |
| INC-1037 | notification-service | Queue backlog (DNS deadlock) |
| INC-1044 | order-service | Intermittent 503 (memory leak) |

## Why Hindsight?

Hindsight by Vectorize provides:
- **Semantic memory** — not keyword matching, but meaning-based recall
- **Persistent storage** — knowledge survives across sessions
- **Simple API** — retain, recall, reflect
- **Cloud-hosted** — no infrastructure to manage

RootRecall uses Hindsight as the memory backbone. When configured, all incident knowledge is retained semantically and recalled based on similarity to new incidents.

## Limitations

- No real-time alerting integration (PagerDuty, OpsGenie)
- Single-user (no team collaboration features)
- No runbook automation execution
- LLM analysis is optional; deterministic mode handles demos

## Future Improvements

- Slack/Teams integration for incident channels
- PagerDuty webhook integration
- Runbook library and automation
- Team collaboration and incident roles
- Metrics dashboard with MTTR tracking
- Export/import memory banks

## License

MIT
