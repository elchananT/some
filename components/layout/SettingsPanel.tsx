'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { X, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { readCreds, writeCreds, type ProviderCredentials } from '@/lib/ai/keys';
import { modelsFor } from '@/lib/ai/model_catalog';
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

const TABS = [
  { id: 'keys', label: 'API Keys' },
  { id: 'models', label: 'Models' },
  { id: 'tools', label: 'Tools' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'about', label: 'About' },
] as const;

type TabId = (typeof TABS)[number]['id'];

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

  const [activeTab, setActiveTab] = useState<TabId>('keys');

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
            <header className="px-6 py-4 sm:py-5 border-b border-[var(--color-border,#E8E4DC)] shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-serif text-[var(--color-ink,#1F1F1C)]">Settings</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-[var(--color-bg,#FAF9F6)] text-[var(--color-muted,#7A756B)] hover:text-[var(--color-ink,#1F1F1C)]"
                  aria-label="Close settings"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Tab Bar */}
              <div className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`pb-2 text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all border-b-2 ${
                      activeTab === tab.id
                        ? 'border-[var(--color-accent,#CC785C)] text-[var(--color-ink,#1F1F1C)]'
                        : 'border-transparent text-[var(--color-muted,#7A756B)] hover:text-[var(--color-ink,#1F1F1C)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
              {activeTab === 'keys' && (
                <div className="space-y-8">
                  {/* Gemini */}
                  <ProviderSection
                    title="Gemini (Google)"
                    description="Fast, multimodal, strong on structured output. Recommend for free use."
                    status={geminiStatus}
                  >
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-[var(--color-accent,#CC785C)] hover:underline"
                      >
                        Get Gemini Key ↗
                      </a>
                    </div>
                    <KeyInput
                      id="gemini-key"
                      value={creds.gemini?.apiKey || ''}
                      show={showGeminiKey}
                      onToggle={() => setShowGeminiKey((v) => !v)}
                      onChange={(v) => save({ ...creds, gemini: { ...creds.gemini, apiKey: v } })}
                      placeholder="AIza…"
                    />
                    <TestButton onClick={() => testConnection('gemini', setGeminiStatus)} status={geminiStatus} />
                  </ProviderSection>

                  {/* Anthropic (Claude) */}
                  <ProviderSection
                    title="Claude (Anthropic)"
                    description="Great for Claude Pro subscribers. Key stays in this browser."
                    status={anthropicStatus}
                  >
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <a
                        href="https://console.anthropic.com/settings/keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-[var(--color-accent,#CC785C)] hover:underline"
                      >
                        Get Claude Key ↗
                      </a>
                    </div>
                    <KeyInput
                      id="anthropic-key"
                      value={creds.anthropic?.apiKey || ''}
                      show={showAnthropicKey}
                      onToggle={() => setShowAnthropicKey((v) => !v)}
                      onChange={(v) => save({ ...creds, anthropic: { ...creds.anthropic, apiKey: v } })}
                      placeholder="sk-ant-…"
                    />
                    <TestButton
                      onClick={() => testConnection('anthropic', setAnthropicStatus)}
                      status={anthropicStatus}
                    />
                  </ProviderSection>

                  {/* OpenAI */}
                  <ProviderSection
                    title="OpenAI"
                    description="GPT family. Requires a billing-enabled key."
                    status={openaiStatus}
                  >
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-[var(--color-accent,#CC785C)] hover:underline"
                      >
                        Get OpenAI Key ↗
                      </a>
                    </div>
                    <KeyInput
                      id="openai-key"
                      value={creds.openai?.apiKey || ''}
                      show={showOpenAIKey}
                      onToggle={() => setShowOpenAIKey((v) => !v)}
                      onChange={(v) => save({ ...creds, openai: { ...creds.openai, apiKey: v } })}
                      placeholder="sk-…"
                    />
                    <TextInput
                      label="Base URL (optional)"
                      value={creds.openai?.baseURL || ''}
                      onChange={(v) => save({ ...creds, openai: { ...creds.openai, baseURL: v || undefined } })}
                      placeholder="https://api.openai.com/v1"
                    />
                    <TestButton onClick={() => testConnection('openai', setOpenaiStatus)} status={openaiStatus} />
                  </ProviderSection>

                  {/* Ollama */}
                  <ProviderSection
                    title="Ollama (Local)"
                    description="Offline, private, no API key. Run `ollama serve` first."
                    status={ollamaStatus}
                  >
                    <TextInput
                      label="Base URL"
                      value={creds.ollama?.baseURL || 'http://localhost:11434'}
                      onChange={(v) => save({ ...creds, ollama: { ...creds.ollama, baseURL: v } })}
                      placeholder="http://localhost:11434"
                    />
                    <TestButton onClick={() => testConnection('ollama', setOllamaStatus)} status={ollamaStatus} />
                  </ProviderSection>
                </div>
              )}

              {activeTab === 'models' && (
                <div className="space-y-8">
                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted,#7A756B)] mb-3">
                      Default Models
                    </h3>
                    <p className="text-xs text-[var(--color-muted,#7A756B)] mb-6">
                      Set the default model to use for each provider. You can also switch these instantly in the chat composer.
                    </p>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--color-ink,#1F1F1C)] mb-2">
                          Gemini Default
                        </label>
                        <ModelSelect
                          value={creds.gemini?.model || modelsFor('gemini')[0]?.id}
                          models={modelsFor('gemini').map((m) => m.id)}
                          onChange={(v) => save({ ...creds, gemini: { ...creds.gemini, model: v } })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--color-ink,#1F1F1C)] mb-2">
                          Claude Default
                        </label>
                        <ModelSelect
                          value={creds.anthropic?.model || modelsFor('anthropic')[0]?.id}
                          models={modelsFor('anthropic').map((m) => m.id)}
                          onChange={(v) => save({ ...creds, anthropic: { ...creds.anthropic, model: v } })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--color-ink,#1F1F1C)] mb-2">
                          OpenAI Default
                        </label>
                        <ModelSelect
                          value={creds.openai?.model || modelsFor('openai')[0]?.id}
                          models={modelsFor('openai').map((m) => m.id)}
                          onChange={(v) => save({ ...creds, openai: { ...creds.openai, model: v } })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--color-ink,#1F1F1C)] mb-2">
                          Ollama Default
                        </label>
                        <TextInput
                          label=""
                          value={creds.ollama?.model || 'llama3.2'}
                          onChange={(v) => save({ ...creds, ollama: { ...creds.ollama, model: v } })}
                          placeholder="llama3.2"
                        />
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {activeTab === 'tools' && <ToolsSection />}

              {activeTab === 'appearance' && (
                <div className="space-y-8">
                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted,#7A756B)] mb-3">
                      Theme & Effects
                    </h3>
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
                            onChange={(e) =>
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
                  </section>
                </div>
              )}

              {activeTab === 'about' && (
                <div className="space-y-8">
                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted,#7A756B)] mb-3">
                      About EduSpark
                    </h3>
                    <div className="p-4 rounded-2xl border border-[var(--color-border,#E8E4DC)] bg-[var(--color-surface,#FFFFFF)] space-y-4">
                      <p className="text-sm text-[var(--color-ink,#1F1F1C)] leading-relaxed">
                        EduSpark is a next-generation AI Workbook Architect designed for educators and curriculum designers. 
                        It is built on a "Bring Your Own Key" (BYOK) architecture, meaning your data and keys never touch our servers.
                      </p>
                      <div className="text-[10px] text-[var(--color-muted,#7A756B)]">
                        Version 2.5.0 · April 2026
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-rose-700 mb-3">
                      Danger Zone
                    </h3>
                    <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50 space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-rose-800">Clear all settings</h4>
                        <p className="text-xs text-rose-700 mt-1">
                          This will remove all stored API keys and preferences from your browser. This cannot be undone.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to clear all settings? This will delete your API keys.')) {
                            localStorage.removeItem('eduspark_ai_keys_v1');
                            localStorage.removeItem('eduspark_onboarding_v1');
                            window.location.reload();
                          }
                        }}
                        className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors"
                      >
                        Reset Application
                      </button>
                    </div>
                  </section>
                </div>
              )}
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
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="block text-xs text-[var(--color-muted,#7A756B)]">
          API Key
        </label>
        <span className="text-[10px] text-[var(--color-accent,#CC785C)] opacity-70">
          Paste multiple keys separated by comma to rotate
        </span>
      </div>
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
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  function updateKey<K extends keyof ToolKeys>(k: K, v: string) {
    updateToolKey(k, v);
    setKeys(readToolKeys());
  }

  const KEY_FIELDS: Array<{ k: keyof ToolKeys; label: string; help: string; link?: string }> = [
    { k: 'tavily', label: 'Tavily API Key', help: 'Enables web search grounding.', link: 'https://app.tavily.com/home' },
    { k: 'wolfram', label: 'Wolfram App ID', help: 'Enables math/science answers.', link: 'https://developer.wolframalpha.com/access' },
    { k: 'unsplash', label: 'Unsplash Access Key', help: 'Enables royalty-free image search.', link: 'https://unsplash.com/oauth/applications' },
    { k: 'youtube', label: 'YouTube Data API Key', help: 'Adds video titles to transcripts (transcripts work without a key).', link: 'https://console.cloud.google.com/apis/credentials' },
  ];

  return (
    <section className="space-y-4 pt-2 mt-2 border-t border-[var(--color-border,#E8E4DC)]">
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-ink,#1F1F1C)]">Integrations</h3>
        <p className="text-xs text-[var(--color-muted,#7A756B)] mt-0.5">
          EduSpark uses these tools autonomously to ground workbooks in facts and research. Add your keys to enable them.
        </p>
      </div>

      <div className="space-y-4">
        {KEY_FIELDS.map(f => (
          <div key={f.k as string}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[var(--color-ink,#1F1F1C)]">
                {f.label}
              </label>
              {f.link && (
                <a
                  href={f.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-accent,#CC785C)] hover:underline"
                >
                  Get Key
                </a>
              )}
            </div>
            <div className="relative mt-1.5">
              <input
                type={showKey[f.k as string] ? 'text' : 'password'}
                value={(keys[f.k] as string) || ''}
                onChange={e => updateKey(f.k, e.target.value)}
                placeholder="Paste key…"
                className="w-full px-4 py-2.5 pr-12 rounded-xl border border-[var(--color-border,#E8E4DC)] bg-[var(--color-bg,#FAF9F6)] text-sm text-[var(--color-ink,#1F1F1C)] focus:outline-none focus:border-[var(--color-accent,#CC785C)] focus:ring-2 focus:ring-[var(--color-accent,#CC785C)]/10"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowKey(s => ({ ...s, [f.k as string]: !s[f.k as string] }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-[var(--color-muted,#7A756B)] hover:text-[var(--color-ink,#1F1F1C)]"
                aria-label="Toggle visibility"
              >
                {showKey[f.k as string] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[11px] text-[var(--color-muted,#7A756B)] mt-1.5 leading-relaxed">{f.help}</p>
          </div>
        ))}
      </div>

      <div className="p-3.5 rounded-2xl bg-[var(--color-sidebar,#F5F2ED)] border border-[var(--color-border,#E8E4DC)]">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted,#7A756B)] mb-2">Autonomous Capability</h4>
        <div className="flex flex-wrap gap-1.5">
          {ALL_TOOL_IDS.map(id => {
            const def = TOOL_REGISTRY[id];
            const hasKey = !def.requiresKey || !!keys[def.requiresKey as keyof ToolKeys];
            return (
              <span 
                key={id} 
                className={`px-2 py-1 rounded-lg text-[10px] font-medium border ${
                  hasKey 
                    ? 'bg-white border-[var(--color-accent)]/20 text-[var(--color-ink)]' 
                    : 'bg-white/50 border-dashed border-[var(--color-border)] text-[var(--color-muted)]'
                }`}
              >
                {def.name}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
