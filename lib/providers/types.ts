import { BuildWorkbookArgs, ChatMessage, Roadmap, StylePrefs, Workbook } from '@/lib/types';
import type { AIErrorKind } from '@/lib/ai/errors';

export type ProviderId = 'mock' | 'gemini' | 'openai' | 'ollama' | 'anthropic';

export type ChatStreamChunk =
  | { type: 'status'; message: string }
  | { type: 'text'; text: string; delta?: boolean }
  | { type: 'tool_breadcrumb'; label: string }
  | { type: 'trigger_style_selection' }
  | { type: 'roadmap'; roadmap: Roadmap }
  | { type: 'function_call'; args: BuildWorkbookArgs }
  | { type: 'error'; text: string; kind?: AIErrorKind }
  | { type: 'usage'; model?: string; promptTokens?: number; completionTokens?: number; latencyMs?: number };

export interface PingResult {
  ok: boolean;
  latencyMs: number;
  models?: string[];
  message?: string;
}

export interface AIProvider {
  id: ProviderId;

  chatStream(
    history: ChatMessage[],
    prompt: string
  ): AsyncGenerator<ChatStreamChunk, void, unknown>;

  generateContentPage(
    title: string,
    objective: string,
    type: string,
    context: string,
    stylePrefs?: StylePrefs
  ): Promise<string>;

  generateSVGIllustration(
    title: string,
    description: string,
    style?: string,
    palette?: string
  ): Promise<string>;

  verifyWorkbook(workbook: Workbook): Promise<string>;

  generateChatTitle(messages: ChatMessage[]): Promise<string>;

  /** Lightweight reachability / auth check. Implementations should be cheap. */
  ping?(): Promise<PingResult>;

  /** Optional: summarize older messages for memory compaction. */
  summarize?(messages: ChatMessage[]): Promise<string>;
}
