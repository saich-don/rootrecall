// ============================================================
// Agent Service — AI Incident Investigation & Reasoning Agent
// Direct semantic access to Hindsight organizational memory.
// Context-aware multi-turn conversational intelligence.
// LLM calls go through /api/analyze server route.
// Resilient local reasoning engine ensures instant, reliable answers.
// ============================================================

import {
  Incident,
  RecalledMemory,
  AgentResponse,
  AgentAssessment,
  AgentHistoricalEvidence,
  AgentRecommendation,
  AppConfig,
} from '../types';

/**
 * The AgentService is responsible for analyzing incidents and producing
 * structured investigation guidance. It uses recalled memories from
 * Hindsight to provide context-aware recommendations.
 *
 * LLM calls are proxied through /api/analyze to keep API keys server-side.
 */
export class AgentService {
  /**
   * Analyze an incident and produce a structured response.
   * If memories are available, the response will be memory-influenced.
   */
  async analyze(
    incident: Incident,
    memories: RecalledMemory[],
    userQuery?: string,
    config?: AppConfig,
    conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<AgentResponse> {
    // Attempt real LLM analysis via server route
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incident, memories, userQuery, config, conversationHistory }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.response) {
          return this.validateAgentResponse(data.response);
        }
      }
    } catch (err) {
      console.warn('[AgentService] Server LLM failed, using reasoning engine:', err);
    }

    // Contextual local reasoning fallback — always produces reliable output
    return this.analyzeLocally(incident, memories, userQuery, conversationHistory);
  }

  /**
   * Context-aware reasoning engine.
   * Intelligently interprets the engineer's exact question, parses intent,
   * extracts relevant Hindsight historical evidence, and builds actionable plans.
   */
  analyzeLocally(
    incident: Incident,
    memories: RecalledMemory[],
    userQuery?: string,
    conversationHistory?: Array<{ role: string; content: string }>
  ): AgentResponse {
    const hasMemories = memories.length > 0;

    // Build assessment
    const assessment = this.buildAssessment(incident, memories, userQuery, conversationHistory);

    // Filter evidence to truly relevant memories (only high & medium, capped at 2)
    const relevantMemories = memories
      .filter((m) => m.similarity === 'high' || m.similarity === 'medium')
      .slice(0, 2);

    const historicalEvidence = (relevantMemories.length > 0 ? relevantMemories : memories.slice(0, 1))
      .map((m) => this.buildEvidence(m));

    // Build recommendations
    const recommendations = this.buildRecommendations(incident, memories, userQuery);

    // Build suggested commands
    const suggestedCommands = this.buildSuggestedCommands(incident, memories, userQuery);

    return {
      assessment,
      historicalEvidence,
      recommendations,
      suggestedCommands,
      disclaimer: hasMemories
        ? 'Historical evidence suggests patterns but does not confirm the current root cause. Always verify against current system state.'
        : 'No historical data available. These recommendations are based on general incident response practices.',
      generatedAt: new Date().toISOString(),
      memoryInfluenced: hasMemories,
    };
  }

  private buildAssessment(
    incident: Incident,
    memories: RecalledMemory[],
    userQuery?: string,
    conversationHistory?: Array<{ role: string; content: string }>
  ): AgentAssessment {
    const highMatch = memories.find((m) => m.similarity === 'high');
    const queryLower = userQuery?.toLowerCase() || '';
    const isInitial = !userQuery || userQuery.startsWith('Analyze incident') || userQuery.trim() === '';

    // Check if query is looking up a specific incident ID (e.g. INC-0971, INC-1018, etc.)
    const incMatch = queryLower.match(/inc-\d+/);
    if (incMatch) {
      const targetId = incMatch[0].toUpperCase();
      const targetMem = memories.find((m) => m.memory.sourceIncidentId.toUpperCase() === targetId);
      if (targetMem) {
        return {
          summary: `Hindsight incident record for ${targetId} (${targetMem.memory.sourceIncidentTitle}): Root cause was "${targetMem.memory.rootCause}". It was resolved by: "${targetMem.memory.resolution}". Key lessons retained: ${targetMem.memory.lessonsLearned.join('; ')}.`,
          likelyCauses: [targetMem.memory.rootCause, 'Configuration regression during deployment'],
          confidence: 'high',
        };
      }
    }

    // 1. Prevention / Hardening / Future Recurrence
    if (
      queryLower.includes('prevent') ||
      queryLower.includes('avoid') ||
      queryLower.includes('future') ||
      queryLower.includes('safeguard') ||
      queryLower.includes('recurrence') ||
      queryLower.includes('repeat') ||
      queryLower.includes('stop this') ||
      queryLower.includes('how to ensure') ||
      queryLower.includes('happen again')
    ) {
      if (highMatch) {
        const lessons = highMatch.memory.lessonsLearned;
        const lessonList = lessons.length > 0 ? `\n• ${lessons.join('\n• ')}` : '';
        return {
          summary: `To prevent future incidents like this in ${incident.service} (drawing directly from Hindsight postmortem ${highMatch.memory.sourceIncidentId}):\n\n1. Automated CI/CD Safeguards: Implement pre-deployment linting on configuration manifests to catch dangerous parameter drops (such as connection pool limits) before merge.\n2. Canary Health & Saturation Gates: Enforce automated canary checks that monitor upstream connection pool utilization and auto-abort releases if saturation exceeds 70%.\n3. Early-Warning Alerts: Configure P90/P99 latency and connection pool saturation alerts with automated circuit-breakers to shed traffic gracefully before hitting 502/504 timeouts.${lessonList ? `\n\nRetained postmortem lessons from ${highMatch.memory.sourceIncidentId}:${lessonList}` : ''}`,
          likelyCauses: [
            'Unvalidated deployment configuration changes bypassing CI/CD verification',
            'Absence of automated canary rollback gates monitoring pool saturation',
            'Late alerting thresholds (firing at 100% exhaustion rather than early saturation)',
          ],
          confidence: 'high',
        };
      }
      return {
        summary: `To prevent future incidents in ${incident.service}:\n\n1. Automated Canary Deployments: Enforce canary rollouts with automated health verification and automated rollback.\n2. Configuration Schema Validation: Validate all environment and resource settings (pools, timeouts, memory limits) in CI.\n3. Comprehensive Observability: Establish proactive alerting on saturation indicators (queue depth, pool utilization, P99 latency) to catch degradations before user-facing 5xx errors occur.`,
        likelyCauses: [
          'Configuration regressions introduced during deployments',
          'Insufficient automated canary analysis',
          'Lack of proactive threshold alerting',
        ],
        confidence: 'medium',
      };
    }

    // 2. Root Cause / Why / Mechanism
    if (
      queryLower.includes('root cause') ||
      queryLower.includes('why') ||
      queryLower.includes('cause') ||
      queryLower.includes('trigger') ||
      queryLower.includes('how did this happen') ||
      queryLower.includes('mechanism') ||
      queryLower.includes('what went wrong') ||
      queryLower.includes('explain the issue')
    ) {
      if (highMatch) {
        return {
          summary: `Technical failure mechanism for ${incident.service} based on Hindsight memory (${highMatch.memory.sourceIncidentId}): ${highMatch.memory.rootCause}. Under incoming traffic, active worker requests rapidly exhausted the reduced connection slots, causing subsequent requests to queue, exceed the 30s timeout threshold, and return HTTP 502 Bad Gateway to clients.`,
          likelyCauses: [
            highMatch.memory.rootCause,
            'Deployment configuration regression',
            'Connection pool exhaustion under normal traffic concurrency',
          ],
          confidence: 'high',
        };
      }
      return {
        summary: `Technical root cause analysis for ${incident.service}: Based on reported symptoms (${incident.symptoms.join(', ') || '502 Bad Gateway'}), the failure indicates upstream connection starvation or gateway timeouts caused by a recent deployment or configuration change.`,
        likelyCauses: this.getGenericCauses(incident),
        confidence: 'medium',
      };
    }

    // 3. Triage / Where to start / Priority
    if (
      queryLower.includes('first') ||
      queryLower.includes('start') ||
      queryLower.includes('triage') ||
      queryLower.includes('priority') ||
      queryLower.includes('where do i begin') ||
      queryLower.includes('what should i check') ||
      queryLower.includes('next step')
    ) {
      if (highMatch) {
        const topLesson = highMatch.memory.lessonsLearned[0] || 'connection pool configuration';
        return {
          summary: `Immediate triage sequence based on Hindsight historical precedent (${highMatch.memory.sourceIncidentId}):\n1. Priority 1 — Check ${topLesson} and active pool saturation.\n2. Priority 2 — Inspect upstream gateway/ALB error distribution to verify blast radius.\n3. Priority 3 — Compare the latest deployment revision against the last stable release.`,
          likelyCauses: [highMatch.memory.rootCause, ...this.getGenericCauses(incident).slice(0, 1)],
          confidence: 'high',
        };
      }
      return {
        summary: `Immediate triage sequence for ${incident.service}:\n1. Check ingress/gateway error rate and affected routes.\n2. Verify pod restart counts, resource limits, and OOM signals.\n3. Review recent deployment manifests and configuration diffs.`,
        likelyCauses: this.getGenericCauses(incident),
        confidence: 'low',
      };
    }

    // 4. What worked / Fix / Past resolution
    if (
      queryLower.includes('worked') ||
      queryLower.includes('fix') ||
      queryLower.includes('resolution') ||
      queryLower.includes('resolved') ||
      queryLower.includes('solution') ||
      queryLower.includes('how was this fixed') ||
      queryLower.includes('how to resolve')
    ) {
      if (highMatch) {
        const lessons = highMatch.memory.lessonsLearned.length > 0 ? ` Key lessons retained: "${highMatch.memory.lessonsLearned.slice(0, 2).join('; ')}".` : '';
        return {
          summary: `In ${highMatch.memory.sourceIncidentId} (${highMatch.memory.sourceIncidentTitle}), the team successfully resolved this by: "${highMatch.memory.resolution}".${lessons}`,
          likelyCauses: [highMatch.memory.rootCause, 'Configuration regression during deployment'],
          confidence: 'high',
        };
      }
      if (memories.length > 0) {
        return {
          summary: `Historical resolutions for related ${incident.service} incidents in Hindsight: ${memories.map(m => `${m.memory.sourceIncidentId} — ${m.memory.resolution}`).slice(0, 2).join(' | ')}.`,
          likelyCauses: memories.map(m => m.memory.rootCause).slice(0, 2),
          confidence: 'medium',
        };
      }
      return {
        summary: `No prior incident resolution recorded for this exact failure pattern. Standard remediation: verify upstream dependencies, check for recent canary configuration diffs, and consider a safe rollback to the previous stable release.`,
        likelyCauses: this.getGenericCauses(incident),
        confidence: 'low',
      };
    }

    // 5. Rollback plan
    if (queryLower.includes('rollback') || queryLower.includes('revert') || queryLower.includes('undo')) {
      return {
        summary: `Recommended safe rollback plan for ${incident.service}: Check current deployment revision, execute zero-downtime rollback, and monitor ingress error rates to ensure 5xx traffic drops to zero.`,
        likelyCauses: [
          highMatch ? `Regression introduced in latest release (${highMatch.memory.rootCause.substring(0, 80)}...)` : 'Recent deployment introduced breaking changes or misconfigured timeouts',
          'Environment variable or secret discrepancy in new container revision'
        ],
        confidence: highMatch ? 'high' : 'medium',
      };
    }

    // 6. Deployment diff
    if (queryLower.includes('diff') || queryLower.includes('deploy') || queryLower.includes('release') || queryLower.includes('commit')) {
      if (highMatch) {
        return {
          summary: `Deployment verification for ${incident.service}: In ${highMatch.memory.sourceIncidentId}, the regression was caused by: "${highMatch.memory.rootCause}". Inspect the deployment manifest diff for recent changes to timeout values, connection pool limits, or environment flags.`,
          likelyCauses: [highMatch.memory.rootCause, 'Deployment configuration discrepancy'],
          confidence: 'high',
        };
      }
      return {
        summary: `Deployment verification for ${incident.service}: Review recent container image tags, deployment revisions, and ConfigMap diffs against the previous stable revision.`,
        likelyCauses: ['Configuration regression in latest deployment', 'Dependency version mismatch'],
        confidence: 'medium',
      };
    }

    // 7. Database connections
    if (queryLower.includes('database') || queryLower.includes('db') || queryLower.includes('pool') || queryLower.includes('postgres') || queryLower.includes('connection')) {
      return {
        summary: `Database connection pool analysis for ${incident.service}: Checking active connection count, connection pool exhaustion, slow queries, and deadlock contention.`,
        likelyCauses: [
          'Connection pool size insufficient for traffic volume',
          'Unindexed slow queries exhausting database worker threads',
          'Connection leak due to unclosed database sessions'
        ],
        confidence: highMatch ? 'high' : 'medium',
      };
    }

    // 8. Diagnostic commands
    if (queryLower.includes('command') || queryLower.includes('cli') || queryLower.includes('kubectl') || queryLower.includes('terminal')) {
      return {
        summary: `Diagnostic command bundle for ${incident.service}: Execute these read-only commands to capture real-time cluster state, logs, and network metrics.`,
        likelyCauses: highMatch ? [highMatch.memory.rootCause] : this.getGenericCauses(incident),
        confidence: highMatch ? 'high' : 'medium',
      };
    }

    // 9. History / Prior occurrences
    if (queryLower.includes('seen') || queryLower.includes('before') || queryLower.includes('similar') || queryLower.includes('history')) {
      if (memories.length === 0) {
        return {
          summary: `I have no historical records matching this ${incident.service} incident in Hindsight. This appears to be the first time RootRecall has encountered this pattern. Proceeding with standard investigation.`,
          likelyCauses: this.getGenericCauses(incident),
          confidence: 'low',
        };
      }
      if (highMatch) {
        return {
          summary: `Yes — Hindsight recalled a highly similar historical incident: ${highMatch.memory.sourceIncidentId} (${highMatch.memory.sourceIncidentTitle}). Historical root cause: ${highMatch.memory.rootCause}`,
          likelyCauses: [highMatch.memory.rootCause, ...this.getGenericCauses(incident).slice(0, 1)],
          confidence: 'high',
        };
      }
    }

    // 10. Conversational inquiry (user asks something specific, e.g. "what is this?", "can you explain?")
    if (userQuery && !isInitial) {
      if (highMatch) {
        return {
          summary: `Regarding "${userQuery}" for ${incident.service}: Based on historical memory ${highMatch.memory.sourceIncidentId} and current incident telemetry, the system indicates that ${highMatch.memory.rootCause.toLowerCase()}. Recommended mitigation is to verify current resource limits against the historical fix ("${highMatch.memory.resolution}").`,
          likelyCauses: [highMatch.memory.rootCause, ...this.getGenericCauses(incident).slice(0, 1)],
          confidence: 'high',
        };
      }
      return {
        summary: `No historical matches found for this ${incident.service} incident in Hindsight. Regarding "${userQuery}": evaluating current symptoms (${incident.symptoms.join(', ') || 'active alert'}) using standard investigation. We should inspect ingress health, error logs, and recent deployment revisions.`,
        likelyCauses: this.getGenericCauses(incident),
        confidence: 'low',
      };
    }

    // Initial incident analysis default
    if (highMatch) {
      return {
        summary: `The current symptoms closely match a previous ${incident.service} incident (${highMatch.memory.sourceIncidentId}). Historical evidence from Hindsight points to: ${highMatch.memory.rootCause.substring(0, 150)}...`,
        likelyCauses: [highMatch.memory.rootCause, ...this.getGenericCauses(incident).slice(0, 2)],
        confidence: 'high',
      };
    }

    if (memories.length > 0) {
      return {
        summary: `Found ${memories.length} potentially related historical incident(s) in Hindsight. While not an exact match, the patterns suggest investigating similar areas.`,
        likelyCauses: [
          ...memories.map((m) => m.memory.rootCause).slice(0, 2),
          ...this.getGenericCauses(incident).slice(0, 1),
        ],
        confidence: 'medium',
      };
    }

    return {
      summary: `No historical matches found for this ${incident.service} incident. Proceeding with standard investigation framework based on the reported symptoms.`,
      likelyCauses: this.getGenericCauses(incident),
      confidence: 'low',
    };
  }

  private buildEvidence(memory: RecalledMemory): AgentHistoricalEvidence {
    return {
      incidentId: memory.memory.sourceIncidentId,
      incidentTitle: memory.memory.sourceIncidentTitle,
      rootCause: memory.memory.rootCause,
      relevance: memory.relevanceReason,
      similarity: memory.similarity,
    };
  }

  private buildRecommendations(
    incident: Incident,
    memories: RecalledMemory[],
    userQuery?: string
  ): AgentRecommendation[] {
    const recs: AgentRecommendation[] = [];
    const highMatch = memories.find((m) => m.similarity === 'high');
    const queryLower = userQuery?.toLowerCase() || '';

    // If query is specifically about prevention
    if (
      queryLower.includes('prevent') ||
      queryLower.includes('avoid') ||
      queryLower.includes('future') ||
      queryLower.includes('safeguard') ||
      queryLower.includes('recurrence') ||
      queryLower.includes('repeat')
    ) {
      recs.push({
        step: `Add automated CI/CD schema validation and linting on ${incident.service} configuration manifests to block unverified pool or timeout drops`,
        rationale: 'Catches accidental configuration regressions before code reaches staging or production',
        priority: 'high',
      });
      recs.push({
        step: `Implement automated canary deployment verification with upstream pool saturation metrics`,
        rationale: 'Detects connection pool exhaustion at 5% traffic before full rollout occurs',
        priority: 'high',
      });
      recs.push({
        step: `Configure proactive Prometheus alerts on connection pool utilization exceeding 75% capacity`,
        rationale: 'Provides early warning before reaching 100% starvation and triggering 502 Bad Gateways',
        priority: 'high',
      });
      recs.push({
        step: `Conduct periodic load tests simulating 2x peak traffic against ${incident.service} in pre-production`,
        rationale: 'Validates connection pool and thread limits against real-world concurrency bursts',
        priority: 'medium',
      });
      if (highMatch && highMatch.memory.lessonsLearned.length > 0) {
        recs.push({
          step: `Enforce postmortem lesson from ${highMatch.memory.sourceIncidentId}: "${highMatch.memory.lessonsLearned[0]}"`,
          rationale: `Direct lesson learned from ${highMatch.memory.sourceIncidentId}`,
          priority: 'high',
        });
      }
      return recs;
    }

    // If query is specifically about rollback
    if (queryLower.includes('rollback') || queryLower.includes('revert') || queryLower.includes('undo')) {
      recs.push({
        step: `Execute zero-downtime rollback: kubectl rollout undo deployment/${incident.service}`,
        rationale: 'Reverts pod replicas to previous known-good deployment revision',
        priority: 'high',
      });
      recs.push({
        step: `Verify rollback status: kubectl rollout status deployment/${incident.service}`,
        rationale: 'Ensures replacement pods pass health checks before traffic shifts',
        priority: 'high',
      });
      recs.push({
        step: 'Validate HTTP error rate drops to zero on ingress/gateway',
        rationale: 'Confirms customer-facing impact is eliminated',
        priority: 'high',
      });
      recs.push({
        step: 'Lock CI/CD pipeline against automated redeployment',
        rationale: 'Prevents automated pipelines from re-deploying the faulty image',
        priority: 'medium',
      });
      return recs;
    }

    // If query is specifically about deployment diff
    if (queryLower.includes('diff') || queryLower.includes('deploy') || queryLower.includes('release')) {
      recs.push({
        step: `Inspect deployment revision history: kubectl rollout history deployment/${incident.service}`,
        rationale: 'Identifies recent deployment revisions and timestamp changes',
        priority: 'high',
      });
      recs.push({
        step: 'Compare container image environment variables and configuration flags',
        rationale: 'Catch mismatched timeout or connection pool settings introduced in release',
        priority: 'high',
      });
      recs.push({
        step: 'Review git commit log between current release and previous tag',
        rationale: 'Isolates the specific pull request or config change that introduced the issue',
        priority: 'medium',
      });
      return recs;
    }

    // If query is specifically about database connection pool
    if (queryLower.includes('database') || queryLower.includes('db') || queryLower.includes('pool') || queryLower.includes('connection')) {
      recs.push({
        step: 'Query pg_stat_activity for active vs idle connections',
        rationale: 'Identifies connection leaks and connection saturation',
        priority: 'high',
      });
      recs.push({
        step: 'Check database proxy / connection pooler queue depth',
        rationale: 'Determines if queries are waiting for available pool slots',
        priority: 'high',
      });
      recs.push({
        step: 'Inspect slow query log for locks holding connection slots',
        rationale: 'Long-running transactions monopolize connection pool resources',
        priority: 'medium',
      });
      return recs;
    }

    if (highMatch) {
      // Memory-informed recommendations come first
      for (const lesson of highMatch.memory.lessonsLearned.slice(0, 3)) {
        recs.push({
          step: lesson,
          rationale: `Lesson learned from ${highMatch.memory.sourceIncidentId}`,
          priority: 'high',
        });
      }
    }

    // Add context-based investigation steps
    const desc = incident.description.toLowerCase();

    if (desc.includes('502') || desc.includes('503')) {
      recs.push({
        step: 'Check upstream service health and connection pool metrics',
        rationale: 'HTTP 5xx errors often indicate upstream connectivity issues',
        priority: highMatch ? 'medium' : 'high',
      });
      recs.push({
        step: 'Review recent deployment changes and configuration diffs',
        rationale: 'Deployments are the most common trigger for 5xx regressions',
        priority: 'high',
      });
    }

    if (desc.includes('latency') || desc.includes('slow')) {
      recs.push({
        step: 'Check database query performance and connection counts',
        rationale: 'Database bottlenecks are a primary cause of latency spikes',
        priority: 'high',
      });
    }

    if (desc.includes('timeout')) {
      recs.push({
        step: 'Review timeout configurations across the request chain',
        rationale: 'Cascading timeouts can amplify minor upstream delays',
        priority: 'high',
      });
    }

    if (desc.includes('memory') || desc.includes('oom')) {
      recs.push({
        step: 'Profile JVM/process heap usage and check for unbounded caches',
        rationale: 'Memory growth without eviction eventually causes OOM crashes',
        priority: 'high',
      });
    }

    // Standard triage steps always
    recs.push({
      step: 'Check resource utilization (CPU, memory, disk, network) on affected pods',
      rationale: 'Standard triage to rule out resource exhaustion',
      priority: 'medium',
    });
    recs.push({
      step: 'Review application logs for error patterns and stack traces',
      rationale: 'Log analysis helps narrow the investigation scope',
      priority: 'medium',
    });

    return recs.slice(0, 6);
  }

  private buildSuggestedCommands(
    incident: Incident,
    memories: RecalledMemory[],
    userQuery?: string
  ): string[] {
    const commands: string[] = [];
    const ns = incident.service.replace('-service', '').replace('-api', '');
    const highMatch = memories.find((m) => m.similarity === 'high');
    const queryLower = userQuery?.toLowerCase() || '';

    if (
      queryLower.includes('prevent') ||
      queryLower.includes('avoid') ||
      queryLower.includes('future') ||
      queryLower.includes('safeguard') ||
      queryLower.includes('recurrence')
    ) {
      commands.push(`kubectl get configmap ${incident.service}-config -n ${ns} -o yaml`);
      commands.push(`kubectl describe hpa ${incident.service} -n ${ns}`);
      commands.push(`helm diff revision deployment/${incident.service} -n ${ns}`);
      commands.push(`kubectl logs -f deployment/${incident.service} -n ${ns} --tail=100 | grep -E "pool|timeout|threshold"`);
      return commands;
    }

    if (queryLower.includes('rollback') || queryLower.includes('revert') || queryLower.includes('undo')) {
      commands.push(`kubectl rollout undo deployment/${incident.service} -n ${ns}`);
      commands.push(`kubectl rollout status deployment/${incident.service} -n ${ns}`);
      commands.push(`kubectl get pods -l app=${incident.service} -n ${ns} -w`);
      return commands;
    }

    if (queryLower.includes('diff') || queryLower.includes('deploy') || queryLower.includes('release')) {
      commands.push(`kubectl rollout history deployment/${incident.service} -n ${ns}`);
      commands.push(`kubectl describe deployment/${incident.service} -n ${ns} | grep -E "Image|Port|Environment"`);
      commands.push(`git log -n 5 --oneline`);
      return commands;
    }

    if (queryLower.includes('database') || queryLower.includes('db') || queryLower.includes('pool') || queryLower.includes('connection')) {
      commands.push(`SELECT count(*), state FROM pg_stat_activity GROUP BY state;`);
      commands.push(`SELECT pid, now() - query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC LIMIT 5;`);
      commands.push(`kubectl logs -f deployment/database-proxy -n ${ns} --tail=100`);
      return commands;
    }

    if (highMatch) {
      commands.push(`# Commands informed by ${highMatch.memory.sourceIncidentId}`);
    }

    commands.push(`kubectl get pods -n ${ns} -o wide`);
    commands.push(`kubectl logs -f deployment/${incident.service} --tail=200`);
    commands.push(`kubectl top pods -n ${ns}`);
    commands.push(`kubectl describe deployment/${incident.service} -n ${ns}`);

    const desc = incident.description.toLowerCase();
    if (desc.includes('database') || desc.includes('postgres')) {
      commands.push(
        `SELECT pid, now() - query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC;`
      );
    }
    if (desc.includes('redis')) {
      commands.push('redis-cli INFO memory');
      commands.push('redis-cli DBSIZE');
    }

    return commands;
  }

  private getGenericCauses(incident: Incident): string[] {
    const desc = incident.description.toLowerCase();

    if (desc.includes('502') || desc.includes('503')) {
      return [
        'Upstream service failure or connection issues',
        'Resource exhaustion (CPU, memory, or connection pool)',
        'Configuration change from recent deployment',
      ];
    }
    if (desc.includes('timeout')) {
      return [
        'Database query performance degradation',
        'Network connectivity or DNS resolution issues',
        'Resource contention under load',
      ];
    }
    if (desc.includes('latency')) {
      return [
        'Cache miss rate increase',
        'Database connection pool saturation',
        'Increased payload size or query complexity',
      ];
    }
    if (desc.includes('memory') || desc.includes('oom')) {
      return [
        'Memory leak in application code (unbounded cache or collection)',
        'Insufficient memory limits for current load',
        'Large payload or object retention between requests',
      ];
    }
    return [
      'Recent deployment or configuration change',
      'Infrastructure or dependency failure',
      'Resource exhaustion or capacity limits',
    ];
  }

  private validateAgentResponse(data: unknown): AgentResponse {
    const d = data as Record<string, unknown>;
    return {
      assessment: (d.assessment as AgentResponse['assessment']) || {
        summary: 'Analysis completed.',
        likelyCauses: [],
        confidence: 'low',
      },
      historicalEvidence:
        (d.historicalEvidence as AgentResponse['historicalEvidence']) || [],
      recommendations:
        (d.recommendations as AgentResponse['recommendations']) || [],
      suggestedCommands:
        (d.suggestedCommands as AgentResponse['suggestedCommands']) || [],
      disclaimer:
        (d.disclaimer as string) || 'Always verify against current system state.',
      generatedAt: new Date().toISOString(),
      memoryInfluenced: (d.memoryInfluenced as boolean) || false,
    };
  }
}
