'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Brain,
  Send,
  AlertTriangle,
  CheckCircle,
  Clock,
  Server,
  Shield,
  Terminal,
  Target,
  Loader2,
  ChevronRight,
  ChevronDown,
  Info,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { AgentResponse, RecalledMemory, Severity, IncidentStatus } from '@/lib/types';

const EMPTY_CONVERSATIONS: never[] = [];

interface IncidentWorkspaceProps {
  incidentId: string;
  onBack: () => void;
}

export function IncidentWorkspace({ incidentId, onBack }: IncidentWorkspaceProps) {
  const incident = useAppStore((s) => s.incidents.find((i) => i.id === incidentId));
  const conversationsRaw = useAppStore((s) => s.conversations[incidentId]);
  const conversations = conversationsRaw ?? EMPTY_CONVERSATIONS;
  const recalledMemories = useAppStore((s) => s.recalledMemories);
  const isAnalyzing = useAppStore((s) => s.isAnalyzing);
  const config = useAppStore((s) => s.config);

  const [userQuery, setUserQuery] = useState('');
  const [showResolve, setShowResolve] = useState(false);
  const [rootCause, setRootCause] = useState('');
  const [resolution, setResolution] = useState('');
  const [lessons, setLessons] = useState('');

  const didAutoAnalyze = useRef<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-analyze on first open
  useEffect(() => {
    if (incident && !conversationsRaw && didAutoAnalyze.current !== incidentId) {
      didAutoAnalyze.current = incidentId;
      useAppStore.getState().analyzeIncident(incidentId);
    }
  }, [incidentId, incident, conversationsRaw]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, isAnalyzing]);

  if (!incident) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--color-text-muted)]">Incident not found.</p>
      </div>
    );
  }

  const handleAsk = useCallback((queryOverride?: string) => {
    const q = queryOverride ?? userQuery;
    if (!q.trim() || isAnalyzing) return;
    useAppStore.getState().analyzeIncident(incidentId, q);
    setUserQuery('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [userQuery, isAnalyzing, incidentId]);

  const handleResolve = async () => {
    if (!rootCause || !resolution) return;
    await useAppStore.getState().resolveIncident(
      incidentId,
      rootCause,
      resolution,
      lessons.split('\n').filter((l) => l.trim())
    );
    setShowResolve(false);
  };

  const sevColors: Record<Severity, string> = {
    'SEV-1': 'badge-sev1',
    'SEV-2': 'badge-sev2',
    'SEV-3': 'badge-sev3',
    'SEV-4': 'badge-sev4',
  };

  const statusColors: Record<IncidentStatus, string> = {
    detected: 'badge-detected',
    investigating: 'badge-investigating',
    identified: 'badge-investigating',
    mitigating: 'badge-mitigating',
    resolved: 'badge-resolved',
    postmortem: 'badge-resolved',
  };

  const highMatch = recalledMemories.find((m) => m.similarity === 'high');
  const suggestedQueries = highMatch
    ? [
        `What worked in ${highMatch.memory.sourceIncidentId}?`,
        'Check deployment diff',
        'Suggest rollback plan',
        'Analyze database connections',
        'What should I check first?',
      ]
    : [
        'Have we seen this before?',
        'Check deployment diff',
        'Suggest rollback plan',
        'What should I check first?',
        'Show me relevant commands',
      ];

  return (
    <div className="animate-fade-in h-[calc(100vh-80px)] -m-6 flex flex-col">
      {/* Compact incident header bar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] flex-shrink-0">
        <button onClick={onBack} className="btn btn-ghost p-1.5" aria-label="Back to incidents">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs font-mono text-[var(--color-text-muted)] flex-shrink-0">{incident.id}</span>
          <span className={`badge text-[10px] ${sevColors[incident.severity]}`}>{incident.severity}</span>
          <span className={`badge text-[10px] ${statusColors[incident.status]}`}>{incident.status}</span>
          {incident.memoryRetained && (
            <span className="badge badge-memory text-[10px]"><Brain className="w-3 h-3" /> Retained</span>
          )}
          <h1 className="text-sm font-semibold truncate ml-2">{incident.title}</h1>
        </div>
        {incident.status !== 'resolved' && (
          <button onClick={() => setShowResolve(true)} className="btn btn-primary text-xs h-8 flex-shrink-0">
            <CheckCircle className="w-3.5 h-3.5" /> Resolve
          </button>
        )}
      </div>

      {/* Three-column layout - fills remaining height */}
      <div className="flex-1 grid grid-cols-12 min-h-0 overflow-hidden">
        {/* ═══════ LEFT: Incident Context ═══════ */}
        <div className="col-span-3 overflow-y-auto p-4 space-y-3 border-r border-[var(--color-border-subtle)]">
          <ContextCard title="Details" icon={Server}>
            <InfoRow label="Service" value={incident.service} />
            <InfoRow label="Environment" value={incident.environment} />
            <InfoRow label="Severity" value={incident.severity} />
            <InfoRow label="Created" value={new Date(incident.createdAt).toLocaleString()} />
            {incident.resolvedAt && (
              <InfoRow label="Resolved" value={new Date(incident.resolvedAt).toLocaleString()} />
            )}
          </ContextCard>

          <ContextCard title="Description" icon={AlertTriangle}>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              {incident.description}
            </p>
          </ContextCard>

          {incident.symptoms.length > 0 && (
            <ContextCard title="Symptoms" icon={Target}>
              <ul className="space-y-1.5">
                {incident.symptoms.map((s, i) => (
                  <li key={i} className="text-xs text-[var(--color-text-secondary)] flex gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0 text-[var(--color-text-muted)]" />
                    {s}
                  </li>
                ))}
              </ul>
            </ContextCard>
          )}

          {incident.logs.length > 0 && (
            <ContextCard title="Recent Logs" icon={Terminal}>
              <div className="space-y-2">
                {incident.logs.slice(0, 3).map((log, i) => (
                  <div key={i} className="code-block text-[10px] leading-snug">
                    <span className={`log-${log.level} font-bold`}>
                      [{log.level.toUpperCase()}]
                    </span>{' '}
                    <span className="text-[var(--color-text-muted)]">{log.service}</span>
                    <br />
                    {log.message}
                  </div>
                ))}
              </div>
            </ContextCard>
          )}

          {incident.rootCause && (
            <ContextCard title="Root Cause" icon={Shield}>
              <p className="text-xs text-[var(--color-status-resolved)] leading-relaxed">
                {incident.rootCause}
              </p>
            </ContextCard>
          )}
        </div>

        {/* ═══════ CENTER: Chat Interface ═══════ */}
        <div className="col-span-6 flex flex-col min-h-0 bg-[var(--color-surface-0)]">
          {/* Agent Header */}
          <div className="chat-header flex items-center justify-between px-5 py-3 border-b border-[var(--color-border-subtle)] flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src="/favicon.png" alt="RootRecall" className="w-8 h-8 rounded-lg shadow-md" />
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--color-surface-1)] ${config.hindsight.enabled ? 'bg-[var(--color-status-resolved)]' : 'bg-[var(--color-sev-3)]'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold leading-tight">RootRecall Agent</h3>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]">Incident Intelligence</span>
                </div>
                <p className="text-[10px] text-[var(--color-text-muted)]">
                  {config.hindsight.enabled ? 'Hindsight Memory Connected · Memory Active' : 'Deterministic Mode · Local Memory Engine'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="chat-status-pill flex items-center gap-1.5 px-2.5 py-1 rounded-full">
                <Sparkles className="w-3 h-3 text-[var(--color-brand-400)]" />
                <span className="text-[10px] font-medium text-[var(--color-text-secondary)]">
                  {config.llm.enabled ? config.llm.provider : 'Deterministic'}
                </span>
              </div>
            </div>
          </div>

          {/* Memory grounding indicator banner */}
          <div className="px-5 pt-3 pb-1 flex-shrink-0">
            {recalledMemories.length > 0 ? (
              <div className="px-3.5 py-2 rounded-lg bg-[oklch(0.18_0.02_290)] border border-[oklch(0.65_0.2_290/0.3)] flex items-center justify-between text-xs text-[var(--color-memory)] animate-fade-in shadow-sm">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 flex-shrink-0 text-[var(--color-memory)]" />
                  <span className="font-semibold text-white">
                    {recalledMemories.length} relevant {recalledMemories.length === 1 ? 'memory' : 'memories'} recalled from Hindsight
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[oklch(0.28_0.05_290)] text-[var(--color-memory)] border border-[oklch(0.65_0.2_290/0.4)]">
                  Grounding Active
                </span>
              </div>
            ) : (
              <div className="px-3.5 py-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                <div className="flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>No prior memories in Hindsight &middot; First-principles investigation</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-3)] text-[var(--color-text-muted)]">
                  Generic Mode
                </span>
              </div>
            )}
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 chat-scrollbar">
            {conversations.length === 0 && !isAnalyzing && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3 opacity-50">
                  <img src="/favicon.png" alt="" className="w-12 h-12 mx-auto rounded-xl opacity-40" />
                  <p className="text-sm text-[var(--color-text-muted)]">Starting analysis...</p>
                </div>
              </div>
            )}

            {conversations.map((msg, idx) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                style={{ animationDelay: `${Math.min(idx * 50, 200)}ms` }}
              >
                {msg.role === 'user' ? (
                  <UserBubble content={msg.content} timestamp={msg.timestamp} />
                ) : (
                  <AgentMessage
                    content={msg.content}
                    response={msg.agentResponse}
                    timestamp={msg.timestamp}
                  />
                )}
              </div>
            ))}

            {/* Typing / Searching indicator */}
            {isAnalyzing && (
              <div className="flex justify-start animate-fade-in">
                <div className="flex items-start gap-2.5 max-w-[90%]">
                  <img src="/favicon.png" alt="" className="w-7 h-7 rounded-lg mt-1 flex-shrink-0" />
                  <div className="agent-bubble px-4 py-3 space-y-2 border border-[var(--color-brand-500)]/30 shadow-md">
                    <div className="flex items-center gap-2">
                      <div className="typing-dots">
                        <span /><span /><span />
                      </div>
                      <span className="text-xs font-semibold text-[var(--color-text)]">
                        RootRecall is investigating...
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[var(--color-memory)] font-medium">
                      <Brain className="w-3.5 h-3.5 animate-pulse text-[var(--color-memory)]" />
                      <span>Searching organizational memory with Hindsight...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="flex-shrink-0 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-1)]">
            {/* Suggestion chips */}
            {incident.status !== 'resolved' && conversations.length > 0 && (
              <div className="px-4 pt-3 flex flex-wrap gap-1.5">
                {suggestedQueries.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleAsk(q)}
                    disabled={isAnalyzing}
                    className="suggestion-chip text-[11px] px-3 py-1.5 rounded-full border font-medium disabled:opacity-40"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Composer */}
            {incident.status !== 'resolved' && (
              <div className="p-3">
                <div className="chat-composer flex items-end gap-2 rounded-xl p-1.5 pr-2">
                  <textarea
                    ref={textareaRef}
                    className="flex-1 bg-transparent border-0 text-sm p-2.5 min-h-[40px] max-h-[120px] resize-none focus:outline-none placeholder:text-[var(--color-text-muted)]"
                    rows={1}
                    value={userQuery}
                    onChange={(e) => {
                      setUserQuery(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAsk();
                      }
                    }}
                    placeholder="Ask RootRecall about this incident..."
                    disabled={isAnalyzing}
                  />
                  <button
                    onClick={() => handleAsk()}
                    disabled={isAnalyzing || !userQuery.trim()}
                    className="send-btn mb-0.5 p-2 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {incident.status === 'resolved' && (
              <div className="px-4 py-3 text-center">
                <p className="text-xs text-[var(--color-text-muted)]">
                  This incident is resolved. Memory has been retained for future reference.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ═══════ RIGHT: Recall Stream ═══════ */}
        <div className="col-span-3 overflow-y-auto p-4 border-l border-[var(--color-border-subtle)]">
          <div className="space-y-4">
            <h3 className="text-xs font-semibold flex items-center gap-2 text-[var(--color-text-muted)] uppercase tracking-wider">
              <Brain className="w-3.5 h-3.5 text-[var(--color-memory)]" />
              Recall Stream
            </h3>

            {recalledMemories.length === 0 ? (
              <div className="recall-empty rounded-xl p-6 text-center">
                <Brain className="w-8 h-8 mx-auto text-[var(--color-text-muted)] mb-3 opacity-20" />
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                  No relevant historical memory found for this incident.
                </p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline connector */}
                <div className="absolute left-3 top-4 bottom-4 w-px bg-gradient-to-b from-[var(--color-memory)] via-[var(--color-border-subtle)] to-transparent" />

                <div className="space-y-4">
                  {recalledMemories.map((rm, idx) => (
                    <div
                      key={rm.memory.id}
                      className="relative pl-8 animate-slide-in"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <div className="absolute left-[9px] top-4 w-2 h-2 rounded-full bg-[var(--color-memory)] shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                      <MemoryCard recalledMemory={rm} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resolve Modal */}
      {showResolve && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowResolve(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Resolve incident"
        >
          <div className="card p-6 w-full max-w-lg animate-fade-in">
            <h2 className="text-lg font-semibold mb-4">Resolve {incident.id}</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="rc" className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                  Root Cause
                </label>
                <textarea
                  id="rc"
                  className="textarea"
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  placeholder="What was the root cause?"
                  required
                />
              </div>
              <div>
                <label htmlFor="res" className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                  Resolution
                </label>
                <textarea
                  id="res"
                  className="textarea"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="How was it resolved?"
                  required
                />
              </div>
              <div>
                <label htmlFor="lessons" className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                  Lessons Learned (one per line)
                </label>
                <textarea
                  id="lessons"
                  className="textarea"
                  value={lessons}
                  onChange={(e) => setLessons(e.target.value)}
                  placeholder="What should we remember for next time?"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowResolve(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button onClick={handleResolve} className="btn btn-primary">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Resolve & Retain Memory
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════
// Sub-components
// ════════════════════════════════════════════

function UserBubble({ content, timestamp }: { content: string; timestamp: string }) {
  return (
    <div className="max-w-[80%]">
      <div className="user-bubble px-4 py-3 rounded-2xl rounded-br-sm">
        <p className="text-sm leading-relaxed">{content}</p>
      </div>
      <p className="text-[10px] text-[var(--color-text-muted)] mt-1 text-right mr-1">
        {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
}

function AgentMessage({
  content,
  response,
  timestamp,
}: {
  content: string;
  response?: AgentResponse;
  timestamp: string;
}) {
  return (
    <div className="flex items-start gap-2.5 max-w-[92%] w-full">
      <img src="/favicon.png" alt="RootRecall" className="w-7 h-7 rounded-lg mt-1 flex-shrink-0 shadow-sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold">RootRecall</span>
          <span className="text-[10px] text-[var(--color-text-muted)]">
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="agent-bubble px-4 py-3.5 w-full">
          {response ? (
            <AgentChatContent response={response} />
          ) : (
            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] whitespace-pre-wrap">{content}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AgentChatContent({ response }: { response: AgentResponse }) {
  const [showCauses, setShowCauses] = useState(true);
  const [showSteps, setShowSteps] = useState(true);
  const [showCommands, setShowCommands] = useState(false);

  return (
    <div className="space-y-3">
      {/* Memory status tag */}
      {response.memoryInfluenced ? (
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[oklch(0.18_0.02_290)] border border-[oklch(0.65_0.2_290/0.4)] rounded-md">
          <Brain className="w-3 h-3 text-[var(--color-memory)]" />
          <span className="text-[10px] font-semibold text-[var(--color-memory)]">
            Historical Memory Applied
          </span>
        </div>
      ) : (
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-md">
          <Info className="w-3 h-3 text-[var(--color-text-muted)]" />
          <span className="text-[10px] font-semibold text-[var(--color-text-muted)]">
            No Memory — General Guidance
          </span>
        </div>
      )}

      {/* Summary — the conversational part */}
      <p className="text-sm leading-relaxed text-[var(--color-text)]">
        {response.assessment.summary}
      </p>

      {/* Collapsible: Likely Causes */}
      {response.assessment.likelyCauses.length > 0 && (
        <CollapsibleSection
          title="Likely Causes"
          count={response.assessment.likelyCauses.length}
          isOpen={showCauses}
          onToggle={() => setShowCauses(!showCauses)}
          variant="causes"
        >
          <ul className="space-y-1.5 pt-1">
            {response.assessment.likelyCauses.map((cause, i) => (
              <li key={i} className="text-[13px] text-[var(--color-text-secondary)] flex gap-2 items-start">
                <span className="text-[var(--color-sev-2)] mt-0.5">▸</span>
                <span className="leading-snug">{cause}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Collapsible: Recommended Steps */}
      {response.recommendations.length > 0 && (
        <CollapsibleSection
          title="Investigation Steps"
          count={response.recommendations.length}
          isOpen={showSteps}
          onToggle={() => setShowSteps(!showSteps)}
          variant="steps"
        >
          <ol className="space-y-2 pt-1">
            {response.recommendations.map((rec, i) => (
              <li key={i} className="text-[13px] text-[var(--color-text-secondary)] flex gap-2 items-start">
                <span className="text-[var(--color-brand-400)] font-bold mt-px flex-shrink-0">{i + 1}.</span>
                <div>
                  <p className="font-medium text-[var(--color-text)] leading-snug">{rec.step}</p>
                  {rec.rationale && (
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{rec.rationale}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </CollapsibleSection>
      )}

      {/* Collapsible: Commands */}
      {response.suggestedCommands.length > 0 && (
        <CollapsibleSection
          title="Commands"
          count={response.suggestedCommands.length}
          isOpen={showCommands}
          onToggle={() => setShowCommands(!showCommands)}
          variant="commands"
        >
          <div className="space-y-1.5 pt-1">
            {response.suggestedCommands.map((cmd, i) => (
              <CopyableCommand key={i} command={cmd} />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Inline historical evidence */}
      {response.historicalEvidence.length > 0 && (
        <div className="border-t border-[var(--color-border-subtle)] pt-3 mt-1">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="w-3 h-3 text-[var(--color-memory)]" />
            <span className="text-[10px] font-bold text-[var(--color-memory)] uppercase tracking-wider">
              Recalled Evidence
            </span>
          </div>
          <div className="space-y-2">
            {response.historicalEvidence.map((ev) => (
              <div
                key={ev.incidentId}
                className="evidence-card rounded-lg p-2.5 text-[13px]"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-[var(--color-text)]">{ev.incidentId}: {ev.incidentTitle}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                    ev.similarity === 'high' ? 'bg-[var(--color-status-resolved)] text-white' :
                    ev.similarity === 'medium' ? 'bg-[var(--color-sev-3)] text-white' :
                    'bg-[var(--color-surface-3)] text-[var(--color-text-muted)]'
                  }`}>{ev.similarity}</span>
                </div>
                <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                  {ev.rootCause}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confidence indicator */}
      <div className="flex items-center gap-2 pt-1">
        <div className={`w-1.5 h-1.5 rounded-full ${
          response.assessment.confidence === 'high' ? 'bg-[var(--color-status-resolved)]' :
          response.assessment.confidence === 'medium' ? 'bg-[var(--color-sev-3)]' :
          'bg-[var(--color-text-muted)]'
        }`} />
        <span className="text-[10px] text-[var(--color-text-muted)]">
          {response.assessment.confidence} confidence
        </span>
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  count,
  isOpen,
  onToggle,
  variant,
  children,
}: {
  title: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  variant: 'causes' | 'steps' | 'commands';
  children: React.ReactNode;
}) {
  const colors = {
    causes: 'text-[var(--color-sev-2)]',
    steps: 'text-[var(--color-brand-400)]',
    commands: 'text-[var(--color-text-muted)]',
  };

  return (
    <div className="collapsible-section rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--color-surface-2)] transition-colors"
      >
        {isOpen ? (
          <ChevronDown className={`w-3.5 h-3.5 ${colors[variant]}`} />
        ) : (
          <ChevronRight className={`w-3.5 h-3.5 ${colors[variant]}`} />
        )}
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
          {title}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-surface-3)] text-[var(--color-text-muted)]">
          {count}
        </span>
      </button>
      {isOpen && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

function CopyableCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group flex items-center gap-2 font-mono text-[11px] text-[var(--color-brand-400)] bg-[var(--color-surface-0)] p-2 rounded border border-[var(--color-border-subtle)] overflow-x-auto whitespace-pre">
      <span className="flex-1">$ {command}</span>
      <button
        onClick={copy}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-[var(--color-surface-3)]"
        aria-label="Copy command"
      >
        {copied ? (
          <Check className="w-3 h-3 text-[var(--color-status-resolved)]" />
        ) : (
          <Copy className="w-3 h-3 text-[var(--color-text-muted)]" />
        )}
      </button>
    </div>
  );
}

function ContextCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="context-card p-3.5 rounded-xl">
      <h4 className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
        <Icon className="w-3 h-3" />
        {title}
      </h4>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-[var(--color-border-subtle)] last:border-0">
      <span className="text-[11px] text-[var(--color-text-muted)]">{label}</span>
      <span className="text-[11px] font-medium">{value}</span>
    </div>
  );
}

function MemoryCard({ recalledMemory }: { recalledMemory: RecalledMemory }) {
  const { memory, similarity, relevanceReason } = recalledMemory;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="memory-card p-3.5 rounded-xl border border-[oklch(0.35_0.05_290/0.5)] bg-[oklch(0.14_0.02_290/0.6)] backdrop-blur-sm space-y-2.5 transition-all hover:border-[oklch(0.55_0.15_290/0.7)] shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-[var(--color-memory)] flex-shrink-0" />
          <span className="text-xs font-mono font-bold text-[var(--color-memory)]">
            {memory.sourceIncidentId}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]">
            {memory.service}
          </span>
        </div>
        <span
          className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
            similarity === 'high'
              ? 'bg-[oklch(0.7_0.18_155/0.2)] text-[var(--color-status-resolved)] border border-[var(--color-status-resolved)]/30'
              : similarity === 'medium'
              ? 'bg-[oklch(0.75_0.18_55/0.2)] text-[var(--color-sev-2)] border border-[var(--color-sev-2)]/30'
              : 'bg-[var(--color-surface-3)] text-[var(--color-text-muted)]'
          }`}
        >
          {similarity} match
        </span>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-[var(--color-text)] leading-snug">
          {memory.sourceIncidentTitle}
        </h4>
        {memory.createdAt && (
          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {new Date(memory.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        )}
      </div>

      {relevanceReason && (
        <div className="p-2 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-[11px] leading-relaxed">
          <span className="font-semibold text-[var(--color-memory)]">Why relevant: </span>
          <span className="text-[var(--color-text-secondary)]">{relevanceReason}</span>
        </div>
      )}

      <div className="space-y-1.5 text-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Root Cause</span>
          <p className="text-[var(--color-text-secondary)] text-[11px] mt-0.5 leading-relaxed bg-[var(--color-surface-0)] p-2 rounded border border-[var(--color-border-subtle)]">
            {memory.rootCause}
          </p>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-status-resolved)]">Resolution</span>
          <p className="text-[var(--color-text-secondary)] text-[11px] mt-0.5 leading-relaxed bg-[var(--color-surface-0)] p-2 rounded border border-[var(--color-border-subtle)]">
            {memory.resolution}
          </p>
        </div>

        {memory.lessonsLearned && memory.lessonsLearned.length > 0 && (
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-brand-400)]">Lessons Learned</span>
            <ul className="mt-1 space-y-1">
              {(expanded ? memory.lessonsLearned : memory.lessonsLearned.slice(0, 1)).map((lesson, idx) => (
                <li key={idx} className="text-[11px] text-[var(--color-text-secondary)] flex items-start gap-1.5 bg-[var(--color-surface-0)] p-2 rounded border border-[var(--color-border-subtle)]">
                  <span className="text-[var(--color-brand-400)] font-bold mt-0.5 flex-shrink-0">&bull;</span>
                  <span className="leading-snug">{lesson}</span>
                </li>
              ))}
            </ul>
            {memory.lessonsLearned.length > 1 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] mt-1 transition-colors"
              >
                {expanded ? 'Show less' : `+${memory.lessonsLearned.length - 1} more lessons`}
              </button>
            )}
          </div>
        )}
      </div>

      {memory.keywords && memory.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1 border-t border-[var(--color-border-subtle)]">
          {memory.keywords.slice(0, 4).map((kw) => (
            <span key={kw} className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]">
              #{kw}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
