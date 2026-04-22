/**
 * Anthropic (Claude) provider: streaming Messages API with tool-use.
 *
 * Uses the official `@anthropic-ai/sdk` via dynamic import so the bundle stays
 * lean when the user doesn't select Claude. Keys are BYOK — requests go
 * directly from the browser to api.anthropic.com with
 * `dangerouslyAllowBrowser: true`, matching the OpenAI provider.
 *
 * The system prompt is cached (`cache_control: { type: 'ephemeral' }`) so
 * repeated turns in the same conversation hit Anthropic's prompt cache.
 *
 * Streamed output is normalized to the same `ChatStreamChunk` shape yielded by
 * `geminiProvider.chatStream`, so `ai_stream.ts` and the rest of the pipeline
 * stay untouched.
 */
import type { BuildWorkbookArgs, ChatMessage, StylePrefs, Workbook } from '@/lib/types';
import { buildContentPagePrompt } from '@/lib/authoring';
import { AIProvider, ChatStreamChunk, PingResult } from './types';
import { getKey, getModel, getRotatingKey } from '@/lib/ai/keys';
import { classifyError, withBackoff } from '@/lib/ai/errors';
import { ANTHROPIC_TOOLS, SYSTEM_PROMPT } from './schemas';

type AnthropicMod = typeof import('@anthropic-ai/sdk');

function apiKey(attempt = 0): string {
  return getRotatingKey('anthropic', attempt) || '';
}

async function loadSdk(): Promise<AnthropicMod | null> {
  try {
    return await import('@anthropic-ai/sdk');
  } catch {
    return null;
  }
}

function makeClient(mod: AnthropicMod, attempt = 0) {
  const Ctor = mod.default;
  return new Ctor({
    apiKey: apiKey(attempt),
    dangerouslyAllowBrowser: true,
  });
}

function mapMessages(history: ChatMessage[], prompt: string) {
  const msgs = history.map((m) => ({
    role: (m.role === 'model' ? 'assistant' : 'user') as 'assistant' | 'user',
    content: m.text,
  }));
  msgs.push({ role: 'user', content: prompt });
  return msgs;
}

async function* chatStream(
  history: ChatMessage[],
  prompt: string
): AsyncGenerator<ChatStreamChunk, void, unknown> {
  if (!apiKey()) {
    yield {
      type: 'error',
      kind: 'auth',
      text: 'Anthropic API key missing. Add it in Settings → Claude.',
    };
    return;
  }
  const mod = await loadSdk();
  if (!mod) {
    yield {
      type: 'error',
      kind: 'unknown',
      text: 'Anthropic SDK not installed. Run `npm i @anthropic-ai/sdk`.',
    };
    return;
  }

  try {
    yield { type: 'status', message: 'Thinking…' };

    const stream = await withBackoff((attempt) => {
      const client = makeClient(mod, attempt);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (client.messages as any).stream({
        model: getModel('anthropic') || 'claude-3-5-sonnet-latest',
        max_tokens: 4096,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tools: ANTHROPIC_TOOLS as any,
        messages: mapMessages(history, prompt),
      });
    });

    let aggregatedText = '';
    let sawStyleTrigger = false;
    const announcedTools = new Set<string>();

    // Track in-flight tool_use blocks by index so we can reassemble
    // partial_json deltas into a full JSON string.
    const toolBlocks: Record<number, { name: string; json: string }> = {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const event of stream as AsyncIterable<any>) {
      if (!event || typeof event !== 'object') continue;

      if (event.type === 'content_block_start') {
        const cb = event.content_block;
        if (cb?.type === 'tool_use') {
          toolBlocks[event.index] = { name: cb.name, json: '' };
          if (!announcedTools.has(cb.name)) {
            announcedTools.add(cb.name);
            yield { type: 'tool_breadcrumb', label: `Calling ${cb.name}` };
          }
        }
        continue;
      }

      if (event.type === 'content_block_delta') {
        const d = event.delta;
        if (!d) continue;
        if (d.type === 'text_delta' && typeof d.text === 'string') {
          aggregatedText += d.text;
          if (
            !sawStyleTrigger &&
            /choose a style|design system options/i.test(aggregatedText)
          ) {
            sawStyleTrigger = true;
            yield { type: 'trigger_style_selection' };
          }
          yield { type: 'text', text: d.text, delta: true };
        } else if (d.type === 'input_json_delta' && typeof d.partial_json === 'string') {
          const buf = toolBlocks[event.index];
          if (buf) buf.json += d.partial_json;
        }
        continue;
      }
    }

    // Emit final tool call (last one wins, matching openai.ts semantics).
    const completed = Object.values(toolBlocks).filter((t) => t.name && t.json);
    if (completed.length > 0) {
      const last = completed[completed.length - 1];
      try {
        const args = JSON.parse(last.json);
        if (last.name === 'propose_roadmap') {
          yield { type: 'roadmap', roadmap: args };
          return;
        }
        if (last.name === 'build_workbook') {
          yield { type: 'function_call', args: args as BuildWorkbookArgs };
          return;
        }
      } catch {
        yield {
          type: 'error',
          kind: 'unknown',
          text: 'Claude returned a malformed tool-call payload.',
        };
        return;
      }
    }

    if (!aggregatedText.trim()) {
      yield { type: 'text', text: "I'm having trouble analyzing that request." };
    }
  } catch (e: unknown) {
    const c = classifyError(e);
    yield { type: 'error', kind: c.kind, text: c.userMessage };
  }
}

