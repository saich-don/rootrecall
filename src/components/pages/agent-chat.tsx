'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Brain,
  Send,
  Sparkles,
  RefreshCw,
  Terminal,
  Clock,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Plus,
  Server,
  Info,
  Shield,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { AgentResponse, RecalledMemory, ConversationMessage } from '@/lib/types';
import { PageId } from '../app-shell';

interface AgentChatPageProps {
  onOpenIncident?: (id: string) => void;
  onNavigate?: (page: PageId) => void;
}

const STARTER_PROMPTS = [
  {
    title: 'Payment API 502 Outages',
    desc: 'What caused the 502 Bad Gateway errors on payment-api, and what resolution worked?',
    query: 'What caused the recent 502 Bad Gateway errors on payment-api, and what resolution worked?',
    tag: 'payment-api',
  },
  {
    title: 'Database Pool Exhaustion',
    desc: 'What should I investigate first when connection pool reaches 100% capacity?',
    query: 'What should I check first when database connection pool is exhausted on a service?',
    tag: 'database',
  },
  {
    title: 'Deployment Rollback Protocol',
    desc: 'What is our standard rollback procedure and verification commands after a bad release?',
    query: 'Suggest a rollback plan and verification commands for an ongoing production release failure.',
    tag: 'operations',
  },
  {
    title: 'Auth Service Latency',
    desc: 'Have we seen timeout spikes or saturation on auth-service before?',
    query: 'Have we seen database timeout or saturation issues on auth-service before?',
    tag: 'auth-service',
  },
];

const SUGGESTED_CHIPS = [
  'What worked in INC-0971?',
  'Check connection pool',
  'Suggest rollback plan',
  'What should I check first?',
  'Show diagnostic commands',
];

const EMPTY_MESSAGES: ConversationMessage[] = [];

