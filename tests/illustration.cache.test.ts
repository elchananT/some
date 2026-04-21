import { describe, it, expect, beforeEach } from 'vitest';
import {
  cacheGet,
  cachePut,
  cacheKey,
  cacheClear,
  CACHE_MAX_ENTRIES,
} from '@/lib/illustration/cache';

describe('illustration cache', () => {
  beforeEach(() => {
    cacheClear();
  });

  it('round-trips a value by key', () => {
    const key = cacheKey('gemini', { title: 'A', description: 'd' });
    expect(cacheGet(key)).toBeNull();
    cachePut(key, { kind: 'svg', svg: '<svg/>' });
    expect(cacheGet(key)).toEqual({ kind: 'svg', svg: '<svg/>' });
  });

  it('changes key when provider, style or palette changes', () => {
    const base = { title: 'T', description: 'D' };
    const k1 = cacheKey('gemini', base);
    const k2 = cacheKey('ollama', base);
    const k3 = cacheKey('gemini', { ...base, style: 'watercolor' });
    const k4 = cacheKey('gemini', { ...base, palette: 'warm' });
    expect(new Set([k1, k2, k3, k4]).size).toBe(4);
  });

  it('is stable for identical inputs', () => {
    const a = cacheKey('gemini', { title: 'T', description: 'D', style: 's', palette: 'p' });
    const b = cacheKey('gemini', { title: 'T', description: 'D', style: 's', palette: 'p' });
    expect(a).toBe(b);
  });

  it('evicts the oldest entry after hitting MAX_ENTRIES', () => {
    for (let i = 0; i < CACHE_MAX_ENTRIES + 5; i++) {
      cachePut(`k${i}`, { kind: 'svg', svg: `s${i}` });
    }
    // First 5 should be evicted.
    for (let i = 0; i < 5; i++) expect(cacheGet(`k${i}`)).toBeNull();
    // Last MAX_ENTRIES must still be present.
    for (let i = 5; i < CACHE_MAX_ENTRIES + 5; i++) {
      expect(cacheGet(`k${i}`)).not.toBeNull();
    }
  });

  it('refreshes LRU order on access', () => {
    // Fill cache to exactly MAX_ENTRIES.
    for (let i = 0; i < CACHE_MAX_ENTRIES; i++) {
      cachePut(`k${i}`, { kind: 'svg', svg: `s${i}` });
    }
    // Touch the oldest so it becomes most-recent.
    expect(cacheGet('k0')).not.toBeNull();
    // Insert one more — k1 (now oldest) should be evicted, not k0.
    cachePut('knew', { kind: 'svg', svg: 'new' });
    expect(cacheGet('k0')).not.toBeNull();
    expect(cacheGet('k1')).toBeNull();
  });
});