async function simpleText(prompt: string, system?: string): Promise<string> {
  const mod = await loadSdk();
  if (!mod || !apiKey()) return '';
  try {
    const res = await withBackoff((attempt) => {
      const client = makeClient(mod, attempt);
      return client.messages.create({
        model: getModel('anthropic') || 'claude-3-5-sonnet-latest',
        max_tokens: 1024,
        system: system ?? 'You are a helpful assistant.',
        messages: [{ role: 'user', content: prompt }],
      });
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const block = (res.content as any[]).find((b) => b.type === 'text');
    return (block?.text as string) || '';
  } catch {
    return '';
  }
}

async function generateContentPage(
  title: string,
  objective: string,
  type: string,
  context: string,
  stylePrefs?: StylePrefs
): Promise<string> {
  const text = await simpleText(
    buildContentPagePrompt({ title, objective, type, context, stylePrefs }),
    'You output clean HTML only, wrapped in a single <div>. No markdown fences.'
  );
  return text || `<div><h2>${title}</h2><p>${objective}</p></div>`;
}

async function verifyWorkbook(workbook: Workbook): Promise<string> {
  const text = await simpleText(
    `Review for level ${workbook.level}:\n${JSON.stringify(workbook).slice(0, 6000)}`,
    'You are a pedagogy reviewer. Score /10 and give 3 suggestions.'
  );
  return text || 'Verification unavailable.';
}

async function generateChatTitle(messages: ChatMessage[]): Promise<string> {
  if (!messages.length) return 'New Conversation';
  const text = await simpleText(
    `Generate a short (max 5 words) title. Output only the title.\n${messages
      .map((m) => `${m.role}: ${m.text}`)
      .join('\n')}`
  );
  return text.replace(/"/g, '').trim() || 'Untitled';
}

async function ping(): Promise<PingResult> {
  const start = Date.now();
  if (!apiKey()) return { ok: false, latencyMs: 0, message: 'No API key set' };
  const mod = await loadSdk();
  if (!mod) return { ok: false, latencyMs: 0, message: '@anthropic-ai/sdk not installed' };
  try {
    const client = makeClient(mod);
    await client.messages.create({
      model: getModel('anthropic') || 'claude-3-5-sonnet-latest',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'ping' }],
    });
    return { ok: true, latencyMs: Date.now() - start, message: 'Connected' };
  } catch (e: unknown) {
    const c = classifyError(e);
    return { ok: false, latencyMs: Date.now() - start, message: c.userMessage };
  }
}

async function summarize(messages: ChatMessage[]): Promise<string> {
  return simpleText(
    messages.map((m) => `${m.role}: ${m.text}`).join('\n').slice(0, 8000),
    'Summarize the conversation as strict JSON: {"summary": string, "decisions": string[], "openQuestions": string[]}.'
  );
}

export const anthropicProvider: AIProvider = {
  id: 'anthropic',
  chatStream,
  generateContentPage,
  generateSVGIllustration: async () =>
    '<svg viewBox="0 0 500 500"><rect width="500" height="500" fill="#FAF9F6"/></svg>',
  verifyWorkbook,
  generateChatTitle,
  ping,
  summarize,
};
