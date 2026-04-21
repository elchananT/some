/**
 * BYOK credential storage for EduSpark.
 * Keys live ONLY in localStorage (client-side) with a fallback to NEXT_PUBLIC_* env vars.
 * They are never sent to any EduSpark server.
 */
import type { ProviderId } from '@/lib/providers/types';

const STORAGE_KEY = 'eduspark_ai_keys_v1';

export type GeminiCreds = { apiKey?: string; model?: string };
export type OpenAICreds = { apiKey?: string; model?: string; baseURL?: string };
export type OllamaCreds = { baseURL?: string; model?: string };
export type AnthropicCreds = { apiKey?: string; model?: string };

export interface ConsentFlags {
  /** Explicit opt-in to send illustration prompts to https://pollinations.ai. */
  pollinations?: boolean;
}

export type ProviderCredentials = {
  gemini?: GeminiCreds;
  openai?: OpenAICreds;
  ollama?: OllamaCreds;
  anthropic?: AnthropicCreds;
  consent?: ConsentFlags;
};

const DEFAULTS: ProviderCredentials = {
  gemini: { model: 'gemini-2.5-flash' },
  openai: { model: 'gpt-4o-mini' },
  ollama: { baseURL: 'http://localhost:11434', model: 'llama3.2' },
  anthropic: { model: 'claude-3-5-sonnet-latest' },
  consent: {},
};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readCreds(): ProviderCredentials {
  if (!isBrowser()) return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as ProviderCredentials;
    return {
      gemini: { ...DEFAULTS.gemini, ...(parsed.gemini ?? {}) },
      openai: { ...DEFAULTS.openai, ...(parsed.openai ?? {}) },
      ollama: { ...DEFAULTS.ollama, ...(parsed.ollama ?? {}) },
      anthropic: { ...DEFAULTS.anthropic, ...(parsed.anthropic ?? {}) },
      consent: { ...(DEFAULTS.consent ?? {}), ...(parsed.consent ?? {}) },
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeCreds(next: ProviderCredentials): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / privacy-mode errors
  }
}

export function updateProviderCreds<K extends keyof ProviderCredentials>(
  provider: K,
  patch: Partial<NonNullable<ProviderCredentials[K]>>
): ProviderCredentials {
  const current = readCreds();
  const merged: ProviderCredentials = {
    ...current,
    [provider]: { ...(current[provider] ?? {}), ...patch },
  };
  writeCreds(merged);
  return merged;
}

function envVar(name: string): string | undefined {
  // Next.js inlines NEXT_PUBLIC_* at build time; safe to read directly.
  const v = (process.env as Record<string, string | undefined>)[name];
  return v && v.length > 0 ? v : undefined;
}

export function getKey(provider: ProviderId): string | undefined {
  const creds = readCreds();
  if (provider === 'gemini') {
    return (
      creds.gemini?.apiKey ||
      envVar('NEXT_PUBLIC_GEMINI_API_KEY') ||
      envVar('GEMINI_API_KEY') ||
      envVar('API_KEY')
    );
  }
  if (provider === 'openai') {
    return creds.openai?.apiKey || envVar('NEXT_PUBLIC_OPENAI_API_KEY') || envVar('OPENAI_API_KEY');
  }
  if (provider === 'anthropic') {
    return (
      creds.anthropic?.apiKey ||
      envVar('NEXT_PUBLIC_ANTHROPIC_API_KEY') ||
      envVar('ANTHROPIC_API_KEY')
    );
  }
  return undefined;
}

export function getModel(provider: ProviderId): string | undefined {
  const creds = readCreds();
  if (provider === 'gemini') return creds.gemini?.model || DEFAULTS.gemini!.model;
  if (provider === 'openai') return creds.openai?.model || DEFAULTS.openai!.model;
  if (provider === 'ollama') return creds.ollama?.model || DEFAULTS.ollama!.model;
  if (provider === 'anthropic') return creds.anthropic?.model || DEFAULTS.anthropic!.model;
  return undefined;
}

export function setModel(provider: ProviderId, model: string): void {
  if (provider === 'gemini') updateProviderCreds('gemini', { model });
  else if (provider === 'openai') updateProviderCreds('openai', { model });
  else if (provider === 'ollama') updateProviderCreds('ollama', { model });
  else if (provider === 'anthropic') updateProviderCreds('anthropic', { model });
}

export function getBaseURL(provider: ProviderId): string | undefined {
  const creds = readCreds();
  if (provider === 'openai') return creds.openai?.baseURL;
  if (provider === 'ollama')
    return (
      creds.ollama?.baseURL ||
      envVar('NEXT_PUBLIC_OLLAMA_BASE_URL') ||
      DEFAULTS.ollama!.baseURL
    );
  return undefined;
}

// --------------------------------------------------------------------------
// BYOK onboarding state
// --------------------------------------------------------------------------

const ONBOARDING_KEY = 'eduspark_onboarding_v1';

export type OnboardingProvider = 'gemini' | 'ollama' | 'openai' | 'anthropic' | 'demo';

export interface OnboardingState {
  completed: boolean;
  provider?: OnboardingProvider;
}

/**
 * True when the caller has configured something we can actually generate with.
 * - `provider` omitted: any provider with a usable credential (or Ollama baseURL)
 * - `provider === 'gemini' | 'openai'`: an API key resolves
 * - `provider === 'ollama'`: a baseURL resolves (connectivity is not checked here)
 */
export function hasUsableCredential(provider?: ProviderId): boolean {
  if (provider === 'gemini') return !!getKey('gemini');
  if (provider === 'openai') return !!getKey('openai');
  if (provider === 'anthropic') return !!getKey('anthropic');
  if (provider === 'ollama') return !!getBaseURL('ollama');
  return (
    !!getKey('gemini') ||
    !!getKey('openai') ||
    !!getKey('anthropic') ||
    !!getBaseURL('ollama')
  );
}

export function readOnboardingState(): OnboardingState {
  if (!isBrowser()) return { completed: false };
  try {
    const raw = window.localStorage.getItem(ONBOARDING_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as OnboardingState;
      if (parsed && typeof parsed.completed === 'boolean') return parsed;
    }
  } catch {
    /* ignore */
  }
  // Legacy auto-completion: if a key was saved before onboarding existed,
  // consider the user already onboarded so we don't re-prompt them.
  if (hasUsableCredential('gemini')) return { completed: true, provider: 'gemini' };
  if (hasUsableCredential('openai')) return { completed: true, provider: 'openai' };
  return { completed: false };
}

export function markOnboardingComplete(provider: OnboardingProvider): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(
      ONBOARDING_KEY,
      JSON.stringify({ completed: true, provider } satisfies OnboardingState)
    );
  } catch {
    /* ignore */
  }
}

export function resetOnboarding(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(ONBOARDING_KEY);
  } catch {
    /* ignore */
  }
}
