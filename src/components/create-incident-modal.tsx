'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Severity } from '@/lib/types';

interface CreateIncidentModalProps {
  onClose: () => void;
  onCreated: (id: string) => void;
}

export function CreateIncidentModal({ onClose, onCreated }: CreateIncidentModalProps) {
  const createIncident = useAppStore((s) => s.createIncident);
  const [title, setTitle] = useState('');
  const [service, setService] = useState('');
  const [severity, setSeverity] = useState<Severity>('SEV-2');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !service || !description) return;

    const incident = createIncident({
      title,
      service,
      severity,
      description,
    });
    onCreated(incident.id);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Create new incident"
    >
      <div className="card p-6 w-full max-w-lg animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">New Incident</h2>
          <button onClick={onClose} className="btn btn-ghost p-1.5" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="inc-title" className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
              Title
            </label>
            <input
              id="inc-title"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Payment API 502 after deployment"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="inc-service" className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                Service
              </label>
              <input
                id="inc-service"
                className="input"
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder="e.g., payment-api"
                required
              />
            </div>
            <div>
              <label htmlFor="inc-severity" className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                Severity
              </label>
              <select
                id="inc-severity"
                className="select w-full"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as Severity)}
              >
                <option value="SEV-1">SEV-1 — Critical</option>
                <option value="SEV-2">SEV-2 — High</option>
                <option value="SEV-3">SEV-3 — Medium</option>
                <option value="SEV-4">SEV-4 — Low</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="inc-desc" className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
              Description
            </label>
            <textarea
              id="inc-desc"
              className="textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what's happening..."
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Incident
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
