// ============================================================
// MemoryService Tests
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryService } from '../hindsight/memory-service';
import type { Incident } from '../types';

// Mock fetch globally for server route calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

const MOCK_INCIDENT: Incident = {
  id: 'INC-TEST-001',
  title: 'Payment API 502 after deployment',
  service: 'payment-api',
  severity: 'SEV-2',
  status: 'resolved',
  description: 'Payment API returning 502 errors after deployment. Connection pool exhausted.',
  environment: 'production',
  createdAt: '2026-09-01T10:00:00Z',
  updatedAt: '2026-09-01T12:00:00Z',
  resolvedAt: '2026-09-01T12:00:00Z',
  symptoms: ['HTTP 502 errors', 'Connection pool exhausted', 'High latency'],
  logs: [],
  timeline: [],
  rootCause: 'Connection pool reduced from 200 to 50 in deployment config',
  resolution: 'Rolled back deployment and restored connection pool configuration',
  lessonsLearned: ['Check connection pool after deployment', 'Add canary checks'],
  commands: [],
  memoryRetained: false,
  relatedIncidentIds: [],
};

describe('MemoryService', () => {
  let service: MemoryService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new MemoryService();
  });

  describe('retainIncident', () => {
    it('stores incident locally and returns a MemoryEntry', async () => {
      // Mock the server route to return not-configured (local-only mode)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, reason: 'not-configured' }),
      });

      const memory = await service.retainIncident(MOCK_INCIDENT);

      expect(memory.sourceIncidentId).toBe('INC-TEST-001');
      expect(memory.service).toBe('payment-api');
      expect(memory.rootCause).toBe('Connection pool reduced from 200 to 50 in deployment config');
      expect(memory.lessonsLearned).toHaveLength(2);
      expect(memory.status).toBe('active');
    });

    it('persists memory to local store for immediate recall', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, reason: 'not-configured' }),
      });

      await service.retainIncident(MOCK_INCIDENT);
      const all = service.getAllMemories();

      expect(all).toHaveLength(1);
      expect(all[0].sourceIncidentId).toBe('INC-TEST-001');
    });

    it('does not duplicate when retaining same incident twice', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, reason: 'not-configured' }),
      });

      await service.retainIncident(MOCK_INCIDENT);
      await service.retainIncident(MOCK_INCIDENT);

      expect(service.getMemoryCount()).toBe(1);
    });

    it('upgrades to Hindsight retain when server route returns success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const memory = await service.retainIncident(MOCK_INCIDENT);
      expect(memory.sourceIncidentId).toBe('INC-TEST-001');
      // Verify fetch was called with the retain endpoint
      expect(mockFetch).toHaveBeenCalledWith('/api/memory/retain', expect.objectContaining({
        method: 'POST',
      }));
    });
  });

  describe('recallForIncident', () => {
    it('returns empty array when no memories exist', async () => {
      // Mock recall endpoint returning empty
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      const similar: Incident = {
        ...MOCK_INCIDENT,
        id: 'INC-TEST-002',
        title: 'Payment service timeout',
        description: 'Payment service is timing out',
        symptoms: ['timeout errors'],
      };

      const recalled = await service.recallForIncident(similar);
      expect(recalled).toHaveLength(0);
    });

    it('finds local matches by service name similarity', async () => {
      // Load a memory first
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, reason: 'not-configured' }),
      });
      await service.retainIncident(MOCK_INCIDENT);

      // Now recall for a similar incident on the same service
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }), // no hindsight results
      });

      const similar: Incident = {
        ...MOCK_INCIDENT,
        id: 'INC-TEST-002',
        title: 'Payment API 502 again',
        description: 'Payment API 502 errors after new deployment. Connection pool issues.',
        symptoms: ['HTTP 502 errors on payment endpoints'],
      };

      const recalled = await service.recallForIncident(similar);
      expect(recalled.length).toBeGreaterThan(0);
      expect(recalled[0].memory.service).toBe('payment-api');
    });

    it('upgrades similarity to high when Hindsight recalls matching incident', async () => {
      // First, load a memory locally
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, reason: 'not-configured' }),
      });
      await service.retainIncident(MOCK_INCIDENT);

      // Mock Hindsight returning the incident ID in recalled text
      const similar: Incident = {
        ...MOCK_INCIDENT,
        id: 'INC-TEST-002',
        service: 'payment-api',
        description: 'Payment 502 errors',
        symptoms: ['502 errors'],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [`INCIDENT: INC-TEST-001 — Payment API 502 after deployment\nSERVICE: payment-api`],
        }),
      });

      const recalled = await service.recallForIncident(similar);
      const highMatch = recalled.find((r) => r.similarity === 'high');
      expect(highMatch).toBeDefined();
      expect(highMatch?.memory.sourceIncidentId).toBe('INC-TEST-001');
    });

    it('excludes the current incident from recall results', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, reason: 'not-configured' }),
      });
      await service.retainIncident(MOCK_INCIDENT);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      // Recall for the SAME incident
      const recalled = await service.recallForIncident(MOCK_INCIDENT);
      const selfMatch = recalled.find(
        (r) => r.memory.sourceIncidentId === MOCK_INCIDENT.id
      );
      expect(selfMatch).toBeUndefined();
    });

    it('correctly parses server route results (not Array.isArray on RecallResponse)', async () => {
      // This is the regression test for the Array.isArray bug.
      // The server route returns { results: string[] }, not a raw RecallResponse.
      // This test ensures we handle the server route format correctly.
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, reason: 'not-configured' }),
      });
      await service.retainIncident(MOCK_INCIDENT);

      // Server correctly returns { results: string[] }
      const hindsightText = 'INCIDENT: INC-TEST-001 — Payment API 502 after deployment\nSERVICE: payment-api\nROOT CAUSE: Connection pool reduced';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [hindsightText] }), // object with results array
      });

      const similar: Incident = {
        ...MOCK_INCIDENT,
        id: 'INC-TEST-003',
        service: 'payment-api',
        description: 'Payment service 502',
        symptoms: ['502 errors'],
      };

      const recalled = await service.recallForIncident(similar);
      // Should find the match from Hindsight text
      expect(recalled.some((r) => r.memory.sourceIncidentId === 'INC-TEST-001')).toBe(true);
    });
  });

  describe('clearMemories', () => {
    it('clears all local memories', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, reason: 'not-configured' }),
      });
      await service.retainIncident(MOCK_INCIDENT);
      expect(service.getMemoryCount()).toBe(1);

      service.clearMemories();
      expect(service.getMemoryCount()).toBe(0);
    });
  });

  describe('loadMemories', () => {
    it('loads seed memories correctly', () => {
      service.loadMemories([
        {
          id: 'mem-test',
          sourceIncidentId: 'INC-SEED-001',
          sourceIncidentTitle: 'Test seed',
          service: 'payment-api',
          keywords: ['payment-api', '502'],
          summary: 'Test summary',
          rootCause: 'Test root cause',
          resolution: 'Test resolution',
          lessonsLearned: ['Lesson 1'],
          severity: 'SEV-2',
          createdAt: '2026-09-01T00:00:00Z',
          status: 'active',
        },
      ]);
      expect(service.getMemoryCount()).toBe(1);
    });
  });
});
