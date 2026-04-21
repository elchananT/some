import { describe, it, expect, beforeEach } from 'vitest';
import { readCreds, writeCreds, updateProviderCreds, getKey, getModel, getBaseURL } from '../lib/ai/keys';

describe('keys storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('readCreds returns defaults when nothing saved', () => {
    const creds = readCreds();
    expect(creds.gemini?.model).toBe('gemini-2.5-flash');
    expect(creds.openai?.model).toBe('gpt-4o-mini');
    expect(creds.ollama?.baseURL).toBe('http://localhost:11434');
  });

  it('writeCreds round-trips through readCreds', () => {
    writeCreds({ gemini: { apiKey: 'AIzaTEST', model: 'gemini-2.5-pro' } });
    const r = readCreds();
    expect(r.gemini?.apiKey).toBe('AIzaTEST');
    expect(r.gemini?.model).toBe('gemini-2.5-pro');
  });

  it('getKey returns stored apiKey', () => {
    writeCreds({ gemini: { apiKey: 'GEMINI_K' }, openai: { apiKey: 'sk-TEST' } });
    expect(getKey('gemini')).toBe('GEMINI_K');
    expect(getKey('openai')).toBe('sk-TEST');
    expect(getKey('ollama')).toBeUndefined();
  });

  it('getModel falls back to default when not set', () => {
    expect(getModel('gemini')).toBe('gemini-2.5-flash');
    writeCreds({ gemini: { model: 'gemini-2.5-pro' } });
    expect(getModel('gemini')).toBe('gemini-2.5-pro');
  });

  it('getBaseURL for ollama defaults to localhost', () => {
    expect(getBaseURL('ollama')).toBe('http://localhost:11434');
  });

  it('updateProviderCreds patches without wiping other providers', () => {
    writeCreds({ gemini: { apiKey: 'A' }, openai: { apiKey: 'B' } });
    updateProviderCreds('gemini', { model: 'gemini-2.5-pro' });
    const r = readCreds();
    expect(r.gemini?.apiKey).toBe('A');
    expect(r.gemini?.model).toBe('gemini-2.5-pro');
    expect(r.openai?.apiKey).toBe('B');
  });

  it('handles corrupted localStorage gracefully', () => {
    window.localStorage.setItem('eduspark_ai_keys_v1', 'not-json{');
    const creds = readCreds();
    expect(creds.gemini?.model).toBe('gemini-2.5-flash');
  });
});
