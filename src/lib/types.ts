// ============================================================
// RootRecall — Core Types
// ============================================================

export type Severity = 'SEV-1' | 'SEV-2' | 'SEV-3' | 'SEV-4';

export type IncidentStatus =
  | 'detected'
  | 'investigating'
  | 'identified'
  | 'mitigating'
  | 'resolved'
  | 'postmortem';

export interface Incident {
  id: string;
  title: string;
  service: string;
  severity: Severity;
  status: IncidentStatus;
  description: string;
  environment: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;

  // Investigation data
  symptoms: string[];
  logs: LogEntry[];
  timeline: TimelineEntry[];

  // Resolution data
  rootCause?: string;
  resolution?: string;
  lessonsLearned?: string[];
  commands?: string[];

  // Memory tracking
  memoryRetained: boolean;
  relatedIncidentIds: string[];
}

export interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  service: string;
  message: string;
}

export interface TimelineEntry {
  timestamp: string;
  action: string;
  actor: string;
  type: 'detection' | 'investigation' | 'action' | 'resolution' | 'note';
}

// ============================================================
// Memory Types
// ============================================================

export interface MemoryEntry {
  id: string;
  sourceIncidentId: string;
  sourceIncidentTitle: string;
  service: string;
  keywords: string[];
  summary: string;
  rootCause: string;
  resolution: string;
  lessonsLearned: string[];
  severity: Severity;
  createdAt: string;
  status: 'active' | 'archived';
}

export interface RecalledMemory {
  memory: MemoryEntry;
  similarity: 'high' | 'medium' | 'low';
  relevanceReason: string;
}

// ============================================================
// Agent Types
// ============================================================

export interface AgentRequest {
  incidentId: string;
  query: string;
  incident: Incident;
  memories: RecalledMemory[];
}

export interface AgentAssessment {
  summary: string;
  likelyCauses: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface AgentHistoricalEvidence {
  incidentId: string;
  incidentTitle: string;
  rootCause: string;
  relevance: string;
  similarity: 'high' | 'medium' | 'low';
}

export interface AgentRecommendation {
  step: string;
  rationale: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AgentResponse {
  assessment: AgentAssessment;
  historicalEvidence: AgentHistoricalEvidence[];
  recommendations: AgentRecommendation[];
  suggestedCommands: string[];
  disclaimer: string;
  generatedAt: string;
  memoryInfluenced: boolean;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  agentResponse?: AgentResponse;
  timestamp: string;
}

// ============================================================
// Demo Types
// ============================================================

export type DemoPhase =
  | 'idle'
  | 'before-memory'
  | 'teaching'
  | 'after-memory'
  | 'learning';

export interface DemoState {
  phase: DemoPhase;
  currentStep: number;
  totalSteps: number;
  isRunning: boolean;
  log: DemoLogEntry[];
}

export interface DemoLogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'memory' | 'agent';
}

// ============================================================
// Settings Types
// ============================================================

export interface HindsightConfig {
  baseUrl: string;
  apiKey: string;
  bankName: string;
  enabled: boolean;
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'ollama' | 'mock';
  apiKey: string;
  model: string;
  baseUrl?: string;
  enabled: boolean;
}

export interface AppConfig {
  hindsight: HindsightConfig;
  llm: LLMConfig;
}

export type ConnectionStatus = 'connected' | 'not-configured' | 'error';
