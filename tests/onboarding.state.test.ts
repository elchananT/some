import { describe, it, expect, beforeEach } from 'vitest';
import {
  hasUsableCredential,
  markOnboardingComplete,
  readOnboardingState,
  resetOnboarding,
  writeCreds,
} from '../lib/ai/keys';

// jsdom already provides a working window.localStorage, but ensure it is clean
// between tests to keep state isolated.
beforeEach(() => {
  window.localStorage.clear();
  resetOnboarding();
});

describe('onboarding state', () => {
  it('readOnboardingState defaults to not completed when nothing is set', () => {
    const s = readOnboardingState();
    expect(s.completed).toBe(false);
  });

  it('markOnboardingComplete persists to localStorage', () => {
    markOnboardingComplete('gemini');
    const s = readOnboardingState();
    expect(s.completed).toBe(true);
    expect(s.provider).toBe('gemini');
  });

  it('auto-completes onboarding when a legacy Gemini key already exists', () => {
    writeCreds({ gemini: { apiKey: 'AIza-test-legacy-key' } });
    // No explicit onboarding marker, but hasUsableCredential should be true
    // and readOnboardingState should report completed with gemini as provider.
    expect(hasUsableCredential('gemini')).toBe(true);
    const s = readOnboardingState();
    expect(s.completed).toBe(true);
    expect(s.provider).toBe('gemini');
  });

  it('hasUsableCredential without provider returns true for any configured one', () => {
    writeCreds({ openai: { apiKey: 'sk-test' } });
    expect(hasUsableCredential()).toBe(true);
    expect(hasUsableCredential('openai')).toBe(true);
    expect(hasUsableCredential('gemini')).toBe(false);
  });

  it('hasUsableCredential(ollama) checks baseURL presence', () => {
    // Default baseURL is provided by DEFAULTS in keys.ts, so ollama is always usable-by-URL.
    expect(hasUsableCredential('ollama')).toBe(true);
  });

  it('resetOnboarding clears the completed flag', () => {
    markOnboardingComplete('ollama');
    expect(readOnboardingState().completed).toBe(true);
    resetOnboarding();
    // No creds saved, so state should read as not completed.
    expect(readOnboardingState().completed).toBe(false);
  });
});
