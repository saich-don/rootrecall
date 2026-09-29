'use client';

import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Maximize2,
  Brain,
  Sparkles,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { PageId } from './app-shell';
import { ConversationMessage } from '@/lib/types';

interface FloatingAgentChatProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  onOpenIncident?: (id: string) => void;
}

const EMPTY_MESSAGES: ConversationMessage[] = [];

export function FloatingAgentChat({
  currentPage,
  onNavigate,
  onOpenIncident,
}: FloatingAgentChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const conversationsRaw = useAppStore((s) => s.conversations['global']);
  const conversations = conversationsRaw ?? EMPTY_MESSAGES;
  const isAnalyzing = useAppStore((s) => s.isAnalyzing);
  const config = useAppStore((s) => s.config);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversations, isAnalyzing, isOpen]);

  // Don't show floating button on full chat page or incident workspace to avoid duplicate chats
  if (currentPage === 'chat' || currentPage === 'incident') {
    return null;
  }

  const handleSend = () => {
    const q = inputQuery.trim();
    if (!q || isAnalyzing) return;
    useAppStore.getState().askAgentDirectly(q);
    setInputQuery('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleExpand = () => {
    setIsOpen(false);
    onNavigate('chat');
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-500)] text-white shadow-xl shadow-purple-600/30 border border-purple-400/30 font-medium text-xs transition-all hover:scale-105 active:scale-95 group"
          aria-label="Open RootRecall Agent Chat"
        >
          <div className="relative">
            <Brain className="w-4 h-4 text-white" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <span>Ask RootRecall</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-900/60 text-purple-200 border border-purple-400/20">
            Agent
          </span>
        </button>
      )}

      {/* Floating Slide-out Agent Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[calc(100vh-4rem)] rounded-2xl bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] shadow-2xl flex flex-col overflow-hidden animate-slide-in">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <img src="/favicon.png" alt="" className="w-6 h-6 rounded-md shadow-sm" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[var(--color-surface-2)]" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[var(--color-text)]">RootRecall Agent</h3>
                <p className="text-[10px] text-[var(--color-text-muted)]">
                  {config.hindsight.enabled ? 'Hindsight Memory Grounded' : 'Local Incident Intelligence'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleExpand}
                className="p-1.5 rounded-lg hover:bg-[var(--color-surface-3)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                title="Expand to Full Page"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--color-surface-3)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                title="Close chat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-scrollbar bg-[var(--color-surface-0)]">
            {conversations.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-10 h-10 mx-auto rounded-xl bg-[oklch(0.2_0.05_290)] flex items-center justify-center">
                  <Brain className="w-5 h-5 text-[var(--color-memory)]" />
                </div>
                <h4 className="text-xs font-semibold text-[var(--color-text)]">
                  Ask RootRecall Anything
                </h4>
                <p className="text-[11px] text-[var(--color-text-muted)] max-w-xs mx-auto leading-relaxed">
                  Query past postmortems, ask about recurring error patterns, or get triage guidance for a service.
                </p>
                <div className="pt-2 flex flex-col gap-1.5 text-left max-w-xs mx-auto">
                  <button
                    onClick={() => {
                      useAppStore.getState().askAgentDirectly('What caused the payment-api 502 errors?');
                    }}
                    className="p-2 rounded-lg bg-[var(--color-surface-1)] hover:bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] text-[11px] text-[var(--color-text-secondary)] transition-colors text-left"
                  >
                    What caused the payment-api 502 errors?
                  </button>
                  <button
                    onClick={() => {
                      useAppStore.getState().askAgentDirectly('What should I check first for DB pool exhaustion?');
                    }}
                    className="p-2 rounded-lg bg-[var(--color-surface-1)] hover:bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] text-[11px] text-[var(--color-text-secondary)] transition-colors text-left"
                  >
                    What should I check first for DB pool exhaustion?
                  </button>
                </div>
              </div>
            ) : (
              conversations.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  {msg.role === 'user' ? (
                    <div className="max-w-[85%]">
                      <div className="user-bubble px-3.5 py-2.5 rounded-xl rounded-br-sm text-xs leading-relaxed">
                        {msg.content}
                      </div>
                      <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5 text-right mr-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 max-w-[92%] w-full">
                      <img src="/favicon.png" alt="" className="w-5 h-5 rounded mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="agent-bubble px-3 py-2.5 text-xs leading-relaxed space-y-2">
                          {msg.agentResponse?.memoryInfluenced && (
                            <div className="inline-flex items-center gap-1 text-[10px] text-[var(--color-memory)] font-semibold">
                              <Brain className="w-3 h-3" />
                              <span>Memory Applied</span>
                            </div>
                          )}
                          <p className="text-[var(--color-text)]">
                            {msg.agentResponse ? msg.agentResponse.assessment.summary : msg.content}
                          </p>

                          {msg.agentResponse?.historicalEvidence && msg.agentResponse.historicalEvidence.length > 0 && (
                            <div className="pt-1.5 border-t border-[var(--color-border-subtle)]">
                              <span className="text-[10px] font-bold text-[var(--color-memory)] block mb-1">
                                Recalled Evidence:
                              </span>
                              {msg.agentResponse.historicalEvidence.slice(0, 1).map((ev) => (
                                <div key={ev.incidentId} className="text-[11px] text-[var(--color-text-secondary)]">
                                  <span className="font-semibold text-[var(--color-text)]">{ev.incidentId}:</span> {ev.rootCause}
                                </div>
                              ))}
                            </div>
                          )}

                          {msg.agentResponse?.suggestedCommands && msg.agentResponse.suggestedCommands.length > 0 && (
                            <div className="p-1.5 rounded bg-[var(--color-surface-0)] font-mono text-[10px] text-[var(--color-brand-400)] border border-[var(--color-border-subtle)] truncate">
                              $ {msg.agentResponse.suggestedCommands[0]}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            {isAnalyzing && (
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] py-2">
                <Brain className="w-3.5 h-3.5 animate-pulse text-[var(--color-memory)]" />
                <span>Searching Hindsight memory...</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Bottom Composer */}
          <div className="p-3 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] flex-shrink-0">
            <div className="flex items-end gap-1.5 bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl p-1 pr-1.5 focus-within:border-[var(--color-brand-500)]">
              <textarea
                ref={textareaRef}
                className="flex-1 bg-transparent border-0 text-xs p-2 min-h-[36px] max-h-[80px] resize-none focus:outline-none placeholder:text-[var(--color-text-muted)]"
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
                placeholder="Ask about incidents, memory..."
                disabled={isAnalyzing}
              />
              <button
                onClick={handleSend}
                disabled={isAnalyzing || !inputQuery.trim()}
                className="send-btn p-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
