// ============================================================
// Global Application Store (Zustand)
// ============================================================

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  Incident,
  MemoryEntry,
  RecalledMemory,
  ConversationMessage,
  DemoState,
  DemoPhase,
  DemoLogEntry,
  AppConfig,
  IncidentStatus,
  Severity,
} from './types';
import { SEED_INCIDENTS, SEED_MEMORIES } from './seed-data';
import { MemoryService } from './hindsight/memory-service';
import { AgentService } from './agent/agent-service';

// ============================================================
// Default configuration
// ============================================================

const DEFAULT_CONFIG: AppConfig = {
  hindsight: {
    baseUrl: 'https://api.hindsight.vectorize.io',
    apiKey: '', // Keys are server-side only (HINDSIGHT_API_KEY env var)
    bankName: process.env.NEXT_PUBLIC_HINDSIGHT_BANK || 'rootrecall-incidents',
    enabled: false, // Determined at runtime via /api/status
  },
  llm: {
    provider: (process.env.NEXT_PUBLIC_LLM_PROVIDER as AppConfig['llm']['provider']) || 'mock',
    apiKey: '', // Keys are server-side only (LLM_API_KEY env var)
    model: process.env.NEXT_PUBLIC_LLM_MODEL || '',
    baseUrl: '',
    enabled: false, // Determined at runtime via /api/status
  },
};

// ============================================================
// Store Interface
// ============================================================

interface AppState {
  // Incidents
  incidents: Incident[];
  activeIncidentId: string | null;

  // Memories
  memories: MemoryEntry[];
  recalledMemories: RecalledMemory[];

  // Conversations
  conversations: Record<string, ConversationMessage[]>;
  isAnalyzing: boolean;

  // Demo
  demo: DemoState;

  // Config
  config: AppConfig;

  // Services (non-serializable, excluded from persistence)
  memoryService: MemoryService;
  agentService: AgentService;

  // Toast
  toasts: Toast[];

  // ────────── Actions ──────────

  // Incidents
  createIncident: (data: CreateIncidentData) => Incident;
  updateIncident: (id: string, updates: Partial<Incident>) => void;
  resolveIncident: (id: string, rootCause: string, resolution: string, lessons: string[]) => Promise<void>;
  setActiveIncident: (id: string | null) => void;
  getIncident: (id: string) => Incident | undefined;

  // Memory
  retainIncidentMemory: (incident: Incident) => Promise<MemoryEntry>;
  recallMemories: (incident: Incident) => Promise<RecalledMemory[]>;
  loadSeedMemories: () => void;
  clearAllMemories: () => void;

  // Agent
  analyzeIncident: (incidentId: string, query?: string) => Promise<void>;
  askAgentDirectly: (query: string) => Promise<void>;
  clearGlobalChat: () => void;

  // Demo
  startDemo: () => Promise<void>;
  resetDemo: () => void;
  advanceDemoPhase: (phase: DemoPhase) => void;
  addDemoLog: (message: string, type: DemoLogEntry['type']) => void;

  // Toast
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;

  // Config
  updateConfig: (config: Partial<AppConfig>) => void;

  // Init & Sync
  initializeWithSeedData: () => void;
  syncServerStatus: () => Promise<void>;
}

interface CreateIncidentData {
  id?: string;
  title: string;
  service: string;
  severity: Severity;
  description: string;
  environment?: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'memory';
  createdAt: number;
}

// ============================================================
// Store Implementation
// ============================================================

