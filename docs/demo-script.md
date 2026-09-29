# Demo Script

## Overview

RootRecall includes a guided 4-phase demo that demonstrates how memory transforms incident response from generic to contextual.

**Duration:** ~3 minutes

## Setup

1. Start the app: `npm run dev`
2. Navigate to http://localhost:3000
3. Click **Demo** in the sidebar

## Phase 1: Before Memory

**Goal:** Show that without memory, RootRecall gives generic guidance.

1. Click **Run Phase** on "Before Memory"
2. This creates incident DEMO-001: "Payment API returning intermittent 502 errors after deployment"
3. RootRecall analyzes the incident with **no historical memory**
4. Observe:
   - Assessment says "No historical matches found"
   - Confidence is **low**
   - Recommendations are generic (standard 5xx troubleshooting)
   - Memory panel on the right is **empty**

**Key point:** Without memory, RootRecall is just another chatbot giving textbook answers.

## Phase 2: Teach RootRecall

**Goal:** Resolve the incident and store the knowledge.

1. Click **Run Phase** on "Teach RootRecall"
2. DEMO-001 is resolved with:
   - Root cause: Connection pool misconfiguration in deployment
   - Resolution: Rollback + fix + canary checks
   - Lessons: Pool metrics, canary analysis, separate config review
3. Memory is **retained** — visible as a purple badge on the incident

**Key point:** RootRecall now has organizational memory about payment-api 502 errors.

## Phase 3: After Memory

**Goal:** Show that with memory, the response is dramatically better.

1. Click **Run Phase** on "After Memory"
2. This creates incident DEMO-002: "Payment API 502 errors during traffic surge"
3. RootRecall analyzes — this time with historical memory
4. Observe the differences:
   - **Memory banner** appears: "RootRecall remembers this"
   - Assessment references DEMO-001 and the historical root cause
   - Confidence is **high**
   - Historical Evidence section shows the previous incident
   - Recommendations include lessons learned from DEMO-001
   - Memory panel shows the recalled memory with similarity score

**Key point:** Same type of incident, completely different quality of response.

## Phase 4: Accumulated Learning

**Goal:** Show that knowledge accumulates.

1. Click **Run Phase** on "Accumulated Learning"
2. DEMO-002 is resolved with its own root cause and lessons
3. A second memory is retained — now two payment-api incident memories exist
4. Summary card shows the complete lifecycle

**Key point:** Each resolved incident makes RootRecall smarter.

## Talking Points

- "Before memory: generic troubleshooting. After memory: contextual, evidence-based guidance."
- "The agent distinguishes between current evidence, historical memory, and inference."
- "Memory is not hidden — it's a visible, browsable product feature."
- "Powered by Hindsight's semantic memory — not keyword matching."
- "Every resolved incident becomes organizational knowledge."

## Reset

Click **Reset Demo** in the top-right of the Demo page to clear demo data and start over.
