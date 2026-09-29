'use client';

import { useState } from 'react';
import {
  Play,
  RotateCcw,
  Brain,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Zap,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface DemoPageProps {
  onOpenIncident: (id: string) => void;
}

const DEMO_INCIDENT_BEFORE = {
  id: 'DEMO-001',
  title: 'Payment API returning intermittent 502 errors after deployment',
  service: 'payment-api',
  severity: 'SEV-2' as const,
  description:
    'Payment API started returning intermittent HTTP 502 errors immediately after deploying v3.2.1. About 15% of payment requests are failing. Customers are reporting failed transactions.',
};

const DEMO_RESOLUTION = {
  rootCause:
    'Deployment v3.2.1 contained a misconfigured connection pool setting that reduced max connections from 200 to 25. Under production load, the pool was immediately exhausted causing upstream timeouts and 502 responses.',
  resolution:
    'Rolled back to v3.2.0 to restore the correct connection pool configuration. Patched the configuration in v3.2.2 with proper pool sizing. Added connection pool utilization to canary deployment checks.',
  lessons: [
    'Always verify connection pool metrics immediately after deployment',
    'Add connection pool utilization to automated canary analysis',
    'Configuration changes should go through a separate review process',
    'Set alerts for connection pool saturation at 70% threshold',
  ],
};

const DEMO_INCIDENT_AFTER = {
  id: 'DEMO-002',
  title: 'Payment API 502 errors during traffic surge',
  service: 'payment-api',
  severity: 'SEV-2' as const,
  description:
    'Payment API returning HTTP 502 errors during a flash sale event. Error rate is approximately 8%. Connection pool warnings visible in logs. Resembles a previous deployment-related issue.',
};

export function DemoPage({ onOpenIncident }: DemoPageProps) {
  const demo = useAppStore((s) => s.demo);
  const createIncident = useAppStore((s) => s.createIncident);
  const analyzeIncident = useAppStore((s) => s.analyzeIncident);
  const resolveIncident = useAppStore((s) => s.resolveIncident);
  const clearAllMemories = useAppStore((s) => s.clearAllMemories);
  const loadSeedMemories = useAppStore((s) => s.loadSeedMemories);
  const advanceDemoPhase = useAppStore((s) => s.advanceDemoPhase);
  const addDemoLog = useAppStore((s) => s.addDemoLog);
  const addToast = useAppStore((s) => s.addToast);
  const incidents = useAppStore((s) => s.incidents);
  const memories = useAppStore((s) => s.memories);

  const [isRunning, setIsRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);

  const phases = [
    {
      title: 'Before Memory',
      subtitle: 'No historical context available',
      description: 'Create a new incident and ask RootRecall for help. Without memory, it gives generic guidance.',
      icon: AlertTriangle,
      color: 'var(--color-sev-2)',
    },
    {
      title: 'Teach RootRecall',
      subtitle: 'Resolve the incident and retain knowledge',
      description: 'Resolve the incident with root cause, resolution, and lessons. RootRecall retains this as organizational memory.',
      icon: Brain,
      color: 'var(--color-memory)',
    },
    {
      title: 'After Memory',
      subtitle: 'Historical context available',
      description: 'Create a similar incident. Now RootRecall recalls the previous incident and gives contextual, memory-informed guidance.',
      icon: Zap,
      color: 'var(--color-status-resolved)',
    },
    {
      title: 'Accumulated Learning',
      subtitle: 'Knowledge grows with each incident',
      description: 'Resolve the second incident too. Memory accumulates — the next similar incident will have even more context.',
      icon: CheckCircle,
      color: 'var(--color-brand-400)',
    },
  ];

  const resetDemo = () => {
    // Remove demo incidents
    const store = useAppStore.getState();
    const nonDemoIncidents = store.incidents.filter(
      (i) => !i.id.startsWith('DEMO-')
    );
    useAppStore.setState({
      incidents: nonDemoIncidents,
      conversations: {},
      recalledMemories: [],
      activeIncidentId: null,
    });
    clearAllMemories();
    setCurrentPhase(0);
    setIsRunning(false);
    advanceDemoPhase('idle');
    addToast('Demo reset complete', 'info');
  };

  const runPhase = async (phase: number) => {
    setIsRunning(true);

    try {
      switch (phase) {
        case 0: {
          // Phase 1: Before Memory — clear memories, create incident, analyze
          clearAllMemories();
          addDemoLog('Cleared all memories', 'info');
          advanceDemoPhase('before-memory');

          await sleep(500);
          const inc1 = createIncident(DEMO_INCIDENT_BEFORE);
          // Add symptoms and logs to make it realistic
          useAppStore.getState().updateIncident(inc1.id, {
            symptoms: [
              'HTTP 502 errors on /api/payments/* endpoints',
              'Upstream connection timeouts in nginx logs',
              'Connection pool saturation alerts',
              'Increased p99 latency from 120ms to 8500ms',
            ],
            logs: [
              {
                timestamp: new Date().toISOString(),
                level: 'error',
                service: 'payment-api',
                message: 'upstream connect error or disconnect/reset before headers. reset reason: overflow',
              },
              {
                timestamp: new Date().toISOString(),
                level: 'error',
                service: 'payment-api',
                message: 'connection pool exhausted: max_connections=25, active=25, waiting=94',
              },
            ],
          });
          addDemoLog(`Created incident ${inc1.id}: ${inc1.title}`, 'info');

          await sleep(800);
          await analyzeIncident(inc1.id);
          addDemoLog('RootRecall analyzed with NO historical memory — generic guidance produced', 'agent');

          onOpenIncident(inc1.id);
          setCurrentPhase(1);
          break;
        }

        case 1: {
          // Phase 2: Teach — resolve the first demo incident
          advanceDemoPhase('teaching');
          const demoInc = incidents.find((i) => i.id === 'DEMO-001');
          if (!demoInc) {
            addToast('Please run Phase 1 first', 'error');
            break;
          }

          await sleep(500);
          await resolveIncident(
            'DEMO-001',
            DEMO_RESOLUTION.rootCause,
            DEMO_RESOLUTION.resolution,
            DEMO_RESOLUTION.lessons
          );
          addDemoLog('Incident DEMO-001 resolved', 'success');
          addDemoLog('Memory retained: root cause, resolution, lessons learned', 'memory');

          setCurrentPhase(2);
          break;
        }

        case 2: {
          // Phase 3: After Memory — create similar incident, analyze with memory
          advanceDemoPhase('after-memory');

          await sleep(500);
          const inc2 = createIncident(DEMO_INCIDENT_AFTER);
          useAppStore.getState().updateIncident(inc2.id, {
            symptoms: [
              'HTTP 502 errors on /api/payments/* endpoints',
              'Connection pool warnings in application logs',
              'Elevated error rate during flash sale event',
              'Similar pattern to previous deployment issue',
            ],
            logs: [
              {
                timestamp: new Date().toISOString(),
                level: 'error',
                service: 'payment-api',
                message: 'connection pool exhausted: max_connections=200, active=200, waiting=312',
              },
              {
                timestamp: new Date().toISOString(),
                level: 'warn',
                service: 'payment-api',
                message: 'connection pool utilization at 100% — no available connections',
              },
            ],
          });
          addDemoLog(`Created incident ${inc2.id}: ${inc2.title}`, 'info');

          await sleep(800);
          await analyzeIncident(inc2.id);
          addDemoLog('RootRecall analyzed WITH historical memory — contextual, memory-informed guidance!', 'memory');

          onOpenIncident(inc2.id);
          setCurrentPhase(3);
          break;
        }

        case 3: {
          // Phase 4: Accumulated Learning
          advanceDemoPhase('learning');
          const demoInc2 = incidents.find((i) => i.id === 'DEMO-002');
          if (!demoInc2) {
            addToast('Please run Phase 3 first', 'error');
            break;
          }

          await sleep(500);
          await resolveIncident(
            'DEMO-002',
            'Flash sale traffic exceeded the connection pool capacity. While the pool was correctly sized for normal traffic (200 connections), the 4x traffic surge during the sale exhausted all available connections.',
            'Implemented auto-scaling connection pools based on traffic patterns. Added pre-sale capacity planning checklist. Configured connection pool auto-scaling with min=200, max=500.',
            [
              'Pre-scale connection pools before anticipated traffic surges',
              'Implement auto-scaling for connection pools based on queue depth',
              'Add flash sale to capacity planning checklist',
              'Connection pool sizing should account for 4x normal peak traffic',
            ]
          );
          addDemoLog('Incident DEMO-002 resolved — second memory retained!', 'success');
          addDemoLog('RootRecall now has accumulated knowledge from 2 related payment-api incidents', 'memory');

          setCurrentPhase(4);
          break;
        }
      }
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Demo Mode</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Experience how RootRecall learns from incidents over time.
          </p>
        </div>
        <button onClick={resetDemo} className="btn btn-secondary text-xs">
          <RotateCcw className="w-3.5 h-3.5" /> Reset Demo
        </button>
      </div>

      {/* Phase cards - Story Timeline */}
      <div className="relative mb-12 mt-8">
        <div className="absolute top-[28px] left-0 w-full h-0.5 bg-[var(--color-surface-3)] -z-10 rounded-full" />
        <div className="absolute top-[28px] left-0 h-0.5 bg-[var(--color-brand-400)] -z-10 rounded-full transition-all duration-700 ease-in-out" style={{ width: `${(currentPhase / 3) * 100}%` }} />
        
        <div className="grid grid-cols-4 gap-4">
        {phases.map((phase, idx) => {
          const Icon = phase.icon;
          const isComplete = currentPhase > idx;
          const isCurrent = currentPhase === idx;
          const isLocked = currentPhase < idx;

          return (
            <div
              key={idx}
              className={`relative flex flex-col items-center text-center transition-all duration-500 ${
                isCurrent ? 'opacity-100 scale-105' :
                isComplete ? 'opacity-80' :
                'opacity-40 grayscale'
              }`}
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all duration-500 shadow-xl ${
                  isCurrent ? 'ring-2 ring-offset-2 ring-offset-[var(--color-surface-0)] ring-[var(--color-brand-400)] scale-110' : ''
                }`}
                style={{
                  background: isComplete
                    ? 'var(--color-status-resolved)'
                    : isCurrent
                    ? `color-mix(in oklch, ${phase.color} 20%, var(--color-surface-2))`
                    : 'var(--color-surface-3)',
                }}
              >
                {isComplete ? (
                  <CheckCircle className="w-6 h-6 text-white animate-fade-in" />
                ) : (
                  <Icon className="w-6 h-6" style={{ color: isCurrent ? phase.color : 'var(--color-text-muted)' }} />
                )}
              </div>

              <span className="text-[10px] font-mono text-[var(--color-text-muted)] mb-1 uppercase tracking-widest">Phase {idx + 1}</span>
              <h3 className="text-sm font-bold mb-2 leading-tight">{phase.title}</h3>
              <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed px-2 mb-4 h-12 overflow-hidden text-ellipsis line-clamp-3">
                {phase.description}
              </p>

              <div className="h-8 flex items-center justify-center">
                {isCurrent && (
                  <button
                    onClick={() => runPhase(idx)}
                    disabled={isRunning}
                    className="btn btn-primary text-[10px] px-3 py-1.5 rounded-full animate-fade-in"
                  >
                    {isRunning ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <Play className="w-3 h-3 mr-1" />
                    )}
                    {isRunning ? 'Running...' : 'Run Phase'}
                  </button>
                )}
                {isComplete && (
                  <span className="text-[10px] text-[var(--color-status-resolved)] font-bold flex items-center gap-1 animate-fade-in">
                    <CheckCircle className="w-3.5 h-3.5" /> Done
                  </span>
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* Demo summary */}
      {currentPhase === 4 && (
        <div className="card p-6 bg-gradient-to-br from-[oklch(0.18_0.02_290)] to-[var(--color-surface-1)] border-[var(--color-memory)] animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-6 h-6 text-[var(--color-memory)]" />
            <h3 className="text-lg font-bold">Demo Complete!</h3>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-4">
            RootRecall demonstrated the complete memory lifecycle:
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-lg bg-[var(--color-surface-0)]">
              <p className="text-2xl font-bold text-[var(--color-sev-2)]">Before</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Generic troubleshooting</p>
            </div>
            <div className="p-4 rounded-lg bg-[var(--color-surface-0)]">
              <p className="text-2xl font-bold text-[var(--color-memory)]">With Memory</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Contextual + historical</p>
            </div>
            <div className="p-4 rounded-lg bg-[var(--color-surface-0)]">
              <p className="text-2xl font-bold text-[var(--color-status-resolved)]">Accumulated</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Growing knowledge base</p>
            </div>
          </div>
          <div className="mt-4 p-4 rounded-lg bg-[var(--color-surface-0)] text-center">
            <p className="text-xs text-[var(--color-text-muted)]">
              Memories retained: <strong className="text-[var(--color-memory)]">{memories.length}</strong> ·
              Incidents processed: <strong>{incidents.filter(i => i.id.startsWith('DEMO')).length}</strong> ·
              Powered by <strong className="text-[var(--color-brand-400)]">Hindsight</strong>
            </p>
          </div>
        </div>
      )}

      {/* Demo log */}
      {demo.log.length > 0 && (
        <div className="card mt-6 p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--color-border-subtle)]">
            <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
              Demo Log
            </h4>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {demo.log.map((entry, i) => (
              <div key={i} className="px-5 py-2 flex items-start gap-3 text-xs border-b border-[var(--color-border-subtle)] last:border-0">
                <span className="text-[var(--color-text-muted)] font-mono flex-shrink-0">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    entry.type === 'success' ? 'bg-[var(--color-status-resolved)]' :
                    entry.type === 'memory' ? 'bg-[var(--color-memory)]' :
                    entry.type === 'agent' ? 'bg-[var(--color-ai)]' :
                    'bg-[var(--color-text-muted)]'
                  }`}
                />
                <span className="text-[var(--color-text-secondary)]">{entry.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
