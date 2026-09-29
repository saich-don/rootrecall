// ============================================================
// Hindsight Memory Service
// All Hindsight API calls go through server-side routes.
// Local similarity search remains as development fallback.
// ============================================================

import {
  Incident,
  MemoryEntry,
  RecalledMemory,
  ConnectionStatus,
  AppConfig,
} from '../types';

/**
 * MemoryService abstracts the Hindsight integration layer.
 * In production: calls server-side /api/memory/* routes (which use the real Hindsight API).
 * In development (no key): uses local similarity search as a functional fallback.
 *
 * The server routes correctly parse RecallResponse = { results: Array<RecallResult> }
 * where each RecallResult has a `text: string` field — fixing the prior Array.isArray bug.
 */
export class MemoryService {
  private localMemories: MemoryEntry[] = [];

  // ──────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────

  /**
   * Check connection status to Hindsight via server status endpoint.
   */
  async checkConnection(): Promise<ConnectionStatus> {
    try {
      const res = await fetch('/api/status');
      if (!res.ok) return 'error';
      const status = await res.json();
      if (status.hindsight?.configured) return 'connected';
      return 'not-configured';
    } catch {
      return 'error';
    }
  }

  /**
   * Retain incident knowledge into Hindsight memory via server route.
   * Falls back gracefully if server route is unavailable.
   */
  async retainIncident(incident: Incident, config?: AppConfig): Promise<MemoryEntry> {
    const memory = this.incidentToMemory(incident);
    const retainText = this.buildRetainText(incident, memory);

    // Attempt real Hindsight retain via server route (API key stays server-side)
    try {
      const res = await fetch('/api/memory/retain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankName: undefined, // server uses HINDSIGHT_BANK env var or config
          content: retainText,
          config,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          console.info(`[MemoryService] Retained ${incident.id} in Hindsight`);
        } else {
          console.info(`[MemoryService] Hindsight retain: ${data.reason || 'local mode'}`);
        }
      }
    } catch (err) {
      console.warn('[MemoryService] Server retain failed, continuing with local:', err);
    }

    // Always store locally for immediate UI access and local search
    const existingIdx = this.localMemories.findIndex(
      (m) => m.sourceIncidentId === incident.id
    );
    if (existingIdx >= 0) {
      this.localMemories[existingIdx] = memory;
    } else {
      this.localMemories.push(memory);
    }

