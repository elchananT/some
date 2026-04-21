'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { X, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { readCreds, writeCreds, type ProviderCredentials } from '@/lib/ai/keys';
import { getProvider, AVAILABLE_PROVIDERS, setActiveProviderId, getActiveProviderId } from '@/lib/providers';
import type { ProviderId, PingResult } from '@/lib/providers/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { TOOL_REGISTRY, ALL_TOOL_IDS } from '@/lib/tools/registry';
import {
  readToolKeys,
  updateToolKey,
  readEnabledTools,
  setToolEnabled,
} from '@/lib/tools/keys';
import type { ToolId, ToolKeys } from '@/lib/tools/types';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

type Status = { state: 'idle' | 'testing' | 'ok' | 'error'; message?: string; latencyMs?: number };

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro'];
const OPENAI_MODELS = ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'];
const ANTHROPIC_MODELS = ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'];

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const isMobile = useIsMobile();
  const [creds, setCreds] = useState<ProviderCredentials>(() => readCreds());
  const [activeProvider, setActiveProvider] = useState<ProviderId>('mock');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<Status>({ state: 'idle' });
  const [openaiStatus, setOpenaiStatus] = useState<Status>({ state: 'idle' });
  const [ollamaStatus, setOllamaStatus] = useState<Status>({ state: 'idle' });
  const [anthropicStatus, setAnthropicStatus] = useState<Status>({ state: 'idle' });

  useEffect(() => {
    if (open) {
      setCreds(readCreds());
      setActiveProvider(getActiveProviderId());
    }
  }, [open]);

  function save(next: ProviderCredentials) {
    setCreds(next);
    writeCreds(next);
  }

  async function testConnection(id: ProviderId, setter: (s: Status) => void) {
    setter({ state: 'testing' });
    try {
      // Ensure active provider is switched to the one we test so getProvider() returns it.
      const prev = getActiveProviderId();
      setActiveProviderId(id);
      const provider = getProvider();
      setActiveProviderId(prev);
      if (!provider.ping) {
        setter({ state: 'error', message: 'Provider does not support connection test.' });
        return;
      }
      const res: PingResult = await provider.ping();
      if (res.ok) {
        setter({ state: 'ok', message: res.message || 'Connected', latencyMs: res.latencyMs });
      } else {
        setter({ state: 'error', message: res.message || 'Connection failed.' });
      }
    } catch (e: unknown) {
      setter({ state: 'error', message: (e as Error)?.message || 'Unknown error' });
    }
  }

  function activateProvider(id: ProviderId) {
    setActiveProviderId(id);
    setActiveProvider(id);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="settings-backdrop"
            className="fixed inset-0 bg-black/30 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            key="settings-panel"
            role="dialog"
            aria-label="Settings"
            // Mobile: bottom sheet (max 92svh), rounded top, drag-down to dismiss.
            // Desktop: right-side drawer, unchanged.
            className={
              isMobile
                ? 'fixed left-0 right-0 bottom-0 max-h-[92svh] h-[92svh] bg-[var(--color-surface,#ffffff)] border-t border-[var(--color-border,#E8E4DC)] rounded-t-2xl z-50 shadow-2xl flex flex-col touch-pan-y'
                : 'fixed top-0 right-0 h-full w-full sm:w-[440px] bg-[var(--color-surface,#ffffff)] border-l border-[var(--color-border,#E8E4DC)] z-50 shadow-2xl flex flex-col'
            }
            initial={isMobile ? { y: '100%' } : { x: 480 }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: 480 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            drag={isMobile ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info: PanInfo) => {
              // Dismiss if the user dragged more than ~120px OR flicked fast downward.
              if (isMobile && (info.offset.y > 120 || info.velocity.y > 600)) {
                onClose();
              }
            }}
          >
            {/* Mobile drag handle — acts as the visual affordance for dragging the sheet down. */}
            {isMobile && (
              <div className="pt-2 pb-1 flex justify-center shrink-0" aria-hidden>
                <div className="h-1.5 w-10 rounded-full bg-[var(--color-border,#E8E4DC)]" />
              </div>
            )}
            <header className="flex items-center justify-between px-6 py-4 sm:py-5 border-b border-[var(--color-border,#E8E4DC)]">
              <div>
                <h2 className="text-lg font-serif text-[var(--color-ink,#1F1F1C)]">Settings</h2>
                <p className="text-xs text-[var(--color-muted,#7A756B)] mt-1">
                  Your keys stay in this browser (localStorage) — never sent to our servers.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-[var(--color-bg,#FAF9F6)] text-[var(--color-muted,#7A756B)] hover:text-[var(--color-ink,#1F1F1C)]"
                aria-label="Close settings"
              >
                <X size={18} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
              {/* Active provider picker */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted,#7A756B)] mb-3">
                  Active Provider
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_PROVIDERS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => activateProvider(p.id)}
                      className={`px-3 py-2 rounded-xl border text-sm transition-all text-left ${
                        activeProvider === p.id
                          ? 'border-[var(--color-accent,#CC785C)] bg-[var(--color-accent,#CC785C)]/10 text-[var(--color-ink,#1F1F1C)]'
                          : 'border-[var(--color-border,#E8E4DC)] hover:bg-[var(--color-bg,#FAF9F6)] text-[var(--color-ink,#1F1F1C)]'
                      }`}
                    >
                      <div className="font-semibold">{p.label}</div>
                      <div className="text-xs text-[var(--color-muted,#7A756B)] mt-0.5">{p.hint}</div>
                    </button>
                  ))}
                </div>
              </section>

              {/* Gemini */}
              <ProviderSection
                title="Gemini (Google)"
                description="Fast, multimodal, strong on structured output."
                status={geminiStatus}
              >
                <KeyInput
                  id="gemini-key"
                  value={creds.gemini?.apiKey || ''}
                  show={showGeminiKey}
                  onToggle={() => setShowGeminiKey(v => !v)}
                  onChange={v => save({ ...creds, gemini: { ...creds.gemini, apiKey: v } })}
                  placeholder="AIza…"
                />
                <ModelSelect
                  value={creds.gemini?.model || GEMINI_MODELS[0]}
                  models={GEMINI_MODELS}
                  onChange={v => save({ ...creds, gemini: { ...creds.gemini, model: v } })}
                />
                <TestButton onClick={() => testConnection('gemini', setGeminiStatus)} status={geminiStatus} />
              </ProviderSection>

              {/* Anthropic (Claude) */}
              <ProviderSection
                title="Claude (Anthropic)"
                description="Great for Claude Pro subscribers. Key stays in this browser."
                status={anthropicStatus}
              >
                <KeyInput
                  id="anthropic-key"
                  value={creds.anthropic?.apiKey || ''}
                  show={showAnthropicKey}
                  onToggle={() => setShowAnthropicKey(v => !v)}
                  onChange={v => save({ ...creds, anthropic: { ...creds.anthropic, apiKey: v } })}
                  placeholder="sk-ant-…"
                />
                <ModelSelect
                  value={creds.anthropic?.model || ANTHROPIC_MODELS[0]}
                  models={ANTHROPIC_MODELS}
                  onChange={v => save({ ...creds, anthropic: { ...creds.anthropic, model: v } })}
                />
                <TestButton
                  onClick={() => testConnection('anthropic', setAnthropicStatus)}
                  status={anthropicStatus}
                />
              </ProviderSection>

              {/* OpenAI — demoted to Advanced providers accordion */}
              <details className="group rounded-2xl border border-[var(--color-border,#E8E4DC)] bg-[var(--color-surface,#FFFFFF)] open:shadow-sm">
                <summary className="list-none cursor-pointer px-4 py-3 flex items-center justify-between gap-2 select-none">
                  <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted,#7A756B)]">
                    Advanced providers
                  </span>
                  <span className="text-xs text-[var(--color-muted,#7A756B)] group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <div className="px-4 pb-4">
                  <ProviderSection
                    title="OpenAI"
                    description="GPT-4o family. Requires a billing-enabled key."
                    status={openaiStatus}
                  >
                    <KeyInput
                      id="openai-key"
                      value={creds.openai?.apiKey || ''}
                      show={showOpenAIKey}
                      onToggle={() => setShowOpenAIKey(v => !v)}
                      onChange={v => save({ ...creds, openai: { ...creds.openai, apiKey: v } })}
                      placeholder="sk-…"
                    />
                    <ModelSelect
                      value={creds.openai?.model || OPENAI_MODELS[0]}
                      models={OPENAI_MODELS}
                      onChange={v => save({ ...creds, openai: { ...creds.openai, model: v } })}
                    />
                    <TextInput
                      label="Base URL (optional)"
                      value={creds.openai?.baseURL || ''}
                      onChange={v => save({ ...creds, openai: { ...creds.openai, baseURL: v || undefined } })}
                      placeholder="https://api.openai.com/v1"
                    />
                    <TestButton onClick={() => testConnection('openai', setOpenaiStatus)} status={openaiStatus} />
                  </ProviderSection>
                </div>
              </details>

              {/* Ollama */}
              <ProviderSection
                title="Ollama (Local)"
                description="Offline, private, no API key. Run `ollama serve` first."
                status={ollamaStatus}
              >
                <TextInput
                  label="Base URL"
                  value={creds.ollama?.baseURL || 'http://localhost:11434'}
                  onChange={v => save({ ...creds, ollama: { ...creds.ollama, baseURL: v } })}
                  placeholder="http://localhost:11434"
                />
                <TextInput
                  label="Model"
                  value={creds.ollama?.model || 'llama3.2'}
                  onChange={v => save({ ...creds, ollama: { ...creds.ollama, model: v } })}
                  placeholder="llama3.2"
                />
                <TestButton onClick={() => testConnection('ollama', setOllamaStatus)} status={ollamaStatus} />
              </ProviderSection>

              {/* Illustration privacy */}
              <div className="p-4 rounded-2xl border border-[var(--color-border,#E8E4DC)] bg-[var(--color-surface,#FFFFFF)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-ink,#1F1F1C)]">
                      Use pollinations.ai for illustrations
                    </div>
                    <p className="text-xs text-[var(--color-muted,#7A756B)] mt-1">
                      When enabled, workbook cover prompts are sent to pollinations.ai (free, no key). Leave off to use local SVG only.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={!!creds.consent?.pollinations}
                      onChange={e =>
                        save({
                          ...creds,
                          consent: { ...(creds.consent ?? {}), pollinations: e.target.checked },
                        })
                      }
                    />
                    <div className="w-10 h-5 bg-[var(--color-border,#E8E4DC)] rounded-full peer-checked:bg-[var(--color-accent,#CC785C)] transition-colors" />
                    <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                  </label>
                </div>
              </div>

              <ToolsSection />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function ProviderSection({
  title,
  description,
  status,
  children,
}: {
  title: string;
  description: string;
  status: Status;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-ink,#1F1F1C)]">{title}</h3>
          <p className="text-xs text-[var(--color-muted,#7A756B)] mt-0.5">{description}</p>
        </div>
        <StatusPill status={status} />
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function StatusPill({ status }: { status: Status }) {
  const base = 'inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border';
  if (status.state === 'ok') {
    return (
      <span className={`${base} border-emerald-300 bg-emerald-50 text-emerald-700`} aria-live="polite">
        <CheckCircle2 size={12} /> Connected{status.latencyMs ? ` · ${status.latencyMs}ms` : ''}
      </span>
    );
  }
  if (status.state === 'error') {
    return (
      <span className={`${base} border-rose-300 bg-rose-50 text-rose-700`} aria-live="polite" title={status.message}>
        <AlertCircle size={12} /> Error
      </span>
    );
  }
  if (status.state === 'testing') {
    return (
      <span className={`${base} border-amber-300 bg-amber-50 text-amber-700`} aria-live="polite">
        <Loader2 size={12} className="animate-spin" /> Testing…
      </span>
    );
  }
  return (
    <span className={`${base} border-[var(--color-border,#E8E4DC)] bg-[var(--color-bg,#FAF9F6)] text-[var(--color-muted,#7A756B)]`}>
      Idle
    </span>
  );
}

function KeyInput({
  id,
  value,
  show,
  onToggle,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  show: boolean;
  onToggle: () => void;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs text-[var(--color-muted,#7A756B)] mb-1">
        API Key
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-10 rounded-xl border border-[var(--color-border,#E8E4DC)] bg-[var(--color-bg,#FAF9F6)] text-sm text-[var(--color-ink,#1F1F1C)] focus:outline-none focus:border-[var(--color-accent,#CC785C)]"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[var(--color-muted,#7A756B)] hover:text-[var(--color-ink,#1F1F1C)]"
          aria-label={show ? 'Hide key' : 'Show key'}
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}

function ModelSelect({
  value,
  models,
  onChange,
}: {
  value: string;
  models: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-[var(--color-muted,#7A756B)] mb-1">Model</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border border-[var(--color-border,#E8E4DC)] bg-[var(--color-bg,#FAF9F6)] text-sm text-[var(--color-ink,#1F1F1C)] focus:outline-none focus:border-[var(--color-accent,#CC785C)]"
      >
        {models.map(m => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-[var(--color-muted,#7A756B)] mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl border border-[var(--color-border,#E8E4DC)] bg-[var(--color-bg,#FAF9F6)] text-sm text-[var(--color-ink,#1F1F1C)] focus:outline-none focus:border-[var(--color-accent,#CC785C)]"
      />
    </div>
  );
}

function TestButton({ onClick, status }: { onClick: () => void; status: Status }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onClick}
        disabled={status.state === 'testing'}
        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--color-ink,#1F1F1C)] text-white hover:opacity-90 disabled:opacity-50"
      >
        {status.state === 'testing' ? 'Testing…' : 'Test connection'}
      </button>
      {status.state === 'error' && status.message && (
        <span className="text-xs text-rose-700 truncate" title={status.message}>
          {status.message}
        </span>
      )}
    </div>
  );
}

/**
 * Tools & Integrations — BYOK keys + per-tool enable toggles for the 8 in-app
 * AI tools (web search, URL fetch, Wikipedia, Wolfram, KaTeX, Mermaid, Unsplash,
 * YouTube transcript). Keys live in localStorage only; each tool can be toggled
 * off even if it's default-on.
 */
function ToolsSection() {
  const [keys, setKeys] = useState<ToolKeys>(() => readToolKeys());
  const [enabled, setEnabled] = useState<Partial<Record<ToolId, boolean>>>(() => readEnabledTools());
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  function updateKey<K extends keyof ToolKeys>(k: K, v: string) {
    updateToolKey(k, v);
    setKeys(readToolKeys());
  }

  function toggle(id: ToolId, on: boolean) {
    setToolEnabled(id, on);
    setEnabled(readEnabledTools());
  }

  const KEY_FIELDS: Array<{ k: keyof ToolKeys; label: string; help: string; link?: string }> = [
    { k: 'tavily', label: 'Tavily API Key', help: 'Enables web search grounding.', link: 'https://app.tavily.com/home' },
    { k: 'wolfram', label: 'Wolfram App ID', help: 'Enables math/science answers.', link: 'https://developer.wolframalpha.com/access' },
    { k: 'unsplash', label: 'Unsplash Access Key', help: 'Enables royalty-free image search.', link: 'https://unsplash.com/oauth/applications' },
    { k: 'youtube', label: 'YouTube Data API Key', help: 'Adds video titles to transcripts (transcripts work without a key).', link: 'https://console.cloud.google.com/apis/credentials' },
  ];

  return (
    <section className="space-y-3 pt-2 mt-2 border-t border-[var(--color-border,#E8E4DC)]">
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-ink,#1F1F1C)]">Tools & Integrations</h3>
        <p className="text-xs text-[var(--color-muted,#7A756B)] mt-0.5">
          Give the AI extra powers during workbook generation. All keys stay in your browser.
        </p>
      </div>

      <div className="space-y-2">
        {KEY_FIELDS.map(f => (
          <div key={f.k as string}>
            <div className="flex items-center justify-between">
              <label className="text-xs text-[var(--color-muted,#7A756B)]">
                {f.label}
                {f.link && (
                  <>
                    {' '}
                    ·{' '}
                    <a
                      href={f.link}
                      target="_blank"
                      rel="noreferrer"
                      className="underline hover:text-[var(--color-ink,#1F1F1C)]"
                    >
                      get one
                    </a>
                  </>
                )}
              </label>
            </div>
            <div className="relative mt-1">
              <input
                type={showKey[f.k as string] ? 'text' : 'password'}
                value={(keys[f.k] as string) || ''}
                onChange={e => updateKey(f.k, e.target.value)}
                placeholder="Paste key…"
                className="w-full px-3 py-2 pr-10 rounded-xl border border-[var(--color-border,#E8E4DC)] bg-[var(--color-bg,#FAF9F6)] text-sm text-[var(--color-ink,#1F1F1C)] focus:outline-none focus:border-[var(--color-accent,#CC785C)]"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowKey(s => ({ ...s, [f.k as string]: !s[f.k as string] }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[var(--color-muted,#7A756B)] hover:text-[var(--color-ink,#1F1F1C)]"
                aria-label="Toggle visibility"
              >
                {showKey[f.k as string] ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="text-[11px] text-[var(--color-muted,#7A756B)] mt-1">{f.help}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="text-xs text-[var(--color-muted,#7A756B)] mb-1.5">Enabled tools</div>
        <div className="space-y-1.5">
          {ALL_TOOL_IDS.map(id => {
            const def = TOOL_REGISTRY[id];
            const on = enabled[id] ?? def.defaultEnabled;
            const needsKey = def.requiresKey && !(keys[def.requiresKey as keyof ToolKeys]);
            return (
              <div
                key={id}
                className="flex items-start justify-between gap-3 p-2.5 rounded-xl border border-[var(--color-border,#E8E4DC)] bg-[var(--color-surface,#FFFFFF)]"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[var(--color-ink,#1F1F1C)]">{def.name}</div>
                  <p className="text-[11px] text-[var(--color-muted,#7A756B)] mt-0.5 truncate">
                    {def.description}
                  </p>
                  {needsKey && (
                    <p className="text-[11px] text-amber-700 mt-0.5">Needs a key above to activate.</p>
                  )}
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={!!on}
                    onChange={e => toggle(id, e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-[var(--color-border,#E8E4DC)] rounded-full peer-checked:bg-[var(--color-accent,#CC785C)] transition-colors" />
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                </label>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