export const useAppStore = create<AppState>((set, get) => {
  const memoryService = new MemoryService();
  const agentService = new AgentService();

  return {
    // Initial state
    incidents: [],
    activeIncidentId: null,
    memories: [],
    recalledMemories: [],
    conversations: {},
    isAnalyzing: false,
    demo: {
      phase: 'idle',
      currentStep: 0,
      totalSteps: 4,
      isRunning: false,
      log: [],
    },
    config: DEFAULT_CONFIG,
    memoryService,
    agentService,
    toasts: [],

    // ────────── Incident Actions ──────────

    createIncident: (data) => {
      const incident: Incident = {
        id: data.id || `INC-${1000 + get().incidents.length + 1}`,
        title: data.title,
        service: data.service,
        severity: data.severity,
        status: 'investigating',
        description: data.description,
        environment: data.environment || 'production',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        symptoms: [],
        logs: [],
        timeline: [
          {
            timestamp: new Date().toISOString(),
            action: 'Incident created',
            actor: 'user',
            type: 'detection',
          },
        ],
        memoryRetained: false,
        relatedIncidentIds: [],
      };

      set((state) => ({
        incidents: [...state.incidents, incident],
      }));

      get().addToast(`Incident ${incident.id} created`, 'info');
      return incident;
    },

    updateIncident: (id, updates) => {
      set((state) => ({
        incidents: state.incidents.map((inc) =>
          inc.id === id
            ? { ...inc, ...updates, updatedAt: new Date().toISOString() }
            : inc
        ),
      }));
    },

    resolveIncident: async (id, rootCause, resolution, lessons) => {
      const incident = get().incidents.find((i) => i.id === id);
      if (!incident) return;

      const resolved: Incident = {
        ...incident,
        status: 'resolved' as IncidentStatus,
        rootCause,
        resolution,
        lessonsLearned: lessons,
        resolvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timeline: [
          ...incident.timeline,
          {
            timestamp: new Date().toISOString(),
            action: `Incident resolved. Root cause: ${rootCause.substring(0, 80)}...`,
            actor: 'user',
            type: 'resolution' as const,
          },
        ],
      };

      set((state) => ({
        incidents: state.incidents.map((inc) =>
          inc.id === id ? resolved : inc
        ),
      }));

      // Retain memory
      await get().retainIncidentMemory(resolved);
      get().addToast(`Incident ${id} resolved and memory retained`, 'success');
    },

    setActiveIncident: (id) => {
      set({ activeIncidentId: id, recalledMemories: [] });
    },

    getIncident: (id) => {
      return get().incidents.find((i) => i.id === id);
    },

    // ────────── Memory Actions ──────────

    retainIncidentMemory: async (incident) => {
      const memory = await get().memoryService.retainIncident(incident, get().config);

      set((state) => {
        const existing = state.memories.findIndex(
          (m) => m.sourceIncidentId === incident.id
        );
        const updated =
          existing >= 0
            ? state.memories.map((m, i) => (i === existing ? memory : m))
            : [...state.memories, memory];
        return { memories: updated };
      });

      // Update incident
      get().updateIncident(incident.id, { memoryRetained: true });
      get().addToast(
        `Memory retained for ${incident.id}`,
        'memory'
      );

      return memory;
    },

    recallMemories: async (incident) => {
      const recalled = await get().memoryService.recallForIncident(incident, get().config);
      set({ recalledMemories: recalled });
      return recalled;
    },

    loadSeedMemories: () => {
      get().memoryService.loadMemories(SEED_MEMORIES);
      set({ memories: [...SEED_MEMORIES] });
    },

    clearAllMemories: () => {
      get().memoryService.clearMemories();
      set({ memories: [], recalledMemories: [] });
    },

    // ────────── Agent Actions ──────────

    analyzeIncident: async (incidentId, query) => {
      const incident = get().incidents.find((i) => i.id === incidentId);
      if (!incident) return;

      set({ isAnalyzing: true });

      try {
        // Recall memories
        const memories = await get().recallMemories(incident);

        // Add user message to conversation
        const userMsg: ConversationMessage = {
          id: uuidv4(),
          role: 'user',
          content:
            query ||
            `Analyze incident ${incident.id}: ${incident.description}`,
          timestamp: new Date().toISOString(),
        };

        const priorHistory = get().conversations[incidentId] || [];

        // Analyze with agent (including prior conversation history for multi-turn coherence)
        const response = await get().agentService.analyze(
          incident,
          memories,
          query,
          get().config,
          priorHistory.map((m) => ({ role: m.role, content: m.content }))
        );

        // Add agent response
        const agentMsg: ConversationMessage = {
          id: uuidv4(),
          role: 'agent',
          content: response.assessment.summary,
          agentResponse: response,
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          conversations: {
            ...state.conversations,
            [incidentId]: [
              ...(state.conversations[incidentId] || []),
              userMsg,
              agentMsg,
            ],
          },
        }));
      } finally {
        set({ isAnalyzing: false });
      }
    },

    askAgentDirectly: async (query: string) => {
      if (!query.trim() || get().isAnalyzing) return;

      set({ isAnalyzing: true });

      const userMsg: ConversationMessage = {
        id: uuidv4(),
        role: 'user',
        content: query,
        timestamp: new Date().toISOString(),
      };

      const priorHistory = get().conversations['global'] || [];

      // Update state with user message immediately
      set((state) => ({
        conversations: {
          ...state.conversations,
          global: [...priorHistory, userMsg],
        },
      }));

      try {
        const queryLower = query.toLowerCase();

        // Infer active service and incident context from multi-turn history
        let inferredService: string | undefined;
        let inferredIncidentId: string | undefined;

        for (let i = priorHistory.length - 1; i >= 0; i--) {
          const msg = priorHistory[i];
          if (msg.agentResponse?.historicalEvidence?.length) {
            inferredIncidentId = msg.agentResponse.historicalEvidence[0].incidentId;
          }
          const text = (msg.content || '').toLowerCase();
          for (const inc of get().incidents) {
            if (text.includes(inc.id.toLowerCase())) {
              inferredIncidentId = inc.id;
              inferredService = inc.service;
              break;
            }
            if (text.includes(inc.service.toLowerCase())) {
              inferredService = inc.service;
              break;
            }
          }
          if (inferredService) break;
        }

        // Check if query explicitly mentions an incident or service
        let activeService = inferredService;
        let activeIncidentId = inferredIncidentId;

        for (const inc of get().incidents) {
          if (queryLower.includes(inc.id.toLowerCase())) {
            activeIncidentId = inc.id;
            activeService = inc.service;
            break;
          }
          if (queryLower.includes(inc.service.toLowerCase())) {
            activeService = inc.service;
            break;
          }
        }

        if (!activeService) {
          if (queryLower.includes('payment')) activeService = 'payment-api';
          else if (queryLower.includes('auth')) activeService = 'auth-service';
          else if (queryLower.includes('checkout')) activeService = 'checkout-service';
          else if (queryLower.includes('notification')) activeService = 'notification-worker';
          else if (queryLower.includes('proxy') || queryLower.includes('database')) activeService = 'database-proxy';
          else activeService = 'payment-api';
        }

        // Context-expanded recall query for Hindsight
        const isReferential =
          queryLower.includes('this') ||
          queryLower.includes('it') ||
          queryLower.includes('future') ||
          queryLower.includes('prevent') ||
          queryLower.includes('issue') ||
          queryLower.includes('incident');

        const recallQuery =
          isReferential && activeService
            ? `${query} ${activeService} ${activeIncidentId || ''}`.trim()
            : query;

        // 1. Recall relevant memories from Hindsight
        const recalled = await get().memoryService.recallByQuery(recallQuery, get().config);
        set({ recalledMemories: recalled });

        // 2. Identify base incident for telemetry and symptoms
        const baseIncident = get().incidents.find(
          (inc) =>
            (activeIncidentId && inc.id.toLowerCase() === activeIncidentId.toLowerCase()) ||
            inc.service.toLowerCase() === activeService.toLowerCase()
        );

        const contextIncident: Incident = baseIncident
          ? {
              ...baseIncident,
              description: `User Inquiry: ${query}\nService context: ${baseIncident.service} (${baseIncident.title})`,
            }
          : {
              id: activeIncidentId || 'ASK-AGENT',
              title: query,
              service: activeService,
              severity: 'SEV-2',
              status: 'investigating',
              description: query,
              environment: 'production',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              symptoms: [query],
              logs: [],
              timeline: [],
              memoryRetained: false,
              relatedIncidentIds: [],
            };

        // 3. Analyze with Agent (includes prior conversation history)
        const response = await get().agentService.analyze(
          contextIncident,
          recalled,
          query,
          get().config,
          priorHistory.map((m) => ({ role: m.role, content: m.content }))
        );

        const agentMsg: ConversationMessage = {
          id: uuidv4(),
          role: 'agent',
          content: response.assessment.summary,
          agentResponse: response,
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          conversations: {
            ...state.conversations,
            global: [...(state.conversations['global'] || []), agentMsg],
          },
        }));
      } catch (err) {
        console.error('[askAgentDirectly] error:', err);
      } finally {
        set({ isAnalyzing: false });
      }
    },

    clearGlobalChat: () => {
      set((state) => ({
        conversations: {
          ...state.conversations,
          global: [],
        },
      }));
    },

    // ────────── Demo Actions ──────────

    startDemo: async () => {
      const state = get();

      set({
        demo: {
          phase: 'before-memory',
          currentStep: 1,
          totalSteps: 4,
          isRunning: true,
          log: [],
        },
      });

      state.addDemoLog('Demo started — Phase 1: Before Memory', 'info');
    },

    resetDemo: () => {
      // Clear demo-created incidents (keep seed data)
      const seedIds = new Set(SEED_INCIDENTS.map((i) => i.id));

      set((state) => ({
        incidents: state.incidents.filter((i) => seedIds.has(i.id)),
        conversations: {},
        recalledMemories: [],
        activeIncidentId: null,
        demo: {
          phase: 'idle',
          currentStep: 0,
          totalSteps: 4,
          isRunning: false,
          log: [],
        },
      }));

      get().clearAllMemories();
      get().addToast('Demo reset complete', 'info');
    },

    advanceDemoPhase: (phase) => {
      const phaseStep: Record<DemoPhase, number> = {
        idle: 0,
        'before-memory': 1,
        teaching: 2,
        'after-memory': 3,
        learning: 4,
      };

      set((state) => ({
        demo: {
          ...state.demo,
          phase,
          currentStep: phaseStep[phase],
        },
      }));
    },

    addDemoLog: (message, type) => {
      set((state) => ({
        demo: {
          ...state.demo,
          log: [
            ...state.demo.log,
            {
              timestamp: new Date().toISOString(),
              message,
              type,
            },
          ],
        },
      }));
    },

    // ────────── Toast Actions ──────────

    addToast: (message, type) => {
      const toast: Toast = {
        id: uuidv4(),
        message,
        type,
        createdAt: Date.now(),
      };

      set((state) => ({
        toasts: [...state.toasts, toast],
      }));

      // Auto-remove after 4s
      setTimeout(() => {
        get().removeToast(toast.id);
      }, 4000);
    },

    removeToast: (id) => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    },

    // ────────── Config Actions ──────────

    updateConfig: (config) => {
      set((state) => ({
        config: {
          hindsight: { ...state.config.hindsight, ...config.hindsight },
          llm: { ...state.config.llm, ...config.llm },
        },
      }));
    },

    // ────────── Init & Sync ──────────

    syncServerStatus: async () => {
      try {
        const res = await fetch('/api/status');
        if (res.ok) {
          const data = await res.json();
          set((state) => ({
            config: {
              ...state.config,
              hindsight: {
                ...state.config.hindsight,
                baseUrl: data.hindsight?.baseUrl || state.config.hindsight.baseUrl,
                bankName: data.hindsight?.bank || state.config.hindsight.bankName,
                enabled: data.hindsight?.configured || false,
              },
              llm: {
                ...state.config.llm,
                provider: data.llm?.provider || state.config.llm.provider,
                model: data.llm?.model || state.config.llm.model,
                enabled: data.llm?.configured || false,
              },
            },
          }));
        }
      } catch (err) {
        console.warn('[store] syncServerStatus error:', err);
      }
    },

    initializeWithSeedData: () => {
      const state = get();
      if (state.incidents.length === 0) {
        set({ incidents: [...SEED_INCIDENTS] });
      }
      // Always seed memories if empty — guards against stale-state capture bug
      if (get().memories.length === 0) {
        get().loadSeedMemories();
      }
      // Automatically sync connection status from real server environment
      get().syncServerStatus();
    },
  };
});
