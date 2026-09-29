'use client';

import { useState, useEffect } from 'react';
import { Save, Circle, ExternalLink, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { ThemeToggle } from '@/components/theme-toggle';

export function SettingsPage() {
  const config = useAppStore((s) => s.config);
  const updateConfig = useAppStore((s) => s.updateConfig);
  const addToast = useAppStore((s) => s.addToast);
  const syncServerStatus = useAppStore((s) => s.syncServerStatus);

  const [hindsightUrl, setHindsightUrl] = useState(config.hindsight.baseUrl);
  const [hindsightKey, setHindsightKey] = useState(config.hindsight.apiKey);
  const [hindsightBank, setHindsightBank] = useState(config.hindsight.bankName);
  const [llmProvider, setLlmProvider] = useState(config.llm.provider);
  const [llmKey, setLlmKey] = useState(config.llm.apiKey);
  const [llmModel, setLlmModel] = useState(config.llm.model);
  const [llmUrl, setLlmUrl] = useState(config.llm.baseUrl || '');

  // Connection test states
  const [testingHs, setTestingHs] = useState(false);
  const [hsTestResult, setHsTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [testingLlm, setTestingLlm] = useState(false);
  const [llmTestResult, setLlmTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    syncServerStatus();
  }, [syncServerStatus]);

  const handleSave = () => {
    updateConfig({
      hindsight: {
        baseUrl: hindsightUrl,
        apiKey: hindsightKey,
        bankName: hindsightBank,
        enabled: !!hindsightKey || config.hindsight.enabled,
      },
      llm: {
        provider: llmProvider as typeof config.llm.provider,
        apiKey: llmKey,
        model: llmModel,
        baseUrl: llmUrl || undefined,
        enabled: !!llmKey || config.llm.enabled || llmProvider === 'ollama',
      },
    });
    addToast('Settings saved successfully', 'success');
  };

  const handleTestHindsight = async () => {
    setTestingHs(true);
    setHsTestResult(null);
    try {
      const res = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'hindsight' }),
      });
      const data = await res.json();
      if (data.hindsight) {
        setHsTestResult(data.hindsight);
        if (data.hindsight.ok) {
          addToast('Hindsight connection verified', 'success');
          updateConfig({ hindsight: { ...config.hindsight, enabled: true } });
        } else {
          addToast(data.hindsight.message, 'info');
        }
      }
    } catch (err: any) {
      setHsTestResult({ ok: false, message: `Test request failed: ${err.message}` });
    } finally {
      setTestingHs(false);
    }
  };

  const handleTestLLM = async () => {
    setTestingLlm(true);
    setLlmTestResult(null);
    try {
      const res = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'llm' }),
      });
      const data = await res.json();
      if (data.llm) {
        setLlmTestResult(data.llm);
        if (data.llm.ok) {
          addToast('LLM connection verified', 'success');
          updateConfig({ llm: { ...config.llm, enabled: true } });
        } else {
          addToast(data.llm.message, 'info');
        }
      }
    } catch (err: any) {
      setLlmTestResult({ ok: false, message: `Test request failed: ${err.message}` });
    } finally {
      setTestingLlm(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in pb-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Settings & Integration Status</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Configure Hindsight persistent organizational memory and AI providers.
          </p>
        </div>
        <button onClick={handleSave} className="btn btn-primary text-xs">
          <Save className="w-3.5 h-3.5" /> Save Configuration
        </button>
      </div>

      {/* Security notice */}
      <div className="card p-3.5 mb-6 flex items-start gap-3 bg-[oklch(0.16_0.02_250)] border-l-4 border-l-[var(--color-brand-500)]">
        <ShieldCheck className="w-4 h-4 mt-0.5 text-[var(--color-brand-400)] flex-shrink-0" />
        <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
          <span className="font-semibold text-[var(--color-text-primary)]">Enterprise Security Standard: </span>
          API keys are managed securely server-side via <code className="text-[11px] font-mono bg-[var(--color-surface-2)] px-1 py-0.5 rounded">.env.local</code>. Never commit secrets. RootRecall proxy routes execute all Hindsight and LLM API calls server-side.
        </div>
      </div>

      {/* Hindsight Card */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold">Hindsight Memory Engine</h3>
            <a
              href="https://hindsight.vectorize.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-[var(--color-brand-400)] flex items-center gap-1 hover:underline"
            >
              Docs <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
              config.hindsight.enabled
                ? 'bg-[oklch(0.7_0.18_155/0.15)] text-[var(--color-status-resolved)] border border-[oklch(0.7_0.18_155/0.3)]'
                : 'bg-[oklch(0.75_0.18_55/0.15)] text-[var(--color-sev-2)] border border-[oklch(0.75_0.18_55/0.3)]'
            }`}>
              <Circle
                className={`w-2 h-2 fill-current ${
                  config.hindsight.enabled
                    ? 'text-[var(--color-status-resolved)]'
                    : 'text-[var(--color-sev-2)]'
                }`}
              />
              {config.hindsight.enabled
                ? 'Hindsight: Connected'
                : 'Hindsight: Not connected — using local fallback'}
            </div>
            <button
              onClick={handleTestHindsight}
              disabled={testingHs}
              className="btn btn-secondary text-xs h-7 px-2.5 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3 h-3 ${testingHs ? 'animate-spin' : ''}`} />
              Test Connection
            </button>
          </div>
        </div>

        {hsTestResult && (
          <div className={`mb-4 p-3 rounded-lg text-xs flex items-start gap-2 border ${
            hsTestResult.ok
              ? 'bg-[oklch(0.7_0.18_155/0.1)] border-[oklch(0.7_0.18_155/0.3)] text-[var(--color-status-resolved)]'
              : 'bg-[oklch(0.75_0.18_55/0.1)] border-[oklch(0.75_0.18_55/0.3)] text-[var(--color-sev-2)]'
          }`}>
            {hsTestResult.ok ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 leading-relaxed">{hsTestResult.message}</div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="hs-url" className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
              Hindsight Base URL
            </label>
            <input
              id="hs-url"
              className="input"
              value={hindsightUrl}
              onChange={(e) => setHindsightUrl(e.target.value)}
              placeholder="https://hindsight.vectorize.io"
            />
          </div>
          <div>
            <label htmlFor="hs-bank" className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
              Memory Bank ID (<code className="font-mono text-[10px]">HINDSIGHT_BANK_ID</code>)
            </label>
            <input
              id="hs-bank"
              className="input"
              value={hindsightBank}
              onChange={(e) => setHindsightBank(e.target.value)}
              placeholder="rootrecall-incidents"
            />
          </div>
          <div>
            <label htmlFor="hs-key" className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
              API Key (or set <code className="font-mono text-[10px]">HINDSIGHT_API_KEY</code> in .env.local)
            </label>
            <input
              id="hs-key"
              className="input"
              type="password"
              value={hindsightKey}
              onChange={(e) => setHindsightKey(e.target.value)}
              placeholder="Enter Hindsight API key (optional if set in environment)"
            />
          </div>
        </div>
        <p className="text-[10px] text-[var(--color-text-muted)] mt-4">
          Vectorize Hindsight provides persistent semantic memory across restarts. When credentials are not configured, RootRecall operates in deterministic local fallback mode.
        </p>
      </div>

      {/* LLM Card */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">AI / LLM Provider</h3>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
              config.llm.enabled
                ? 'bg-[oklch(0.7_0.18_155/0.15)] text-[var(--color-status-resolved)] border border-[oklch(0.7_0.18_155/0.3)]'
                : 'bg-[oklch(0.75_0.18_55/0.15)] text-[var(--color-sev-2)] border border-[oklch(0.75_0.18_55/0.3)]'
            }`}>
              <Circle
                className={`w-2 h-2 fill-current ${
                  config.llm.enabled
                    ? 'text-[var(--color-status-resolved)]'
                    : 'text-[var(--color-sev-2)]'
                }`}
              />
              {config.llm.enabled
                ? `LLM: Connected (${config.llm.provider})`
                : 'LLM: Not connected — using deterministic mode'}
            </div>
            <button
              onClick={handleTestLLM}
              disabled={testingLlm}
              className="btn btn-secondary text-xs h-7 px-2.5 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3 h-3 ${testingLlm ? 'animate-spin' : ''}`} />
              Test Connection
            </button>
          </div>
        </div>

        {llmTestResult && (
          <div className={`mb-4 p-3 rounded-lg text-xs flex items-start gap-2 border ${
            llmTestResult.ok
              ? 'bg-[oklch(0.7_0.18_155/0.1)] border-[oklch(0.7_0.18_155/0.3)] text-[var(--color-status-resolved)]'
              : 'bg-[oklch(0.75_0.18_55/0.1)] border-[oklch(0.75_0.18_55/0.3)] text-[var(--color-sev-2)]'
          }`}>
            {llmTestResult.ok ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 leading-relaxed">{llmTestResult.message}</div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="llm-provider" className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
              Provider
            </label>
            <select
              id="llm-provider"
              className="select w-full"
              value={llmProvider}
              onChange={(e) => setLlmProvider(e.target.value as typeof llmProvider)}
            >
              <option value="mock">Deterministic Fallback (No External LLM)</option>
              <option value="openai">OpenAI (GPT-4o, GPT-4o-mini)</option>
              <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
              <option value="google">Google Gemini (Gemini 2.0 Flash)</option>
              <option value="ollama">Ollama (Local LLM)</option>
            </select>
          </div>
          {llmProvider !== 'mock' && (
            <>
              <div>
                <label htmlFor="llm-key" className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                  API Key (or set <code className="font-mono text-[10px]">LLM_API_KEY</code> in .env.local)
                </label>
                <input
                  id="llm-key"
                  className="input"
                  type="password"
                  value={llmKey}
                  onChange={(e) => setLlmKey(e.target.value)}
                  placeholder="Enter API key (optional if set in environment)"
                />
              </div>
              <div>
                <label htmlFor="llm-model" className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                  Model
                </label>
                <input
                  id="llm-model"
                  className="input"
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                  placeholder={
                    llmProvider === 'openai' ? 'gpt-4o-mini' :
                    llmProvider === 'anthropic' ? 'claude-3-5-sonnet-20241022' :
                    llmProvider === 'google' ? 'gemini-2.0-flash' :
                    'llama3.2'
                  }
                />
              </div>
              <div>
                <label htmlFor="llm-url" className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                  Base URL (optional override)
                </label>
                <input
                  id="llm-url"
                  className="input"
                  value={llmUrl}
                  onChange={(e) => setLlmUrl(e.target.value)}
                  placeholder="e.g. http://localhost:11434 for Ollama"
                />
              </div>
            </>
          )}
        </div>
        <p className="text-[10px] text-[var(--color-text-muted)] mt-4">
          Deterministic mode is designed for offline evaluations and predictable demo runs. Live incident response utilizes configured LLM models.
        </p>
      </div>

      {/* Appearance */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Appearance</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">
              Application Theme
            </label>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}
