import { describe, it, expect } from 'vitest';
import { AgentService } from '../agent/agent-service';
import { MemoryService } from '../hindsight/memory-service';
import type { Incident, RecalledMemory } from '../types';

describe('End-to-End Live Pipeline & Multi-Turn Agent Reasoning', () => {
  const agentService = new AgentService();
  const memoryService = new MemoryService();
  const syntheticIncident: Incident = {
    id: 'INC-0971',
    title: 'Payment API 502 errors after deployment v2.14.0',
    service: 'payment-api',
    severity: 'SEV-1',
    status: 'resolved',
    description: 'Elevated 502 Bad Gateway responses on /v1/charges immediately after deployment of v2.14.0',
    symptoms: [
      'HTTP 502 Bad Gateway on /v1/charges',
      'Elevated upstream latency > 4000ms',
      'Database connection pool timeout errors',
    ],
    logs: [
      {
        timestamp: '2026-09-15T10:14:02Z',
        level: 'error',
        message: 'DB pool exhausted: 20/20 active connections in use, acquire timeout 5000ms',
        service: 'payment-api',
      },
    ],
    environment: 'production',
    createdAt: '2026-09-15T10:05:00Z',
    resolvedAt: '2026-09-15T11:30:00Z',
    rootCause: 'Connection pool starvation caused by unclosed DB connections in new webhook handler',
    resolution: 'Reverted deployment to v2.13.9, increased connection pool size from 20 to 50',
    lessonsLearned: [
      'Always ensure database connections are released in finally blocks',
      'Add connection pool exhaustion alarms at 80% capacity',
      'Add database connection leak detector to integration test suite',
    ],
    timeline: [],
    updatedAt: '2026-09-15T11:30:00Z',
    relatedIncidentIds: [],
    memoryRetained: true,
  };

  const newIncident: Incident = {
    id: 'INC-1042',
    title: 'Payment API returning intermittent 502 errors after deployment',
    service: 'payment-api',
    severity: 'SEV-1',
    status: 'investigating',
    description: 'Spike in 502 Bad Gateway errors on payment-api after deployment of v2.15.0',
    symptoms: [
      'HTTP 502 Bad Gateway on /v1/charges',
      'Upstream timeout',
      'Database connection pool timeout warnings',
    ],
    logs: [
      {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Connection pool exhausted, 20/20 active connections',
        service: 'payment-api',
      },
    ],
    environment: 'production',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    relatedIncidentIds: [],
    memoryRetained: false,
    timeline: [],
  };

  it('1. Before memory: initial inquiry returns generic guidance when no memories exist', () => {
    const response = agentService.analyzeLocally(newIncident, [], 'What is happening with the payment API?');
    expect(response.memoryInfluenced).toBe(false);
    expect(response.historicalEvidence).toHaveLength(0);
    expect(response.assessment.summary).toContain('No historical matches found');
    expect(response.recommendations.length).toBeGreaterThan(0);
  });

  it('2. Retain resolution: incident memory is created with structured root cause, resolution, and lessons', async () => {
    const memory = await memoryService.retainIncident(syntheticIncident);
    expect(memory.sourceIncidentId).toBe('INC-0971');
    expect(memory.rootCause).toContain('Connection pool starvation');
    expect(memory.resolution).toContain('Reverted deployment to v2.13.9');
    expect(memory.lessonsLearned).toHaveLength(3);
  });

  it('3. After memory: new similar incident recalls INC-0971 with high similarity', async () => {
    const recalls = await memoryService.recallForIncident(newIncident);
    expect(recalls.length).toBeGreaterThan(0);
    const inc0971 = recalls.find((r) => r.memory.sourceIncidentId === 'INC-0971');
    expect(inc0971).toBeDefined();
    expect(inc0971?.similarity).toBe('high');
  });

  it('4. Multi-turn Turn 1: Agent leverages recalled memory to provide grounded investigation', async () => {
    const recalls = await memoryService.recallForIncident(newIncident);
    const turn1 = agentService.analyzeLocally(
      newIncident,
      recalls,
      'Payment API is returning intermittent 502 errors after a deployment. What should I investigate?'
    );

    expect(turn1.memoryInfluenced).toBe(true);
    expect(turn1.historicalEvidence.length).toBeGreaterThan(0);
    expect(turn1.historicalEvidence[0].incidentId).toBe('INC-0971');
    expect(turn1.assessment.summary).toContain('INC-0971');
    expect(turn1.assessment.likelyCauses.some((c) => c.toLowerCase().includes('connection pool'))).toBe(true);
  });

  it('5. Multi-turn Turn 2: User asks "Have we seen this before?" and agent cites historical evidence', async () => {
    const recalls = await memoryService.recallForIncident(newIncident);
    const turn2 = agentService.analyzeLocally(newIncident, recalls, 'Have we seen this before?');

    expect(turn2.memoryInfluenced).toBe(true);
    expect(turn2.assessment.summary).toContain('INC-0971');
    expect(turn2.assessment.summary).toContain('Connection pool starvation');
    expect(turn2.historicalEvidence[0].rootCause).toContain('Connection pool starvation');
  });

  it('6. Multi-turn Turn 3: User asks "What should I check first?" and recommendations prioritize historical fix', async () => {
    const recalls = await memoryService.recallForIncident(newIncident);
    const turn3 = agentService.analyzeLocally(newIncident, recalls, 'What should I check first?');

    expect(turn3.recommendations.length).toBeGreaterThan(0);
    expect(turn3.recommendations[0].step).toBeTruthy();
    expect(turn3.recommendations[0].rationale).toContain('INC-0971');
  });

  it('7. Multi-turn Turn 4: User asks "Suggest rollback plan" and agent provides contextual commands', async () => {
    const recalls = await memoryService.recallForIncident(newIncident);
    const turn4 = agentService.analyzeLocally(newIncident, recalls, 'Suggest rollback plan');

    expect(turn4.suggestedCommands.length).toBeGreaterThan(0);
    expect(turn4.suggestedCommands.some((c) => c.includes('rollout undo'))).toBe(true);
  });

  it('8. Direct Agent Chat: recallByQuery retrieves relevant memories from freeform question', async () => {
    const recalls = await memoryService.recallByQuery('What caused the payment-api 502 outage?');
    expect(recalls.length).toBeGreaterThan(0);
    expect(recalls.some((r) => r.memory.sourceIncidentId === 'INC-0971')).toBe(true);
  });

  it('9. Direct Agent Chat: Agent answers freeform inquiry directly using organizational memory', async () => {
    const recalls = await memoryService.recallByQuery('What should I check first for DB pool exhaustion?');
    const queryIncident: Incident = {
      id: 'QUERY-01',
      title: 'What should I check first for DB pool exhaustion?',
      service: 'payment-api',
      severity: 'SEV-2',
      status: 'investigating',
      description: 'Freeform engineer inquiry',
      environment: 'production',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      symptoms: ['DB pool exhaustion'],
      logs: [],
      timeline: [],
      memoryRetained: false,
      relatedIncidentIds: [],
    };
    const response = agentService.analyzeLocally(queryIncident, recalls, 'What should I check first for DB pool exhaustion?');
    expect(response.recommendations.length).toBeGreaterThan(0);
    expect(response.historicalEvidence.some((e) => e.incidentId === 'INC-0971')).toBe(true);
  });
});

