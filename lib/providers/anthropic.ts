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
import { mockProvider } from './mock';
import { getKey, getModel, getRotatingKey } from '@/lib/ai/keys';
import { classifyError, withBackoff } from '@/lib/ai/errors';
import { ANTHROPIC_TOOLS, SYSTEM_PROMPT } from './schemas';
import { anthropicTools } from '@/lib/tools/adapters';
import { runTool } from '@/lib/tools/registry';

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

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

async function toolCallingLoop(
  mod: AnthropicMod,
  prompt: string,
  system?: string,
  maxRounds = 2
): Promise<string> {
  const messages: any[] = [{ role: 'user', content: prompt }];

  try {
    for (let round = 0; round < maxRounds; round++) {
      const res = await withBackoff((attempt) => {
        const client = makeClient(mod, attempt);
        return client.messages.create({
          model: getModel('anthropic') || 'claude-3-5-sonnet-latest',
          max_tokens: 4096,
          system: system ?? 'You are an educational content author.',
          tools: anthropicTools() as any,
          messages,
        });
      });

      const message = res;
      if (!message.content) break;

      const toolCalls = (message.content as any[]).filter(b => b.type === 'tool_use');
      const textBlocks = (message.content as any[]).filter(b => b.type === 'text');

      if (toolCalls.length > 0) {
        messages.push({
          role: 'assistant',
          content: message.content,
        });

        for (const tc of toolCalls) {
          const name = tc.name;
          const args = tc.input;
          const toolResult = await runTool(name, args);
          messages.push({
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: tc.id,
                content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
              },
            ],
          });
        }
        continue;
      }

      return (textBlocks[0]?.text as string) || '';
    }
  } catch (e) {
    console.warn('Anthropic tool loop failed:', e);
  }
  return '';
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
    const TERMINAL_TOOLS = new Set(['propose_roadmap', 'build_workbook']);
    const MAX_TOOL_ROUNDS = 3;
    const messages: any[] = mapMessages(history, prompt);

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      yield { type: 'status', message: round === 0 ? 'Thinking…' : 'Synthesizing…' };
      await sleep(1000);

      const stream = await withBackoff((attempt) => {
        const client = makeClient(mod, attempt);
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
          tools: [
            ...ANTHROPIC_TOOLS,
            ...anthropicTools(),
          ] as any,
          messages,
        });
      });

      let aggregatedText = '';
      let sawStyleTrigger = false;
      const announcedTools = new Set<string>();
      const toolBlocks: Record<number, { id: string; name: string; json: string }> = {};

      for await (const event of stream as AsyncIterable<any>) {
        if (!event || typeof event !== 'object') continue;

        if (event.type === 'content_block_start') {
          const cb = event.content_block;
          if (cb?.type === 'tool_use') {
            toolBlocks[event.index] = { id: cb.id, name: cb.name, json: '' };
            if (!announcedTools.has(cb.name)) {
              announcedTools.add(cb.name);
              yield { type: 'tool_breadcrumb', label: `Executing ${cb.name}…` };
            }
          }
          continue;
        }

        if (event.type === 'content_block_delta') {
          const d = event.delta;
          if (!d) continue;
          if (d.type === 'text_delta' && typeof d.text === 'string') {
            aggregatedText += d.text;
            if (!sawStyleTrigger && /choose a style|design system options/i.test(aggregatedText)) {
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

      // Check for tool calls
      const completed = Object.values(toolBlocks).filter(t => t.name && t.json);
      if (completed.length > 0) {
        // Add model's turn to history
        messages.push({
          role: 'assistant',
          content: completed.map(t => ({
            type: 'tool_use',
            id: t.id,
            name: t.name,
            input: JSON.parse(t.json),
          })),
        });

        for (const t of completed) {
          const name = t.name;
          const args = JSON.parse(t.json);

          if (TERMINAL_TOOLS.has(name)) {
            if (name === 'propose_roadmap') {
              yield { type: 'roadmap', roadmap: args as any };
              return;
            }
            if (name === 'build_workbook') {
              yield { type: 'function_call', args: args as BuildWorkbookArgs };
              return;
            }
          }

          const toolResult = await runTool(name, args);
          messages.push({
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: t.id,
                content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
              },
            ],
          });
        }
        // Loop back
        continue;
      }
      // No tool calls, finish
      break;
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
  const mod = await loadSdk();
  if (!mod || !apiKey()) return mockProvider.generateContentPage(title, objective, type, context, stylePrefs);
  try {
    const { buildContentPagePrompt, cleanHTML } = await import('@/lib/authoring');
    const sys =
      'You are an educational content author. Output clean HTML only, starting with <section class="page">. No preamble, no commentary, no markdown fences. Use tools for research or diagrams if helpful.';
    const prompt = buildContentPagePrompt({ title, objective, type, context, stylePrefs });
    const out = await toolCallingLoop(mod, prompt, sys);
    const cleaned = cleanHTML(out);
    if (cleaned && cleaned.includes('<')) return cleaned;
    return mockProvider.generateContentPage(title, objective, type, context, stylePrefs);
  } catch {
    return mockProvider.generateContentPage(title, objective, type, context, stylePrefs);
  }
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
