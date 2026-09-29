'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Circle, Brain } from 'lucide-react';
import { PageId } from './app-shell';
import { useAppStore } from '@/lib/store';
import { CreateIncidentModal } from './create-incident-modal';
import { CommandPalette } from './command-palette';

interface TopbarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  onOpenIncident: (id: string) => void;
}

const PAGE_TITLES: Record<string, string> = {
  overview: 'Overview',
  chat: 'Agent Chat',
  incidents: 'Incidents',
  incident: 'Incident',
  memory: 'Memory',
  demo: 'Demo',
  settings: 'Settings',
};

export function Topbar({ currentPage, onNavigate, onOpenIncident }: TopbarProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const incidents = useAppStore((s) => s.incidents);
  const config = useAppStore((s) => s.config);

  const hindsightStatus = config.hindsight.enabled ? 'connected' : 'local';

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowCommandPalette(true);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <>
      <header className="app-topbar">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-medium text-[var(--color-text-secondary)]">
            {PAGE_TITLES[currentPage] || 'RootRecall'}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div 
            className="relative cursor-text"
            onClick={() => setShowCommandPalette(true)}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            <div className="flex items-center h-8 pl-9 pr-3 w-64 bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-md text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)] transition-colors">
              <span>Ask RootRecall...</span>
              <kbd className="ml-auto flex h-5 items-center gap-1 rounded bg-[var(--color-surface-3)] px-1.5 font-mono text-[10px] font-medium text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]">
                <span className="text-[9px]">⌘</span>K
              </kbd>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-surface-2)] text-xs text-[var(--color-text-secondary)]">
            <Circle
              className={`w-2 h-2 fill-current ${
                hindsightStatus === 'connected'
                  ? 'text-[var(--color-status-resolved)]'
                  : 'text-[var(--color-sev-3)]'
              }`}
            />
            {hindsightStatus === 'connected' ? 'Hindsight Connected' : 'Local Mode'}
          </div>

          {/* Ask Agent Direct Shortcut */}
          <button
            onClick={() => onNavigate('chat')}
            className={`btn text-xs h-8 px-2.5 flex items-center gap-1.5 transition-colors ${
              currentPage === 'chat'
                ? 'bg-[oklch(0.28_0.08_290)] text-[var(--color-memory)] border border-[oklch(0.65_0.2_290/0.4)] shadow-sm'
                : 'btn-secondary text-[var(--color-text-secondary)] hover:text-white'
            }`}
            title="Chat directly with RootRecall Agent"
          >
            <Brain className="w-3.5 h-3.5 text-[var(--color-memory)]" />
            <span>Ask Agent</span>
          </button>

          {/* New Incident */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary text-xs h-8"
            id="new-incident-btn"
          >
            <Plus className="w-3.5 h-3.5" />
            New Incident
          </button>
        </div>
      </header>

      {showCreateModal && (
        <CreateIncidentModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(id) => {
            setShowCreateModal(false);
            onOpenIncident(id);
          }}
        />
      )}
      
      {showCommandPalette && (
        <CommandPalette 
          onNavigate={(p) => {
            setShowCommandPalette(false);
            onNavigate(p);
          }}
          onOpenIncident={(id) => {
            setShowCommandPalette(false);
            onOpenIncident(id);
          }}
        />
      )}
    </>
  );
}
