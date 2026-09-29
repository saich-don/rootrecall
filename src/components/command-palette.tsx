'use client';

import { useState, useEffect } from 'react';
import { Search, Server, AlertTriangle, Brain, X, ArrowRight } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { PageId } from './app-shell';

interface CommandPaletteProps {
  onNavigate: (page: PageId) => void;
  onOpenIncident: (id: string) => void;
}

export function CommandPalette({ onNavigate, onOpenIncident }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  
  const incidents = useAppStore((s) => s.incidents);
  const memories = useAppStore((s) => s.memories);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  if (!open) return null;

  const filteredIncidents = query 
    ? incidents.filter(i => 
        i.id.toLowerCase().includes(query.toLowerCase()) || 
        i.title.toLowerCase().includes(query.toLowerCase())
      )
    : incidents.slice(0, 3);
    
  const filteredMemories = query 
    ? memories.filter(m => 
        m.sourceIncidentId.toLowerCase().includes(query.toLowerCase()) || 
        m.sourceIncidentTitle.toLowerCase().includes(query.toLowerCase()) ||
        m.keywords.some(k => k.toLowerCase().includes(query.toLowerCase()))
      )
    : memories.slice(0, 2);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" 
        onClick={() => setOpen(false)} 
      />
      
      <div className="relative w-full max-w-2xl bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] rounded-xl shadow-2xl overflow-hidden animate-slide-up">
        <div className="flex items-center px-4 border-b border-[var(--color-border-subtle)]">
          <Search className="w-5 h-5 text-[var(--color-text-muted)]" />
          <input
            autoFocus
            className="w-full bg-transparent border-0 outline-none px-4 py-4 text-sm focus:ring-0"
            placeholder="Ask RootRecall or search incidents, memories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={() => setOpen(false)} className="text-[var(--color-text-muted)] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {/* Actions */}
          <div className="px-2 py-1.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
            Quick Actions
          </div>
          <button 
            className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-[var(--color-surface-2)] text-left group"
            onClick={() => {
              setOpen(false);
              if (query.trim()) {
                useAppStore.getState().askAgentDirectly(query.trim());
              }
              onNavigate('chat');
            }}
          >
            <Brain className="w-4 h-4 text-[var(--color-memory)]" />
            <span className="flex-1">
              {query.trim() ? `Ask RootRecall: "${query}"` : 'Open RootRecall Agent Chat'}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button 
            className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-[var(--color-surface-2)] text-left"
            onClick={() => { setOpen(false); onNavigate('demo'); }}
          >
            <Brain className="w-4 h-4 text-[var(--color-brand-400)]" />
            <span>Start Demo Mode</span>
          </button>

          {/* Incidents */}
          {filteredIncidents.length > 0 && (
            <div className="mt-4">
              <div className="px-2 py-1.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                Incidents
              </div>
              {filteredIncidents.map(inc => (
                <button
                  key={inc.id}
                  className="w-full flex flex-col px-3 py-2 text-sm rounded-lg hover:bg-[var(--color-surface-2)] text-left"
                  onClick={() => { setOpen(false); onOpenIncident(inc.id); }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-[var(--color-text-muted)]">{inc.id}</span>
                    <span className="font-medium truncate">{inc.title}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-[var(--color-text-muted)]">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      inc.severity === 'SEV-1' ? 'bg-[var(--color-sev-1)]/10 text-[var(--color-sev-1)]' :
                      inc.severity === 'SEV-2' ? 'bg-[var(--color-sev-2)]/10 text-[var(--color-sev-2)]' :
                      'bg-[var(--color-sev-3)]/10 text-[var(--color-sev-3)]'
                    }`}>
                      {inc.severity}
                    </span>
                    <span className="flex items-center gap-1"><Server className="w-3 h-3"/> {inc.service}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Memories */}
          {filteredMemories.length > 0 && (
            <div className="mt-4 mb-2">
              <div className="px-2 py-1.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                Organizational Memory
              </div>
              {filteredMemories.map(mem => (
                <button
                  key={mem.id}
                  className="w-full flex flex-col px-3 py-2 text-sm rounded-lg hover:bg-[var(--color-surface-2)] text-left"
                  onClick={() => { setOpen(false); onNavigate('memory'); }}
                >
                  <div className="flex items-center gap-2">
                    <Brain className="w-3.5 h-3.5 text-[var(--color-memory)]" />
                    <span className="font-medium truncate">{mem.sourceIncidentTitle}</span>
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-1 truncate">
                    {mem.rootCause}
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {query && filteredIncidents.length === 0 && filteredMemories.length === 0 && (
             <div className="p-8 text-center text-sm text-[var(--color-text-muted)]">
               No results found for &quot;{query}&quot;
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
