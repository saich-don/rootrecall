'use client';

import { Brain, Clock, Server, Shield, Lightbulb, Trash2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export function MemoryPage() {
  const memories = useAppStore((s) => s.memories);
  const clearAllMemories = useAppStore((s) => s.clearAllMemories);

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Organizational Memory</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {memories.length} memories retained across {new Set(memories.map((m) => m.service)).size} services
          </p>
        </div>
        {memories.length > 0 && (
          <button onClick={clearAllMemories} className="btn btn-ghost text-xs text-[var(--color-sev-1)]">
            <Trash2 className="w-3.5 h-3.5" /> Clear All
          </button>
        )}
      </div>

      {memories.length === 0 ? (
        <div className="card p-16 text-center">
          <Brain className="w-12 h-12 mx-auto text-[var(--color-text-muted)] mb-4 opacity-30" />
          <h3 className="text-lg font-semibold mb-2">No memories yet</h3>
          <p className="text-sm text-[var(--color-text-muted)] max-w-sm mx-auto">
            Resolve incidents to build organizational memory. Each resolution teaches RootRecall something new.
          </p>
        </div>
      ) : (
        <>
          {/* Constellation Visual */}
          <div className="card p-6 mb-6 overflow-hidden relative min-h-[160px] bg-gradient-to-br from-[var(--color-surface-1)] to-[var(--color-surface-2)]">
            <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-6">
              Memory Constellation
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-10 opacity-80">
              {/* Simple DOM-based node network */}
              {Array.from(new Set(memories.map(m => m.service))).slice(0, 5).map((service, i) => (
                <div key={service} className="relative group">
                  <div className="w-12 h-12 rounded-full border border-[var(--color-brand-400)] bg-[var(--color-surface-2)] flex items-center justify-center relative z-10 shadow-[0_0_15px_rgba(var(--color-brand-400),0.2)]">
                    <Server className="w-5 h-5 text-[var(--color-brand-400)]" />
                  </div>
                  <div className="absolute top-14 left-1/2 -translate-x-1/2 text-[10px] font-mono text-[var(--color-text-secondary)] whitespace-nowrap">
                    {service}
                  </div>
                  
                  {/* Connect to memories */}
                  {memories.filter(m => m.service === service).slice(0, 3).map((mem, j) => (
                    <div key={mem.id} className="absolute inset-0" style={{ transform: `rotate(${j * 45 + 30}deg)` }}>
                      <div className="w-full h-[1px] bg-gradient-to-r from-[var(--color-brand-400)] to-transparent absolute top-1/2 left-1/2 w-16 origin-left opacity-30" />
                      <div className="w-3 h-3 rounded-full bg-[var(--color-memory)] absolute top-1/2 left-[4rem] -translate-y-1/2 shadow-[0_0_8px_rgba(var(--color-memory),0.6)] cursor-pointer hover:scale-150 transition-transform" title={mem.sourceIncidentTitle} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--color-surface-1)_100%)] pointer-events-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
          {memories.map((mem) => (
            <div key={mem.id} className="card p-5 memory-glow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-[var(--color-memory)]" />
                  <span className="text-xs font-mono text-[var(--color-memory)]">{mem.sourceIncidentId}</span>
                  <span className={`badge ${
                    mem.severity === 'SEV-1' ? 'badge-sev1' :
                    mem.severity === 'SEV-2' ? 'badge-sev2' :
                    mem.severity === 'SEV-3' ? 'badge-sev3' : 'badge-sev4'
                  }`}>{mem.severity}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                  <Clock className="w-3 h-3" />
                  {new Date(mem.createdAt).toLocaleDateString()}
                </div>
              </div>

              <h3 className="text-sm font-semibold mb-3">{mem.sourceIncidentTitle}</h3>

              <div className="space-y-3 text-xs">
                <div className="flex gap-2">
                  <Server className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[var(--color-text-muted)]" />
                  <div>
                    <span className="text-[var(--color-text-muted)]">Service:</span>
                    <span className="ml-1">{mem.service}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Shield className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[var(--color-text-muted)]" />
                  <div>
                    <span className="text-[var(--color-text-muted)]">Root Cause:</span>
                    <p className="text-[var(--color-text-secondary)] mt-0.5 leading-relaxed">{mem.rootCause}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[var(--color-text-muted)]" />
                  <div>
                    <span className="text-[var(--color-text-muted)]">Lessons Learned:</span>
                    <ul className="mt-1 space-y-1">
                      {mem.lessonsLearned.map((lesson, i) => (
                        <li key={i} className="text-[var(--color-text-secondary)]">• {lesson}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mt-4 pt-3 border-t border-[var(--color-border-subtle)]">
                {mem.keywords.map((kw) => (
                  <span key={kw} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-surface-3)] text-[var(--color-text-muted)]">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  );
}
