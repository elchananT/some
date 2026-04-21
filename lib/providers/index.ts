import { AIProvider, ProviderId } from './types';
import { mockProvider } from './mock';
import { geminiProvider } from './gemini';
import { openaiProvider } from './openai';
import { ollamaProvider } from './ollama';
import { anthropicProvider } from './anthropic';

export const PROVIDER_STORAGE_KEY = 'eduspark_ai_provider';

const providers: Record<ProviderId, AIProvider> = {
  mock: mockProvider,
  gemini: geminiProvider,
  openai: openaiProvider,
  ollama: ollamaProvider,
  anthropic: anthropicProvider,
};

export const AVAILABLE_PROVIDERS: { id: ProviderId; label: string; hint: string }[] = [
  { id: 'mock', label: 'Mock', hint: 'No API needed — instant, great for demos.' },
  { id: 'gemini', label: 'Gemini', hint: 'Recommended · Free. Paste key in Settings or set NEXT_PUBLIC_GEMINI_API_KEY.' },
  { id: 'anthropic', label: 'Claude', hint: 'BYOK — paste your Anthropic key (Claude Pro users).' },
  { id: 'openai', label: 'OpenAI', hint: 'Paste key in Settings or set NEXT_PUBLIC_OPENAI_API_KEY.' },
  { id: 'ollama', label: 'Ollama', hint: 'Requires a local Ollama server on :11434.' },
];

function envDefault(): ProviderId {
  const raw =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_AI_PROVIDER) || 'mock';
  return (['mock', 'gemini', 'openai', 'ollama', 'anthropic'] as const).includes(raw as ProviderId)
    ? (raw as ProviderId)
    : 'mock';
}

export function getActiveProviderId(): ProviderId {
  if (typeof window !== 'undefined') {
    const saved = window.localStorage.getItem(PROVIDER_STORAGE_KEY) as ProviderId | null;
    if (saved && providers[saved]) return saved;
  }
  return envDefault();
}

export function setActiveProviderId(id: ProviderId) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(PROVIDER_STORAGE_KEY, id);
  }
}

export function getProvider(): AIProvider {
  return providers[getActiveProviderId()];
}

export type { AIProvider, ProviderId } from './types';
