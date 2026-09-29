'use client';

import { AlertTriangle, Brain, ArrowRight, Plus } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Severity, IncidentStatus } from '@/lib/types';

interface IncidentsPageProps {
  onOpenIncident: (id: string) => void;
}

export function IncidentsPage({ onOpenIncident }: IncidentsPageProps) {
  const incidents = useAppStore((s) => s.incidents);

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
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Incidents</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {incidents.length} total · {incidents.filter((i) => i.status !== 'resolved').length} active
          </p>
        </div>
        <button
          onClick={() => {
            const btn = document.getElementById('new-incident-btn');
            btn?.click();
          }}
          className="btn btn-primary text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          New Incident
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-border-subtle)]">
              <th className="px-5 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                ID
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                Title
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                Service
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                Severity
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                Status
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                Memory
              </th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-subtle)]">
            {incidents.map((inc) => (
              <tr
                key={inc.id}
                onClick={() => onOpenIncident(inc.id)}
                className="hover:bg-[var(--color-surface-2)] cursor-pointer transition-colors"
              >
                <td className="px-5 py-3.5 text-xs font-mono text-[var(--color-text-muted)]">
                  {inc.id}
                </td>
                <td className="px-5 py-3.5 text-sm font-medium">{inc.title}</td>
                <td className="px-5 py-3.5 text-xs text-[var(--color-text-secondary)]">
                  {inc.service}
                </td>
                <td className="px-5 py-3.5">
                  <span className={`badge ${sevBadge[inc.severity]}`}>
                    {inc.severity}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`badge ${statusBadge[inc.status]}`}>
                    {inc.status}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  {inc.memoryRetained ? (
                    <span className="badge badge-memory">
                      <Brain className="w-3 h-3" /> Retained
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--color-text-muted)]">—</span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