    return memory;
  }

  /**
   * Recall relevant memories for a given incident.
   * Calls server route (which correctly parses RecallResponse.results[].text),
   * then supplements with local similarity search.
   */
  async recallForIncident(incident: Incident, config?: AppConfig): Promise<RecalledMemory[]> {
    const query = this.buildRecallQuery(incident);
    let hindsightTexts: string[] = [];

    // Attempt real Hindsight recall via server route
    try {
      const res = await fetch('/api/memory/recall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, config }),
      });
      if (res.ok) {
        const data = await res.json();
        // Server route returns { results: string[] } — already extracted from RecallResult.text
        if (Array.isArray(data.results)) {
          hindsightTexts = data.results;
          if (hindsightTexts.length > 0) {
            console.info(`[MemoryService] Hindsight recalled ${hindsightTexts.length} result(s)`);
          }
        }
      }
    } catch (err) {
      console.warn('[MemoryService] Server recall failed, using local only:', err);
    }

    // Local similarity matching
    const localMatches = this.localSimilaritySearch(incident);

    // Merge: prefer Hindsight semantic results, supplement with local
    const mergedMap = new Map<string, RecalledMemory>();
    for (const m of localMatches) {
      mergedMap.set(m.memory.sourceIncidentId, m);
    }

    // Upgrade local matches to 'high' if Hindsight semantically matched them,
    // or hydrate directly if memory was persisted in Hindsight Cloud across restarts
    for (const text of hindsightTexts) {
      let matched = false;
      for (const mem of this.localMemories) {
        if (
          text.includes(mem.sourceIncidentId) ||
          text.includes(mem.sourceIncidentTitle) ||
          text.includes(mem.service)
        ) {
          if (mem.sourceIncidentId !== incident.id) {
            mergedMap.set(mem.sourceIncidentId, {
              memory: mem,
              similarity: 'high',
              relevanceReason: 'Hindsight recalled this via semantic similarity.',
            });
            matched = true;
          }
        }
      }

      // If not yet in local memory (e.g. app restart or external retain), parse and restore
      if (!matched) {
        const parsed = this.parseRetainedText(text, incident.id);
        if (parsed) {
          this.localMemories.push(parsed);
          mergedMap.set(parsed.sourceIncidentId, {
            memory: parsed,
            similarity: 'high',
            relevanceReason: 'Hindsight semantic memory recalled from persistent cloud bank.',
          });
        }
      }
    }

    return Array.from(mergedMap.values())
      .filter((m) => m.memory.sourceIncidentId !== incident.id)
      .sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.similarity] - order[b.similarity];
      })
      .slice(0, 5);
  }

  /**
   * Recall relevant memories using free-form user query (direct agent chat).
   */
  async recallByQuery(query: string, config?: AppConfig): Promise<RecalledMemory[]> {
    let hindsightTexts: string[] = [];

    // Attempt real Hindsight recall via server route
    try {
      const res = await fetch('/api/memory/recall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, config }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.results)) {
          hindsightTexts = data.results;
          if (hindsightTexts.length > 0) {
            console.info(`[MemoryService] Hindsight recalled ${hindsightTexts.length} result(s) for query: "${query}"`);
          }
        }
      }
    } catch (err) {
      console.warn('[MemoryService] Server recall failed, using local only:', err);
    }

    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);
    const matched = new Map<string, RecalledMemory>();

    // Local similarity matching across stored memories
    for (const mem of this.localMemories) {
      let score = 0;
      if (queryLower.includes(mem.service.toLowerCase())) score += 4;
      if (queryLower.includes(mem.sourceIncidentId.toLowerCase())) score += 6;
      for (const kw of mem.keywords) {
        if (queryLower.includes(kw.toLowerCase())) score += 3;
      }
      for (const word of queryWords) {
        if (mem.rootCause.toLowerCase().includes(word)) score += 1;
        if (mem.sourceIncidentTitle.toLowerCase().includes(word)) score += 1;
        if (mem.resolution.toLowerCase().includes(word)) score += 1;
        for (const lesson of mem.lessonsLearned) {
          if (lesson.toLowerCase().includes(word)) score += 1;
        }
      }

      if (score > 0) {
        const similarity: 'high' | 'medium' | 'low' =
          score >= 5 ? 'high' : score >= 2 ? 'medium' : 'low';
        matched.set(mem.sourceIncidentId, {
          memory: mem,
          similarity,
          relevanceReason: `Matches ${mem.service} and keywords: ${mem.keywords.slice(0, 3).join(', ')}`,
        });
      }
    }

    // Upgrade or hydrate from Hindsight semantic results
    for (const text of hindsightTexts) {
      let found = false;
      for (const mem of this.localMemories) {
        if (
          text.includes(mem.sourceIncidentId) ||
          text.includes(mem.sourceIncidentTitle) ||
          text.includes(mem.service)
        ) {
          matched.set(mem.sourceIncidentId, {
            memory: mem,
            similarity: 'high',
            relevanceReason: 'Direct semantic match from Hindsight memory bank.',
          });
          found = true;
        }
      }
      if (!found) {
        const parsed = this.parseRetainedText(text, 'QUERY');
        if (parsed) {
          this.localMemories.push(parsed);
          matched.set(parsed.sourceIncidentId, {
            memory: parsed,
            similarity: 'high',
            relevanceReason: 'Hindsight semantic memory recalled from persistent cloud bank.',
          });
        }
      }
    }

    // Fallback: if query didn't match anything specific, return top 2 recent memories as context
    if (matched.size === 0 && this.localMemories.length > 0) {
      for (const mem of this.localMemories.slice(0, 2)) {
        matched.set(mem.sourceIncidentId, {
          memory: mem,
          similarity: 'low',
          relevanceReason: 'Recent organizational memory baseline.',
        });
      }
    }

    return Array.from(matched.values())
      .sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.similarity] - order[b.similarity];
      })
      .slice(0, 5);
  }

  /**
   * Get all stored memories.
   */
  getAllMemories(): MemoryEntry[] {
    return [...this.localMemories];
  }

  /**
   * Load seed memories.
   */
  loadMemories(memories: MemoryEntry[]): void {
    this.localMemories = [...memories];
  }

  /**
   * Clear all memories (for demo reset).
   */
  clearMemories(): void {
    this.localMemories = [];
  }

  /**
   * Get memory count.
   */
  getMemoryCount(): number {
    return this.localMemories.length;
  }

  // ──────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────

  private incidentToMemory(incident: Incident): MemoryEntry {
    return {
      id: `mem-${incident.id}-${Date.now()}`,
      sourceIncidentId: incident.id,
      sourceIncidentTitle: incident.title,
      service: incident.service,
      keywords: this.extractKeywords(incident),
      summary: `${incident.title}: ${incident.rootCause || incident.description}`,
      rootCause: incident.rootCause || '',
      resolution: incident.resolution || '',
      lessonsLearned: incident.lessonsLearned || [],
      severity: incident.severity,
      createdAt: new Date().toISOString(),
      status: 'active',
    };
  }

  private extractKeywords(incident: Incident): string[] {
    const keywords = new Set<string>();
    keywords.add(incident.service);
    const text =
      `${incident.description} ${incident.rootCause || ''} ${incident.resolution || ''}`.toLowerCase();
    const keyTerms = [
      '502', '503', '500', 'timeout', 'deployment', 'connection pool',
      'latency', 'memory', 'database', 'queue', 'redis', 'oom',
      'dns', 'deadlock', 'cache', 'leak', 'cpu', 'disk',
    ];
    for (const term of keyTerms) {
      if (text.includes(term)) keywords.add(term.replace(' ', '-'));
    }
    return Array.from(keywords);
  }

  private buildRetainText(incident: Incident, memory: MemoryEntry): string {
    return [
      `INCIDENT: ${incident.id} — ${incident.title}`,
      `SERVICE: ${incident.service}`,
      `SEVERITY: ${incident.severity}`,
      `DESCRIPTION: ${incident.description}`,
      `SYMPTOMS: ${incident.symptoms.join('; ')}`,
      `ROOT CAUSE: ${memory.rootCause}`,
      `RESOLUTION: ${memory.resolution}`,
      `LESSONS LEARNED: ${memory.lessonsLearned.join('; ')}`,
      `KEYWORDS: ${memory.keywords.join(', ')}`,
    ].join('\n');
  }

  private parseRetainedText(text: string, currentIncidentId: string): MemoryEntry | null {
    const incMatch = text.match(/INCIDENT:\s*([A-Za-z0-9-_]+)\s*(?:—|-|:)\s*([^\n]+)/i);
    let id = incMatch ? incMatch[1].trim() : null;
    let title = incMatch ? incMatch[2].trim() : '';

    if (!id) {
      const generalIdMatch = text.match(/\b(INC-\d+)\b/i);
      if (generalIdMatch) {
        id = generalIdMatch[1].toUpperCase();
        title = `Historical Incident ${id}`;
      }
    }

    if (!id || id === currentIncidentId) return null;

    const serviceMatch = text.match(/SERVICE:\s*([^\n]+)/i);
    const service = serviceMatch ? serviceMatch[1].trim() : 'production-service';

    const rootCauseMatch = text.match(/ROOT CAUSE:\s*([^\n]+)/i);
    const rootCause = rootCauseMatch ? rootCauseMatch[1].trim() : text.substring(0, 160);

    const resolutionMatch = text.match(/RESOLUTION:\s*([^\n]+)/i);
    const resolution = resolutionMatch
      ? resolutionMatch[1].trim()
      : 'Applied verified mitigation from historical resolution.';

    const lessonsMatch = text.match(/LESSONS LEARNED:\s*([^\n]+)/i);
    const lessonsLearned = lessonsMatch
      ? lessonsMatch[1].split(';').map((s) => s.trim()).filter(Boolean)
      : [];

    const severityMatch = text.match(/SEVERITY:\s*([^\n]+)/i);
    const severity = (severityMatch ? severityMatch[1].trim() : 'SEV-2') as any;

    const keywordsMatch = text.match(/KEYWORDS:\s*([^\n]+)/i);
    const keywords = keywordsMatch
      ? keywordsMatch[1].split(',').map((s) => s.trim().replace(/\s+/g, '-')).filter(Boolean)
      : [service, 'hindsight-memory'];

    return {
      id: `mem-${id}`,
      sourceIncidentId: id,
      sourceIncidentTitle: title || `Incident ${id}`,
      service,
      keywords,
      summary: `${title || id}: ${rootCause}`,
      rootCause,
      resolution,
      lessonsLearned,
      severity,
      createdAt: new Date().toISOString(),
      status: 'active',
    };
  }

  private buildRecallQuery(incident: Incident): string {
    return [
      `Service: ${incident.service}`,
      `Description: ${incident.description}`,
      `Symptoms: ${incident.symptoms.join(', ')}`,
      `Looking for: similar incidents, root causes, resolutions, lessons learned`,
    ].join('\n');
  }

  private localSimilaritySearch(incident: Incident): RecalledMemory[] {
    const results: RecalledMemory[] = [];
    const incidentText =
      `${incident.description} ${incident.symptoms.join(' ')}`.toLowerCase();
    const incidentService = incident.service.toLowerCase();

    for (const memory of this.localMemories) {
      if (memory.sourceIncidentId === incident.id) continue;

      let score = 0;
      const reasons: string[] = [];

      // Service match (strong signal)
      if (memory.service.toLowerCase() === incidentService) {
        score += 40;
        reasons.push('Same service');
      }

      // Keyword overlap
      const memoryText =
        `${memory.summary} ${memory.rootCause} ${memory.resolution}`.toLowerCase();
      const sharedKeywords = memory.keywords.filter((kw) =>
        incidentText.includes(kw.replace('-', ' '))
      );
      score += sharedKeywords.length * 10;
      if (sharedKeywords.length > 0) {
        reasons.push(`Shared patterns: ${sharedKeywords.join(', ')}`);
      }

      // Text similarity (simple word overlap)
      const incidentWords = new Set(
        incidentText.split(/\s+/).filter((w) => w.length > 3)
      );
      const memWords = new Set(
        memoryText.split(/\s+/).filter((w) => w.length > 3)
      );
      let overlap = 0;
      for (const word of incidentWords) {
        if (memWords.has(word)) overlap++;
      }
      score += Math.min(overlap * 3, 30);

      if (score >= 20) {
        const similarity: RecalledMemory['similarity'] =
          score >= 50 ? 'high' : score >= 30 ? 'medium' : 'low';
        results.push({
          memory,
          similarity,
          relevanceReason: reasons.join('. ') || 'Text similarity detected.',
        });
      }
    }

    return results;
  }
}
