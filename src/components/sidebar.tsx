'use client';

import {
  LayoutDashboard,
  MessageSquare,
  AlertTriangle,
  Brain,
  Play,
  Settings,
} from 'lucide-react';
import { PageId } from './app-shell';
import { useAppStore } from '@/lib/store';

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}

const NAV_ITEMS: { id: PageId; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'chat', label: 'Agent Chat', icon: MessageSquare },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
  { id: 'memory', label: 'Memory', icon: Brain },
  { id: 'demo', label: 'Demo', icon: Play },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const memoryCount = useAppStore((s) => s.memories.length);
  const activeIncidents = useAppStore(
    (s) => s.incidents.filter((i) => i.status !== 'resolved').length
  );

  return (
    <aside className="app-sidebar" aria-label="Main navigation">
      {/* Brand */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-[var(--color-border-subtle)]">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
          <img src="/favicon.png" alt="RootRecall Logo" className="w-full h-full object-cover" />
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-tight">RootRecall</h1>
          <p className="text-[10px] text-[var(--color-text-muted)] tracking-wide uppercase">
            Incident Memory
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-3">
        <ul className="space-y-1" role="list">
          {NAV_ITEMS.map((item) => {
            const isActive =
              currentPage === item.id ||
              (item.id === 'incidents' && currentPage === 'incident');
            const Icon = item.icon;

            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--color-surface-3)] text-[var(--color-text-primary)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.id === 'chat' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-[oklch(0.25_0.05_290)] text-[var(--color-memory)] border border-[oklch(0.65_0.2_290/0.4)]">
                      AI
                    </span>
                  )}
                  {item.id === 'incidents' && activeIncidents > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-sev-2)] text-white font-bold">
                      {activeIncidents}
                    </span>
                  )}
                  {item.id === 'memory' && memoryCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-memory)] text-white font-bold">
                      {memoryCount}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-[var(--color-border-subtle)]">
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <div className="w-2 h-2 rounded-full bg-[var(--color-status-resolved)]" />
          <span>Powered by Hindsight</span>
        </div>
      </div>
    </aside>
  );
}
