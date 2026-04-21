import type { IllustrationResult } from './types';

const STORAGE_KEY = 'eduspark_illust_cache_v1';
const MAX_ENTRIES = 50;

interface CacheEntry {
  key: string;
  value: IllustrationResult;
  touchedAt: number;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/**
 * Deterministic, non-cryptographic 32-bit hash (djb2-xor). Used only as a
 * cache key — we do NOT rely on this for security. Returns hex, zero-padded.
 */
function hashKey(parts: Array<string | undefined>): string {
  const s = parts.map(p => p ?? '').join('|');
  let h = 5381 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function cacheKey(
  provider: string,
  req: { title: string; description: string; style?: string; palette?: string }
): string {
  return hashKey([provider, req.title, req.description, req.style, req.palette]);
}

function readAll(): CacheEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CacheEntry[]) : [];
  } catch {
    return [];
  }
}

function writeAll(entries: CacheEntry[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Quota / privacy-mode — silently ignore; cache is best-effort.
  }
}

export function cacheGet(key: string): IllustrationResult | null {
  const all = readAll();
  const idx = all.findIndex(e => e.key === key);
  if (idx === -1) return null;
  const entry = all[idx];
  // Refresh LRU order.
  all.splice(idx, 1);
  entry.touchedAt = Date.now();
  all.push(entry);
  writeAll(all);
  return entry.value;
}

export function cachePut(key: string, value: IllustrationResult): void {
  const all = readAll().filter(e => e.key !== key);
  all.push({ key, value, touchedAt: Date.now() });
  while (all.length > MAX_ENTRIES) {
    all.shift(); // evict oldest (LRU head)
  }
  writeAll(all);
}

export function cacheClear(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export { MAX_ENTRIES as CACHE_MAX_ENTRIES };
