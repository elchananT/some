/**
 * Conversation memory compaction.
 *
 * When the chat history grows past a budget, we keep the first user message
 * (which anchors intent — subject, level, goals) plus the last N turns, and
 * replace the middle turns with a single synthetic "[Context Summary] …"
 * model message produced by the provider's `summarize()` hook. Falls back to
 * a pure heuristic trim if summarization fails or the provider doesn't
 * implement it (e.g. mock provider).
 */
import type { ChatMessage } from '@/lib/types';
import type { AIProvider } from '@/lib/providers/types';

export const CONTEXT_LIMIT = 20; // messages
export const TOKEN_BUDGET = 6000; // rough chars/4 heuristic

/** Very rough token estimate: ~4 chars per token. Good enough for a budget check. */
export function estimateTokens(messages: ChatMessage[]): number {
  let chars = 0;
  for (const m of messages) chars += (m.text || '').length;
  return Math.ceil(chars / 4);
}

export function isOverBudget(messages: ChatMessage[]): boolean {
  return messages.length > CONTEXT_LIMIT || estimateTokens(messages) > TOKEN_BUDGET;
}

export interface CompactOpts {
  keepLastN?: number;
}

/**
 * If the history is over budget, returns a compacted array where the middle
 * messages have been replaced with a single "[Context Summary]" message.
 * Always preserves the first user message verbatim when present.
 */
export async function compactIfNeeded(
  messages: ChatMessage[],
  provider: AIProvider,
  opts: CompactOpts = {}
): Promise<ChatMessage[]> {
  const keepLastN = opts.keepLastN ?? 10;
  if (!isOverBudget(messages)) return messages;

  const firstUser = messages.find(m => m.role === 'user');
  const tail = messages.slice(-keepLastN);
  // Middle = everything except the preserved firstUser and the tail.
  const tailStart = messages.length - keepLastN;
  const middle = messages.filter((m, i) => {
    if (i >= tailStart) return false;
    if (firstUser && m === firstUser) return false;
    return true;
  });

  let summaryText = '';
  if (provider.summarize && middle.length > 0) {
    try {
      summaryText = await provider.summarize(middle);
    } catch {
      summaryText = '';
    }
  }

  if (!summaryText) {
    // Heuristic fallback: terse role-labeled join of the middle.
    summaryText = middle
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text.slice(0, 140)}`)
      .join(' | ')
      .slice(0, 1200);
  }

  const summaryMsg: ChatMessage = {
    role: 'model',
    text: `[Context Summary] ${summaryText}`,
  };

  const out: ChatMessage[] = [];
  if (firstUser) out.push(firstUser);
  out.push(summaryMsg);
  out.push(...tail);
  return out;
}
