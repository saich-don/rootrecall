# Architecture

## Overview

RootRecall is a single-page Next.js application with client-side routing. The architecture prioritizes simplicity and demo reliability while maintaining clean abstractions for production use.

## Directory Structure

```
src/
├── app/
│   ├── globals.css        # Design system and component styles
│   ├── layout.tsx         # Root layout with fonts
│   └── page.tsx           # Entry point (initializes seed data)
├── components/
│   ├── app-shell.tsx      # Main application shell with routing
│   ├── sidebar.tsx        # Navigation sidebar
│   ├── topbar.tsx         # Top bar with search and actions
│   ├── create-incident-modal.tsx
│   ├── toast.tsx          # Toast notifications
│   └── pages/
│       ├── dashboard.tsx      # Overview dashboard
│       ├── incidents.tsx      # Incident list
│       ├── incident-workspace.tsx  # 3-column investigation workspace
│       ├── memory.tsx         # Memory browser
│       ├── demo.tsx           # Guided demo mode
│       └── settings.tsx       # Configuration
└── lib/
    ├── types.ts           # TypeScript type definitions
    ├── seed-data.ts       # Realistic synthetic incidents
    ├── store.ts           # Zustand global state
    ├── hindsight/
    │   └── memory-service.ts  # Hindsight integration
    └── agent/
        └── agent-service.ts   # AI analysis engine
```

## Key Design Decisions

### 1. Client-Side Routing
The app uses a simple state-based router in `AppShell` rather than Next.js file-based routing. This makes the single-page app feel fast and avoids unnecessary server round trips.

### 2. Deterministic Fallback
The AgentService always produces reliable output via its `analyzeLocally()` method. LLM integration is optional. This ensures the demo never fails.

### 3. Memory Service Abstraction
`MemoryService` wraps the Hindsight SDK with a clean interface. It maintains a local memory store that mirrors Hindsight, ensuring the UI always has immediate access to memory data even if the API is slow or unavailable.

### 4. Zustand Store
All application state lives in a single Zustand store. This provides:
- Simple, synchronous state updates
- No prop drilling
- Easy state inspection for debugging

## Data Flow

```
User Action → Zustand Store → MemoryService → Hindsight API
                             → AgentService  → LLM API (optional)
                             → UI Update
```

## Memory Architecture

Memory flows through three stages:

1. **Retain**: When an incident is resolved, its knowledge is structured into a `MemoryEntry` and sent to Hindsight via `retain()`.

2. **Recall**: When a new incident is analyzed, `recall()` queries Hindsight for semantically similar memories. A local similarity search supplements/fallbacks this.

3. **Enrich**: The agent combines current incident data with recalled memories to produce contextual recommendations.
