'use client';

import React from 'react';
import { getActiveProviderId } from '@/lib/providers';

interface UsageSnapshot {
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
}

interface Props {
  usage: UsageSnapshot | null;
}

/**
 * Subtle bottom-right pill showing the active model and the last call's
 * approximate tokens/latency. Hidden entirely when no call has happened yet,
 * so first-run users don't see an empty chrome element.
 */
export default function ProviderTelemetry({ usage }: Props) {
  if (!usage) return null;
  const providerId = (() => {
    try {
      return getActiveProviderId();
    } catch {
      return 'mock';
    }
  })();
  const tokens =
    (usage.promptTokens ?? 0) + (usage.completionTokens ?? 0) || undefined;
  return (
    <div
      aria-live="polite"
      className="fixed bottom-3 right-3 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-surface,#FFFFFF)]/90 border border-[var(--color-border,#E8E4DC)] shadow-sm backdrop-blur text-[10px] font-mono text-[var(--color-muted,#7A756B)] select-none"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent,#CC785C)]" />
      <span>{providerId}</span>
      {usage.model && <span className="text-[var(--color-ink,#1F1F1C)]">· {usage.model}</span>}
      {tokens !== undefined && <span>· {tokens} tok</span>}
      {usage.latencyMs !== undefined && <span>· {usage.latencyMs}ms</span>}
    </div>
  );
}
