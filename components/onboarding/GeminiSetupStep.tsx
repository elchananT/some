'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { geminiProvider } from '@/lib/providers/gemini';
import { setActiveProviderId } from '@/lib/providers';
import { readCreds, writeCreds, markOnboardingComplete } from '@/lib/ai/keys';

interface Props {
  onDone: () => void;
  onBack: () => void;
}

type Status = 'idle' | 'testing' | 'ok' | 'fail';

export default function GeminiSetupStep({ onDone, onBack }: Props) {
  const initial = readCreds().gemini ?? {};
  const [apiKey, setApiKey] = useState(initial.apiKey ?? '');
  const [model, setModel] = useState(initial.model ?? 'gemini-2.5-flash');
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string>('');

  const test = async () => {
    setStatus('testing');
    setMessage('');
    writeCreds({ ...readCreds(), gemini: { apiKey: apiKey.trim(), model } });
    try {
      const res = await geminiProvider.ping?.();
      if (res?.ok) {
        setStatus('ok');
        setMessage(`Connected · ${model} · ${res.latencyMs}ms`);
      } else {
        setStatus('fail');
        setMessage(res?.message || 'Connection failed.');
      }
    } catch (e) {
      setStatus('fail');
      setMessage(e instanceof Error ? e.message : 'Connection failed.');
    }
  };

  const finish = () => {
    writeCreds({ ...readCreds(), gemini: { apiKey: apiKey.trim(), model } });
    setActiveProviderId('gemini');
    markOnboardingComplete('gemini');
    onDone();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-lg bg-[var(--color-surface,#FFFFFF)] border border-[var(--color-border,#E8E4DC)] rounded-3xl p-8 flex flex-col gap-5"
    >
      <div>
        <h2 className="text-2xl font-serif italic text-[var(--color-ink,#1F1F1C)]">Connect Gemini</h2>
        <p className="text-sm text-[var(--color-muted,#7A756B)] mt-1">
          Your key is stored only in this browser — it never leaves your device.
        </p>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted,#7A756B)]">API key</span>
        <div className="flex items-center gap-2">
          <input
            type={show ? 'text' : 'password'}
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="AIza…"
            className="flex-1 px-4 py-3 rounded-xl border border-[var(--color-border,#E8E4DC)] bg-[var(--color-bg,#FAF9F6)] font-mono text-sm focus:outline-none focus:border-[var(--color-accent,#CC785C)]"
          />
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="text-xs px-3 py-2 rounded-xl border border-[var(--color-border,#E8E4DC)] text-[var(--color-muted,#7A756B)] hover:text-[var(--color-ink,#1F1F1C)]"
          >
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[var(--color-accent,#CC785C)] inline-flex items-center gap-1 hover:underline"
        >
          Get a free key from Google AI Studio <ExternalLink size={12} />
        </a>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted,#7A756B)]">Model</span>
        <select
          value={model}
          onChange={e => setModel(e.target.value)}
          className="px-4 py-3 rounded-xl border border-[var(--color-border,#E8E4DC)] bg-[var(--color-bg,#FAF9F6)] text-sm focus:outline-none focus:border-[var(--color-accent,#CC785C)]"
        >
          <option value="gemini-2.5-flash">gemini-2.5-flash (fast, free tier)</option>
          <option value="gemini-2.5-pro">gemini-2.5-pro (higher quality)</option>
        </select>
      </label>

      <div className="flex items-center gap-3">
        <button
          onClick={test}
          disabled={!apiKey.trim() || status === 'testing'}
          className="px-4 py-2.5 rounded-xl border border-[var(--color-border,#E8E4DC)] text-sm font-medium hover:border-[var(--color-accent,#CC785C)] disabled:opacity-50 inline-flex items-center gap-2"
        >
          {status === 'testing' ? <Loader2 size={14} className="animate-spin" /> : null}
          Test connection
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

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted,#7A756B)] hover:text-[var(--color-ink,#1F1F1C)]"
        >
          ← Back
        </button>
        <button
          onClick={finish}
          disabled={!apiKey.trim()}
          className="px-5 py-3 rounded-xl bg-[var(--color-ink,#1F1F1C)] text-white text-sm font-medium disabled:opacity-50"
        >
          Save & continue
        </button>
      </div>
    </motion.div>
  );
}