export function AgentChatPage({ onOpenIncident, onNavigate }: AgentChatPageProps) {
  const conversationsRaw = useAppStore((s) => s.conversations['global']);
  const conversations = conversationsRaw ?? EMPTY_MESSAGES;
  const isAnalyzing = useAppStore((s) => s.isAnalyzing);
  const recalledMemories = useAppStore((s) => s.recalledMemories);
  const memories = useAppStore((s) => s.memories);
  const incidents = useAppStore((s) => s.incidents);
  const config = useAppStore((s) => s.config);

  const [inputQuery, setInputQuery] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, isAnalyzing]);

  const handleSend = useCallback((overrideQuery?: string) => {
    const q = (overrideQuery ?? inputQuery).trim();
    if (!q || isAnalyzing) return;
    useAppStore.getState().askAgentDirectly(q);
    setInputQuery('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [inputQuery, isAnalyzing]);

  const handleClear = () => {
    useAppStore.getState().clearGlobalChat();
  };

  return (
    <div className="animate-fade-in h-[calc(100vh-80px)] -m-6 flex flex-col">
      {/* Agent Top Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src="/favicon.png" alt="RootRecall" className="w-8 h-8 rounded-lg shadow-md" />
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--color-surface-1)] ${
                config.hindsight.enabled ? 'bg-[var(--color-status-resolved)]' : 'bg-[var(--color-sev-3)]'
              }`}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight">RootRecall Agent</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[oklch(0.25_0.05_290)] text-[var(--color-memory)] border border-[oklch(0.65_0.2_290/0.4)]">
                Direct On-Call Intelligence
              </span>
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)]">
              {config.hindsight.enabled
                ? 'Hindsight Semantic Memory Active · Bank: rootrecall-incidents'
                : 'Local Memory Engine · Grounded in past organizational postmortems'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="chat-status-pill flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)]">
            <Sparkles className="w-3.5 h-3.5 text-[var(--color-brand-400)]" />
            <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">
              {config.llm.enabled ? config.llm.provider : 'Deterministic Reasoning'}
            </span>
          </div>

          {conversations.length > 0 && (
            <button
              onClick={handleClear}
              className="btn btn-secondary text-xs h-8 px-2.5 flex items-center gap-1.5"
              title="Reset conversation"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* Two Column Layout: Main Chat (8 cols) + Right Knowledge Panel (4 cols) */}
      <div className="flex-1 grid grid-cols-12 min-h-0 overflow-hidden">
        {/* ═══════ CENTER: Chat Messages & Composer (Col 8) ═══════ */}
        <div className="col-span-8 flex flex-col min-h-0 bg-[var(--color-surface-0)] border-r border-[var(--color-border-subtle)]">
          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 chat-scrollbar">
            {conversations.length === 0 ? (
              <div className="max-w-2xl mx-auto py-8 space-y-8 animate-fade-in">
                {/* Hero Introduction */}
                <div className="text-center space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-[oklch(0.2_0.05_290)] border border-[oklch(0.65_0.2_290/0.4)] flex items-center justify-center shadow-lg shadow-purple-500/10">
                    <Brain className="w-7 h-7 text-[var(--color-memory)]" />
                  </div>
                  <h2 className="text-lg font-bold tracking-tight text-[var(--color-text)]">
                    Ask RootRecall about any incident or failure pattern
                  </h2>
                  <p className="text-xs text-[var(--color-text-secondary)] max-w-lg mx-auto leading-relaxed">
                    RootRecall retains symptoms, root causes, diagnostic steps, and lessons learned across your infrastructure in Hindsight. Ask a question to recall past postmortems or get step-by-step investigation plans.
                  </p>
                </div>

                {/* 2x2 Starter Prompts */}
                <div className="grid grid-cols-2 gap-3">
                  {STARTER_PROMPTS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(p.query)}
                      className="text-left p-3.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] hover:bg-[var(--color-surface-2)] hover:border-[var(--color-brand-500)]/40 transition-all group shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-[var(--color-text)] group-hover:text-[var(--color-brand-400)] transition-colors">
                            {p.title}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-3)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]">
                            {p.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                          {p.desc}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-[var(--color-brand-400)] mt-3 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Ask this</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              conversations.map((msg, idx) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                  style={{ animationDelay: `${Math.min(idx * 40, 200)}ms` }}
                >
                  {msg.role === 'user' ? (
                    <div className="max-w-[80%]">
                      <div className="user-bubble px-4 py-3 rounded-2xl rounded-br-sm">
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      </div>
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-1 text-right mr-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 max-w-[94%] w-full">
                      <img src="/favicon.png" alt="RootRecall" className="w-7 h-7 rounded-lg mt-1 flex-shrink-0 shadow-sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold">RootRecall</span>
                          <span className="text-[10px] text-[var(--color-text-muted)]">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="agent-bubble px-4 py-3.5 w-full">
                          {msg.agentResponse ? (
                            <DirectAgentContent response={msg.agentResponse} onOpenIncident={onOpenIncident} />
                          ) : (
                            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] whitespace-pre-wrap">
                              {msg.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Investigating / Searching Indicator */}
            {isAnalyzing && (
              <div className="flex justify-start animate-fade-in">
                <div className="flex items-start gap-3 max-w-[90%]">
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

          {/* Bottom Composer Area */}
          <div className="flex-shrink-0 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-1)]">
            {/* Quick Prompt Chips */}
            <div className="px-5 pt-3 flex flex-wrap gap-1.5">
              {SUGGESTED_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSend(chip)}
                  disabled={isAnalyzing}
                  className="suggestion-chip text-[11px] px-3 py-1.5 rounded-full border font-medium disabled:opacity-40"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Textarea Input */}
            <div className="p-4">
              <div className="chat-composer flex items-end gap-2 rounded-xl p-1.5 pr-2">
                <textarea
                  ref={textareaRef}
                  className="flex-1 bg-transparent border-0 text-sm p-2.5 min-h-[44px] max-h-[140px] resize-none focus:outline-none placeholder:text-[var(--color-text-muted)]"
                  rows={1}
                  value={inputQuery}
                  onChange={(e) => {
                    setInputQuery(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask RootRecall about incidents, memory, diagnostic commands, or root causes..."
                  disabled={isAnalyzing}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={isAnalyzing || !inputQuery.trim()}
                  className="send-btn mb-1 p-2 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════ RIGHT: Recalled Memory & Context Panel (Col 4) ═══════ */}
        <div className="col-span-4 overflow-y-auto p-4 space-y-4 bg-[var(--color-surface-1)]/50">
          <div>
            <h3 className="text-xs font-semibold flex items-center gap-2 text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
              <Brain className="w-3.5 h-3.5 text-[var(--color-memory)]" />
              Active Memory Context
            </h3>

            {recalledMemories.length === 0 ? (
              <div className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] text-center space-y-2">
                <Brain className="w-8 h-8 mx-auto text-[var(--color-text-muted)] opacity-25" />
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                  No memories currently loaded. Ask a question about a service (e.g. payment-api) to recall historical incidents from Hindsight.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="px-2.5 py-1.5 rounded-lg bg-[oklch(0.2_0.05_290)] text-[var(--color-memory)] text-[11px] font-medium flex items-center justify-between">
                  <span>{recalledMemories.length} relevant memories grounded</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider">Hindsight</span>
                </div>

                {recalledMemories.map((rm) => (
                  <div
                    key={rm.memory.id}
                    className="p-3.5 rounded-xl border border-[oklch(0.35_0.05_290/0.4)] bg-[oklch(0.14_0.02_290/0.7)] space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => onOpenIncident?.(rm.memory.sourceIncidentId)}
                        className="font-mono font-bold text-[var(--color-memory)] hover:underline flex items-center gap-1"
                      >
                        <span>{rm.memory.sourceIncidentId}</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                        rm.similarity === 'high' ? 'bg-[oklch(0.7_0.18_155/0.2)] text-[var(--color-status-resolved)]' : 'bg-[var(--color-surface-3)] text-[var(--color-text-muted)]'
                      }`}>
                        {rm.similarity} match
                      </span>
                    </div>

                    <p className="font-semibold text-[var(--color-text)] leading-snug">
                      {rm.memory.sourceIncidentTitle}
                    </p>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)]">Root Cause:</span>
                      <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5 leading-snug">
                        {rm.memory.rootCause}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-[var(--color-status-resolved)]">Resolution:</span>
                      <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5 leading-snug">
                        {rm.memory.resolution}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Service Knowledge Base */}
          <div className="pt-2 border-t border-[var(--color-border-subtle)]">
            <h4 className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Organizational Knowledge
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)]">
                <span className="text-[10px] text-[var(--color-text-muted)] block">Retained Memories</span>
                <span className="text-base font-bold font-mono text-[var(--color-memory)]">{memories.length}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)]">
                <span className="text-[10px] text-[var(--color-text-muted)] block">Tracked Incidents</span>
                <span className="text-base font-bold font-mono text-[var(--color-text)]">{incidents.length}</span>
              </div>
            </div>

            {/* Quick Action: Create Incident */}
            <div className="mt-4">
              <button
                onClick={() => onNavigate?.('incidents')}
                className="w-full btn btn-secondary text-xs h-9 flex items-center justify-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Go to Incidents</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// Chat Content for Direct Agent Responses
// ════════════════════════════════════════════

function DirectAgentContent({
  response,
  onOpenIncident,
}: {
  response: AgentResponse;
  onOpenIncident?: (id: string) => void;
}) {
  const [showCauses, setShowCauses] = useState(true);
  const [showSteps, setShowSteps] = useState(true);
  const [showCommands, setShowCommands] = useState(true);

  return (
    <div className="space-y-3">
      {/* Memory Status Pill */}
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
            First-Principles Guidance
          </span>
        </div>
      )}

      {/* Main summary text */}
      <p className="text-sm leading-relaxed text-[var(--color-text)]">
        {response.assessment.summary}
      </p>

      {/* Historical Evidence Citations */}
      {response.historicalEvidence.length > 0 && (
        <div className="p-3 rounded-lg bg-[oklch(0.15_0.02_290/0.5)] border border-[oklch(0.4_0.1_290/0.4)] space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--color-memory)] uppercase tracking-wider">
            <Clock className="w-3 h-3" />
            <span>Recalled Historical Evidence</span>
          </div>
          <div className="space-y-1.5">
            {response.historicalEvidence.map((ev) => (
              <div key={ev.incidentId} className="flex items-start justify-between gap-2 text-xs">
                <div>
                  <button
                    onClick={() => onOpenIncident?.(ev.incidentId)}
                    className="font-semibold text-[var(--color-text)] hover:text-[var(--color-brand-400)] transition-colors text-left"
                  >
                    {ev.incidentId}: {ev.incidentTitle}
                  </button>
                  <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5 leading-snug">
                    {ev.rootCause}
                  </p>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase flex-shrink-0 ${
                  ev.similarity === 'high' ? 'bg-[var(--color-status-resolved)] text-white' : 'bg-[var(--color-surface-3)] text-[var(--color-text-muted)]'
                }`}>
                  {ev.similarity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible: Likely Causes */}
      {response.assessment.likelyCauses.length > 0 && (
        <div className="rounded-lg overflow-hidden border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)]">
          <button
            onClick={() => setShowCauses(!showCauses)}
            className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[var(--color-surface-2)] transition-colors"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-sev-2)] flex items-center gap-1.5">
              {showCauses ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              Likely Causes ({response.assessment.likelyCauses.length})
            </span>
          </button>
          {showCauses && (
            <ul className="px-3 pb-3 space-y-1.5 pt-1">
              {response.assessment.likelyCauses.map((c, i) => (
                <li key={i} className="text-xs text-[var(--color-text-secondary)] flex items-start gap-2">
                  <span className="text-[var(--color-sev-2)] font-bold">▸</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Collapsible: Investigation Steps */}
      {response.recommendations.length > 0 && (
        <div className="rounded-lg overflow-hidden border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)]">
          <button
            onClick={() => setShowSteps(!showSteps)}
            className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[var(--color-surface-2)] transition-colors"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-brand-400)] flex items-center gap-1.5">
              {showSteps ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              Recommended Steps ({response.recommendations.length})
            </span>
          </button>
          {showSteps && (
            <ol className="px-3 pb-3 space-y-2 pt-1">
              {response.recommendations.map((rec, i) => (
                <li key={i} className="text-xs text-[var(--color-text-secondary)] flex items-start gap-2">
                  <span className="text-[var(--color-brand-400)] font-bold">{i + 1}.</span>
                  <div>
                    <p className="font-medium text-[var(--color-text)]">{rec.step}</p>
                    {rec.rationale && (
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{rec.rationale}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* Suggested Commands */}
      {response.suggestedCommands.length > 0 && (
        <div className="rounded-lg overflow-hidden border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)]">
          <button
            onClick={() => setShowCommands(!showCommands)}
            className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[var(--color-surface-2)] transition-colors"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
              {showCommands ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              Diagnostic Commands ({response.suggestedCommands.length})
            </span>
          </button>
          {showCommands && (
            <div className="px-3 pb-3 space-y-1.5 pt-1">
              {response.suggestedCommands.map((cmd, i) => (
                <DirectCommandCopy key={i} command={cmd} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DirectCommandCopy({ command }: { command: string }) {
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
