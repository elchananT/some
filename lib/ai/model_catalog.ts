/**
 * Canonical list of specific models per provider, surfaced in the composer
 * model-picker chip and in the Settings "Models" section.
 *
 * We keep this list short & opinionated on purpose. Paste-your-own-model via
 * Settings still works — this is only the chip's quick-pick surface.
 */
import type { ProviderId } from '@/lib/providers/types';

export interface ModelOption {
  id: string; // the string we store in creds.model
  label: string; // human-readable
  badge?: string; // optional right-side tag, e.g. "Fast" / "Pro"
}

export const MODEL_CATALOG: Partial<Record<ProviderId, ModelOption[]>> = {
  gemini: [
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', badge: 'Fast · Free' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', badge: 'Best' },
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  ],
  openai: [
    { id: 'gpt-4o-mini', label: 'GPT-4o mini', badge: 'Fast' },
    { id: 'gpt-4o', label: 'GPT-4o', badge: 'Best' },
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
  ],
  anthropic: [
    { id: 'claude-3-5-haiku-latest', label: 'Claude Haiku', badge: 'Fast' },
    { id: 'claude-3-5-sonnet-latest', label: 'Claude Sonnet', badge: 'Best' },
  ],
  ollama: [
    { id: 'llama3.2', label: 'Llama 3.2' },
    { id: 'llama3.1', label: 'Llama 3.1' },
    { id: 'qwen2.5', label: 'Qwen 2.5' },
  ],
  mock: [{ id: 'demo', label: 'Demo' }],
};

export function modelsFor(provider: ProviderId): ModelOption[] {
  return MODEL_CATALOG[provider] ?? [];
}

export function labelForModel(provider: ProviderId, modelId?: string): string {
  if (!modelId) return '';
  const hit = modelsFor(provider).find((m) => m.id === modelId);
  return hit?.label ?? modelId;
}

/** Detect whether a string is predominantly RTL (Hebrew / Arabic). */
export function detectDir(text: string): 'ltr' | 'rtl' {
  if (!text) return 'ltr';
  const rtl = text.match(/[\u0590-\u07FF\uFB1D-\uFEFC]/g)?.length ?? 0;
  const ltr = text.match(/[A-Za-z]/g)?.length ?? 0;
  return rtl > ltr ? 'rtl' : 'ltr';
}
