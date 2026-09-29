'use client';

import {
  AlertTriangle,
  Brain,
  TrendingUp,
  Calendar,
  ArrowRight,
  Play,
  Plus,
  Clock,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { PageId } from '../app-shell';
import { Severity, IncidentStatus } from '@/lib/types';

interface DashboardProps {
  onNavigate: (page: PageId) => void;
  onOpenIncident: (id: string) => void;
}

export function Dashboard({ onNavigate, onOpenIncident }: DashboardProps) {
  const incidents = useAppStore((s) => s.incidents);
  const memories = useAppStore((s) => s.memories);

  const activeIncidents = incidents.filter((i) => i.status !== 'resolved');
  const resolvedThisWeek = incidents.filter((i) => {
    if (!i.resolvedAt) return false;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(i.resolvedAt) > weekAgo;
  });

  const patternsDetected = new Set(memories.map((m) => m.service)).size;

  const sevBadge: Record<Severity, string> = {
    'SEV-1': 'badge-sev1',
    'SEV-2': 'badge-sev2',
    'SEV-3': 'badge-sev3',
    'SEV-4': 'badge-sev4',
  };

  const statusBadge: Record<IncidentStatus, string> = {
    detected: 'badge-detected',
    investigating: 'badge-investigating',
    identified: 'badge-investigating',
    mitigating: 'badge-mitigating',
    resolved: 'badge-resolved',
    postmortem: 'badge-resolved',
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Hero */}
      <div className="card p-8 bg-gradient-to-br from-[var(--color-surface-1)] to-[var(--color-surface-2)]">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden">
                <img src="/favicon.png" alt="RootRecall Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">RootRecall</h1>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Your incident response agent that remembers what happened before.
                </p>
              </div>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] max-w-lg mt-4 leading-relaxed">
              Turn every production incident into organizational memory. When a similar
              issue arises, RootRecall recalls what worked before — saving your team
              investigation time and reducing MTTR.
            </p>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={() => onNavigate('chat')}
              className="btn btn-primary text-xs flex items-center gap-1.5 shadow-md shadow-purple-900/20"
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Ask RootRecall</span>
            </button>
            <button
              onClick={() => onNavigate('demo')}
              className="btn btn-secondary text-xs"
            >
              <Play className="w-3.5 h-3.5" />
              Run Demo
            </button>
            <button
              onClick={() => {
                const btn = document.getElementById('new-incident-btn');
                btn?.click();
              }}
              className="btn btn-secondary text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              New Incident
            </button>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          icon={AlertTriangle}
          label="Active Incidents"
          value={activeIncidents.length}
          color="var(--color-sev-2)"
        />
        <MetricCard
          icon={Calendar}
          label="Resolved This Week"
          value={resolvedThisWeek.length}
          color="var(--color-status-resolved)"
        />
        <MetricCard
          icon={Brain}
          label="Memories Retained"
          value={memories.length}
          color="var(--color-memory)"
        />
        <MetricCard
          icon={TrendingUp}
          label="Patterns Detected"
          value={patternsDetected}
          color="var(--color-brand-400)"
        />
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Recent Incidents */}
        <div className="col-span-2 card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent Incidents</h3>
            <button
              onClick={() => onNavigate('incidents')}
              className="text-xs text-[var(--color-brand-400)] hover:text-[var(--color-brand-300)] flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-[var(--color-border-subtle)]">
            {incidents.slice(0, 5).map((inc) => (
              <button
                key={inc.id}
                onClick={() => onOpenIncident(inc.id)}
                className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-[var(--color-surface-2)] transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[var(--color-text-muted)]">
                      {inc.id}
                    </span>
                    <span className={`badge ${sevBadge[inc.severity]}`}>
                      {inc.severity}
                    </span>
                    <span className={`badge ${statusBadge[inc.status]}`}>
                      {inc.status}
                    </span>
                    {inc.memoryRetained && (
                      <span className="badge badge-memory">
                        <Brain className="w-3 h-3" />
                        Retained
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium mt-1 truncate">{inc.title}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {inc.service} · {new Date(inc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)]" />
              </button>
            ))}
          </div>
        </div>

        {/* Memory Activity */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
            <h3 className="text-sm font-semibold">Memory Activity</h3>
            <button
              onClick={() => onNavigate('memory')}
              className="text-xs text-[var(--color-brand-400)] hover:text-[var(--color-brand-300)] flex items-center gap-1"
            >
              Browse <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            {memories.length === 0 ? (
              <div className="text-center py-8">
                <Brain className="w-8 h-8 mx-auto text-[var(--color-text-muted)] mb-3" />
                <p className="text-sm text-[var(--color-text-muted)]">
                  No memories yet.
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Resolve incidents to build memory.
                </p>
              </div>
            ) : (
              memories.slice(0, 4).map((mem) => (
                <div
                  key={mem.id}
                  className="p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)]"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Brain className="w-3 h-3 text-[var(--color-memory)]" />
                    <span className="text-xs font-mono text-[var(--color-memory)]">
                      {mem.sourceIncidentId}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">
                    {mem.rootCause.substring(0, 100)}...
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-[10px] text-[var(--color-text-muted)]">
                    <Clock className="w-3 h-3" />
                    {new Date(mem.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `color-mix(in oklch, ${color} 15%, transparent)` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
        </div>
      </div>
    </div>
  );
}
