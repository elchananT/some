'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, AlertTriangle, Loader2, Terminal, Download, CloudDownload } from 'lucide-react';
import { ollamaProvider } from '@/lib/providers/ollama';
import { pullModel } from '@/lib/providers/ollama_pull';
import { setActiveProviderId } from '@/lib/providers';
import { readCreds, writeCreds, markOnboardingComplete } from '@/lib/ai/keys';

const RECOMMENDED_MODELS = ['gemma4', 'gemma4:e4b', 'llama4-scout', 'qwen3', 'gemma2', 'llama3.2'];

interface Props {
  onDone: () => void;
  onBack: () => void;
}

type Status = 'idle' | 'testing' | 'ok' | 'fail';

function detectOS(): 'mac' | 'linux' | 'windows' | 'unknown' {
  if (typeof navigator === 'undefined') return 'unknown';
  const p = navigator.platform.toLowerCase();
  if (p.includes('mac')) return 'mac';
  if (p.includes('win')) return 'windows';
  if (p.includes('linux')) return 'linux';
  return 'unknown';
}

export default function OllamaSetupStep({ onDone, onBack }: Props) {
  const initial = readCreds().ollama ?? {};
  const [baseURL, setBaseURL] = useState(initial.baseURL ?? 'http://localhost:11434');
  const [model, setModel] = useState(initial.model ?? 'gemma4');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [pullTarget, setPullTarget] = useState('gemma4');
  const [pulling, setPulling] = useState(false);
  const [pullPercent, setPullPercent] = useState(0);
  const [pullStatus, setPullStatus] = useState('');
  const [pullError, setPullError] = useState('');
  const os = useMemo(() => detectOS(), []);

  useEffect(() => {
    writeCreds({ ...readCreds(), ollama: { baseURL, model } });
  }, [baseURL, model]);

  const check = async () => {
    setStatus('testing');
    setMessage('');
    try {
      const res = await ollamaProvider.ping?.();
      if (res?.ok) {
        setStatus('ok');
        setMessage(`Running · ${res.latencyMs}ms`);
        if (res.models && res.models.length > 0) {
          setAvailableModels(res.models);
          if (!res.models.includes(model)) setModel(res.models[0]);
        }
      } else {
        setStatus('fail');
        setMessage(res?.message || 'Could not reach Ollama.');
      }
    } catch (e) {
      setStatus('fail');
      setMessage(e instanceof Error ? e.message : 'Could not reach Ollama.');
    }
  };

  const startPull = async () => {
    setPulling(true);
    setPullPercent(0);
    setPullStatus('Starting…');
    setPullError('');
    try {
      for await (const ev of pullModel(pullTarget, { baseURL })) {
        setPullPercent(ev.percent);
        setPullStatus(ev.status);
      }
      setPullStatus('Success');
      setPullPercent(100);
      setAvailableModels(prev => (prev.includes(pullTarget) ? prev : [...prev, pullTarget]));
      setModel(pullTarget);
    } catch (e) {
      setPullError(e instanceof Error ? e.message : 'Pull failed');
    } finally {
      setPulling(false);
    }
  };

  const finish = () => {
    writeCreds({ ...readCreds(), ollama: { baseURL, model } });
    setActiveProviderId('ollama');
    markOnboardingComplete('ollama');
    onDone();
  };

  const installCmd =
    os === 'mac' || os === 'linux'
      ? 'curl -fsSL https://ollama.com/install.sh | sh'
      : 'Download Ollama for Windows from https://ollama.com/download';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xl bg-[var(--color-surface,#FFFFFF)] border border-[var(--color-border,#E8E4DC)] rounded-3xl p-8 flex flex-col gap-5"
    >
      <div>
        <h2 className="text-2xl font-serif italic text-[var(--color-ink,#1F1F1C)]">Connect Ollama</h2>
        <p className="text-sm text-[var(--color-muted,#7A756B)] mt-1">
          Run a model locally on your machine — 100% private, no account needed.
        </p>
      </div>

      {/* Step 1: Install */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted,#7A756B)]">
          <Download size={12} /> 1. Install
        </div>
        <div className="rounded-xl border border-[var(--color-border,#E8E4DC)] bg-[var(--color-bg,#FAF9F6)] p-3">
          <code className="font-mono text-xs text-[var(--color-ink,#1F1F1C)] break-all select-all" dir="ltr">
            {installCmd}
          </code>
        </div>
      </section>

      {/* Step 2: Run */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted,#7A756B)]">
          <Terminal size={12} /> 2. Run &amp; allow browser access
        </div>
        <div className="rounded-xl border border-[var(--color-border,#E8E4DC)] bg-[var(--color-bg,#FAF9F6)] p-3 space-y-1">
          <code className="font-mono text-xs block" dir="ltr">OLLAMA_ORIGINS=&quot;*&quot; ollama serve</code>
        </div>
        <p className="text-xs text-[var(--color-muted,#7A756B)]">
          The <code className="font-mono">OLLAMA_ORIGINS</code> env var is required so this browser page can reach your local Ollama.
        </p>

        <label className="flex flex-col gap-1 mt-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted,#7A756B)]">Base URL</span>
          <input
            value={baseURL}
            onChange={e => setBaseURL(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[var(--color-border,#E8E4DC)] bg-[var(--color-bg,#FAF9F6)] font-mono text-xs focus:outline-none focus:border-[var(--color-accent,#CC785C)]"
          />
        </label>

        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={check}
            disabled={status === 'testing'}
            className="px-4 py-2.5 rounded-xl border border-[var(--color-border,#E8E4DC)] text-sm font-medium hover:border-[var(--color-accent,#CC785C)] disabled:opacity-50 inline-flex items-center gap-2"
          >
            {status === 'testing' ? <Loader2 size={14} className="animate-spin" /> : null}
            Check connection
          </button>
          {status === 'ok' && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <Check size={12} /> {message}
            </span>
          )}
          {status === 'fail' && (
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              <AlertTriangle size={12} /> {message}
            </span>
          )}
        </div>
      </section>

      {/* Step 3: Pull a model */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted,#7A756B)]">
          <CloudDownload size={12} /> 3. Pull a recommended model
        </div>
        <div className="flex items-center gap-2">
          <select
            value={pullTarget}
            onChange={e => setPullTarget(e.target.value)}
            disabled={pulling}
            className="flex-1 px-3 py-2.5 rounded-xl border border-[var(--color-border,#E8E4DC)] bg-[var(--color-bg,#FAF9F6)] font-mono text-sm focus:outline-none focus:border-[var(--color-accent,#CC785C)] disabled:opacity-50"
          >
            {RECOMMENDED_MODELS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <button
            onClick={startPull}
            disabled={pulling || !pullTarget.trim()}
            className="px-4 py-2.5 rounded-xl bg-[var(--color-accent,#CC785C)] text-white text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2"
          >
            {pulling ? <Loader2 size={14} className="animate-spin" /> : <CloudDownload size={14} />}
            {pulling ? 'Pulling…' : 'Pull'}
          </button>
        </div>
        {(pulling || pullPercent > 0 || pullError) && (
          <div className="flex flex-col gap-1.5" aria-live="polite">
            <div className="h-2 rounded-full bg-[var(--color-border,#E8E4DC)] overflow-hidden">
              <div
                className="h-full bg-[var(--color-accent,#CC785C)] transition-all duration-200"
                style={{ width: `${pullPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-[var(--color-muted,#7A756B)] font-mono">
              <span>{pullError ? `⚠ ${pullError}` : pullStatus}</span>
              <span>{pullPercent}%</span>
            </div>
          </div>
        )}

        <div className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted,#7A756B)] mt-2">
          Active model
        </div>
        {availableModels.length > 0 ? (
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            className="px-4 py-3 rounded-xl border border-[var(--color-border,#E8E4DC)] bg-[var(--color-bg,#FAF9F6)] text-sm focus:outline-none focus:border-[var(--color-accent,#CC785C)]"
          >
            {availableModels.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        ) : (
          <input
            value={model}
            onChange={e => setModel(e.target.value)}
            placeholder="llama3.2"
            className="px-4 py-3 rounded-xl border border-[var(--color-border,#E8E4DC)] bg-[var(--color-bg,#FAF9F6)] font-mono text-sm focus:outline-none focus:border-[var(--color-accent,#CC785C)]"
          />
        )}
      </section>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted,#7A756B)] hover:text-[var(--color-ink,#1F1F1C)]"
        >
          ← Back
        </button>
        <button
          onClick={finish}
          disabled={!baseURL.trim() || !model.trim()}
          className="px-5 py-3 rounded-xl bg-[var(--color-ink,#1F1F1C)] text-white text-sm font-medium disabled:opacity-50"
        >
          Save &amp; continue
        </button>
      </div>
    </motion.div>
  );
}
