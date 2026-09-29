// ============================================================
// AgentService Tests
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentService } from '../agent/agent-service';
import type { Incident, RecalledMemory, MemoryEntry } from '../types';

// Mock fetch globally for server route calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

const MOCK_INCIDENT: Incident = {
  id: 'INC-TEST-001',
  title: 'Payment API 502 errors',
  service: 'payment-api',
  severity: 'SEV-2',
  status: 'investigating',
  description: 'Payment API returning intermittent 502 errors after deployment',
  environment: 'production',
  createdAt: '2026-09-01T10:00:00Z',
  updatedAt: '2026-09-01T10:00:00Z',
  symptoms: ['HTTP 502 errors', 'Connection pool exhausted'],
  logs: [{ timestamp: '2026-09-01T10:00:00Z', level: 'error', service: 'payment-api', message: 'connection pool exhausted' }],
  timeline: [],
  memoryRetained: false,
  relatedIncidentIds: [],
};

const MOCK_MEMORY: MemoryEntry = {
  id: 'mem-INC-0971',
  sourceIncidentId: 'INC-0971',
  sourceIncidentTitle: 'Payment API 502 after deployment',
  service: 'payment-api',
  keywords: ['payment-api', '502', 'connection-pool', 'deployment'],
  summary: 'Payment API 502: Connection pool reduced from 200 to 50',
  rootCause: 'Deployment v2.14.3 reduced connection pool from 200 to 50 connections, causing exhaustion under normal load.',
  resolution: 'Rolled back to v2.14.2, restored connection pool configuration.',
  lessonsLearned: ['Check connection pool after deployment', 'Add connection pool to canary checks', 'Review config changes separately'],
  severity: 'SEV-2',
  createdAt: '2026-08-15T16:45:00Z',
  status: 'active',
};

const HIGH_MEMORY_MATCH: RecalledMemory = {
  memory: MOCK_MEMORY,
  similarity: 'high',
  relevanceReason: 'Same service, matching keywords: 502, connection-pool',
};

const LOW_MEMORY_MATCH: RecalledMemory = {
  memory: { ...MOCK_MEMORY, id: 'mem-low', sourceIncidentId: 'INC-OTHER', sourceIncidentTitle: 'Unrelated incident', rootCause: 'Something different' },
  similarity: 'low',
  relevanceReason: 'Partial keyword match',
};

