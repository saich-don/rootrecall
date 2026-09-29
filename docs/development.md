# Development Guide

## Quick Start

```bash
npm install
npm run dev
```

## Project Structure

```
src/
├── app/             # Next.js App Router (layout, page, CSS)
├── components/      # React components
│   ├── pages/       # Page-level components
│   └── *.tsx        # Shared components (sidebar, topbar, etc.)
└── lib/             # Business logic
    ├── types.ts     # TypeScript types
    ├── seed-data.ts # Synthetic incident data
    ├── store.ts     # Zustand store
    ├── hindsight/   # Hindsight memory integration
    └── agent/       # AI analysis engine
```

## Key Files

| File | Purpose |
|------|---------|
| `lib/store.ts` | Global state — incidents, memories, conversations |
| `lib/hindsight/memory-service.ts` | Hindsight SDK integration + local fallback |
| `lib/agent/agent-service.ts` | AI analysis with multi-provider LLM support |
| `lib/seed-data.ts` | 5 realistic synthetic incidents |
| `components/pages/incident-workspace.tsx` | 3-column investigation workspace |
| `components/pages/demo.tsx` | Guided 4-phase demo |

## Running Without API Keys

RootRecall works fully without any API keys:
- **Memory**: Uses local in-memory storage with similarity matching
- **Analysis**: Uses deterministic `analyzeLocally()` — no LLM needed
- **Demo**: All phases work reliably

## Adding Hindsight

1. Get an API key from [hindsight.vectorize.io](https://hindsight.vectorize.io/)
2. Set `NEXT_PUBLIC_HINDSIGHT_API_KEY` in `.env.local`
3. Restart the dev server
4. Or configure in Settings page at runtime

## Adding an LLM

1. Set `NEXT_PUBLIC_LLM_PROVIDER` to `openai`, `anthropic`, `google`, or `ollama`
2. Set `NEXT_PUBLIC_LLM_API_KEY` with your key
3. Optionally set `NEXT_PUBLIC_LLM_MODEL`
4. Or configure in Settings page at runtime

## Build

```bash
npm run build    # TypeScript check + production build
npm start        # Serve production build
```

## Deployment

### Vercel (recommended)

```bash
npx vercel
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Self-hosted

```bash
npm run build
PORT=3000 npm start
```
