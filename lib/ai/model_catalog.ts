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
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', badge: 'Best' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', badge: 'Fast' },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', badge: 'Stable' },
  ],
  openai: [
    { id: 'gpt-5.4', label: 'GPT-5.4', badge: 'Best' },
    { id: 'gpt-5', label: 'GPT-5', badge: 'Stable' },
    { id: 'gpt-o4-mini', label: 'GPT-o4 mini', badge: 'Fast' },
    { id: 'gpt-4o', label: 'GPT-4o' },
  ],
  anthropic: [
    { id: 'claude-4-6-sonnet-latest', label: 'Claude Sonnet 4.6', badge: 'Best' },
    { id: 'claude-4-6-opus-latest', label: 'Claude Opus 4.6' },
    { id: 'claude-4-5-haiku-latest', label: 'Claude Haiku 4.5', badge: 'Fast' },
    { id: 'claude-3-5-sonnet-latest', label: 'Claude Sonnet 3.5' },
  ],
  ollama: [
    { id: 'gemma4', label: 'Gemma 4', badge: 'Best' },
    { id: 'gemma4:e4b', label: 'Gemma 4 Fast', badge: 'Fast' },
    { id: 'llama4-maverick', label: 'Llama 4 Maverick', badge: '400B' },
    { id: 'llama4-scout', label: 'Llama 4 Scout', badge: '17B' },
    { id: 'deepseek-v3.2', label: 'DeepSeek V3.2' },
    { id: 'qwen3', label: 'Qwen 3' },
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