describe('AgentService', () => {
  let service: AgentService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new AgentService();
  });

  describe('analyze — without memory', () => {
    it('returns low confidence when no memories available', async () => {
      // Mock server returning not-configured
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ error: 'llm-not-configured' }),
      });

      const response = await service.analyze(MOCK_INCIDENT, []);

      expect(response.assessment.confidence).toBe('low');
      expect(response.memoryInfluenced).toBe(false);
      expect(response.historicalEvidence).toHaveLength(0);
    });

    it('includes generic causes without memory', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ error: 'llm-not-configured' }),
      });

      const response = await service.analyze(MOCK_INCIDENT, []);

      expect(response.assessment.likelyCauses.length).toBeGreaterThan(0);
      expect(response.assessment.summary).toContain('No historical matches');
    });

    it('returns structured AgentResponse shape', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ error: 'llm-not-configured' }),
      });

      const response = await service.analyze(MOCK_INCIDENT, []);

      expect(response).toHaveProperty('assessment');
      expect(response).toHaveProperty('historicalEvidence');
      expect(response).toHaveProperty('recommendations');
      expect(response).toHaveProperty('suggestedCommands');
      expect(response).toHaveProperty('disclaimer');
      expect(response).toHaveProperty('generatedAt');
      expect(response).toHaveProperty('memoryInfluenced');
    });
  });

  describe('analyze — with high-similarity memory', () => {
    it('returns high confidence when high-similarity memory available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ error: 'llm-not-configured' }),
      });

      const response = await service.analyze(MOCK_INCIDENT, [HIGH_MEMORY_MATCH]);

      expect(response.assessment.confidence).toBe('high');
      expect(response.memoryInfluenced).toBe(true);
    });

    it('includes historical evidence from recalled memory', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ error: 'llm-not-configured' }),
      });

      const response = await service.analyze(MOCK_INCIDENT, [HIGH_MEMORY_MATCH]);

      expect(response.historicalEvidence).toHaveLength(1);
      expect(response.historicalEvidence[0].incidentId).toBe('INC-0971');
      expect(response.historicalEvidence[0].similarity).toBe('high');
    });

    it('summary references historical incident when high match found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ error: 'llm-not-configured' }),
      });

      const response = await service.analyze(MOCK_INCIDENT, [HIGH_MEMORY_MATCH]);
      expect(response.assessment.summary).toContain('INC-0971');
    });

    it('includes memory-derived lessons in recommendations', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ error: 'llm-not-configured' }),
      });

      const response = await service.analyze(MOCK_INCIDENT, [HIGH_MEMORY_MATCH]);
      const lessons = MOCK_MEMORY.lessonsLearned;
      const recSteps = response.recommendations.map((r) => r.step);
      const hasLesson = lessons.some((l) => recSteps.includes(l));
      expect(hasLesson).toBe(true);
    });
  });

  describe('analyze — with medium-similarity memory', () => {
    it('returns medium confidence with medium-similarity memory', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ error: 'llm-not-configured' }),
      });

      const mediumMatch: RecalledMemory = { ...HIGH_MEMORY_MATCH, similarity: 'medium' };
      const response = await service.analyze(MOCK_INCIDENT, [mediumMatch]);

      expect(response.assessment.confidence).toBe('medium');
      expect(response.memoryInfluenced).toBe(true);
    });
  });

  describe('analyzeLocally — direct call', () => {
    it('deterministic — produces stable output for same inputs', () => {
      const r1 = service.analyzeLocally(MOCK_INCIDENT, [HIGH_MEMORY_MATCH]);
      const r2 = service.analyzeLocally(MOCK_INCIDENT, [HIGH_MEMORY_MATCH]);

      expect(r1.assessment.confidence).toBe(r2.assessment.confidence);
      expect(r1.historicalEvidence.length).toBe(r2.historicalEvidence.length);
      expect(r1.recommendations.length).toBe(r2.recommendations.length);
    });

    it('low similarity match gives medium confidence', () => {
      const response = service.analyzeLocally(MOCK_INCIDENT, [LOW_MEMORY_MATCH]);
      expect(response.assessment.confidence).toBe('medium');
    });
  });

  describe('analyze — LLM server route', () => {
    it('uses LLM response when server returns valid AgentResponse', async () => {
      const llmResponse = {
        assessment: { summary: 'LLM says: connection pool issue', likelyCauses: ['LLM cause'], confidence: 'high' },
        historicalEvidence: [{ incidentId: 'INC-0971', incidentTitle: 'Test', rootCause: 'LLM root', relevance: 'High', similarity: 'high' }],
        recommendations: [{ step: 'LLM step', rationale: 'LLM rationale', priority: 'high' }],
        suggestedCommands: ['kubectl get pods'],
        disclaimer: 'LLM disclaimer',
        generatedAt: '2026-09-01T00:00:00Z',
        memoryInfluenced: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: llmResponse }),
      });

      const response = await service.analyze(MOCK_INCIDENT, [HIGH_MEMORY_MATCH]);
      expect(response.assessment.summary).toBe('LLM says: connection pool issue');
    });

    it('falls back to deterministic when LLM server returns error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const response = await service.analyze(MOCK_INCIDENT, [HIGH_MEMORY_MATCH]);
      // Deterministic fallback still produces valid output
      expect(response.assessment.confidence).toBe('high'); // high match present
      expect(response.memoryInfluenced).toBe(true);
    });
  });
});
