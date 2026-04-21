/**
 * Tool-specific BYOK storage. Keys live in localStorage only.
 */
import type { ToolId, ToolKeys } from './types';

const STORAGE_KEY = 'eduspark_tool_keys_v1';
const ENABLED_KEY = 'eduspark_tool_enabled_v1';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readToolKeys(): ToolKeys {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ToolKeys) : {};
  } catch {
    return {};
  }
}

export function writeToolKeys(next: ToolKeys): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function updateToolKey<K extends keyof ToolKeys>(k: K, value: string | undefined): void {
  const cur = readToolKeys();
  if (value && value.trim()) cur[k] = value.trim();
  else delete cur[k];
  writeToolKeys(cur);
}

export function readEnabledTools(): Partial<Record<ToolId, boolean>> {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(ENABLED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function writeEnabledTools(next: Partial<Record<ToolId, boolean>>): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(ENABLED_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function setToolEnabled(id: ToolId, enabled: boolean): void {
  const cur = readEnabledTools();
  cur[id] = enabled;
  writeEnabledTools(cur);
}
