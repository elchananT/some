/**
 * OpenAI provider: streaming chat completions with tool-calling.
 * Uses the official `openai` SDK (dynamic import so bundle stays lean when
 * the user doesn't pick OpenAI). Never sends keys to an EduSpark server —
 * requests go directly from the browser to `api.openai.com`.
 */
import type { BuildWorkbookArgs, ChatMessage, StylePrefs, Workbook } from '@/lib/types';
import { buildContentPagePrompt } from '@/lib/authoring';
import { AIProvider, ChatStreamChunk, PingResult } from './types';
import { getKey, getModel, getBaseURL } from '@/lib/ai/keys';
import { classifyError } from '@/lib/ai/errors';
import { OPENAI_TOOLS, SYSTEM_PROMPT } from './schemas';

function apiKey(): string {
  return getKey('openai') || '';
}

async function loadSdk(): Promise<typeof import('openai') | null> {
  try {
    return await import('openai');
  } catch {
    return null;
  }
}

function makeClient(mod: typeof import('openai')) {
  const Ctor = mod.default;
  return new Ctor({
    apiKey: apiKey(),
    baseURL: getBaseURL('openai'),
    dangerouslyAllowBrowser: true,
  });
}

async function* chatStream(
  history: ChatMessage[],
  prompt: string
): AsyncGenerator<ChatStreamChunk, void, unknown> {
  if (!apiKey()) {
    yield { type: 'error', kind: 'auth', text: 'OpenAI API key missing. Add it in Settings → OpenAI.' };
    return;
  }
  const mod = await loadSdk();
  if (!mod) {
    yield { type: 'error', kind: 'unknown', text: 'OpenAI SDK not installed. Run `npm i openai`.' };
    return;
  }

  try {
    const client = makeClient(mod);
    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...history.map(m => ({
        role: (m.role === 'model' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: m.text,
      })),
      { role: 'user' as const, content: prompt },
    ];

    yield { type: 'status', message: 'Thinking…' };

    const stream = await client.chat.completions.create({
      model: getModel('openai') || 'gpt-4o-mini',
      messages,
      stream: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: OPENAI_TOOLS as any,
      tool_choice: 'auto',
    });

    // Accumulate partial tool calls across deltas (OpenAI streams arguments char-by-char).
    const toolBuffers: Record<number, { name?: string; args: string }> = {};
    const announced = new Set<string>();
    let aggregatedText = '';
    let sawStyleTrigger = false;

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        aggregatedText += delta.content;
        if (!sawStyleTrigger && /choose a style|design system options/i.test(aggregatedText)) {
          sawStyleTrigger = true;
          yield { type: 'trigger_style_selection' };
        }
        yield { type: 'text', text: delta.content, delta: true };
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = typeof tc.index === 'number' ? tc.index : 0;
          if (!toolBuffers[idx]) toolBuffers[idx] = { args: '' };
          if (tc.function?.name) {
            toolBuffers[idx].name = tc.function.name;
            if (!announced.has(tc.function.name)) {
              announced.add(tc.function.name);
              yield { type: 'tool_breadcrumb', label: `Calling ${tc.function.name}` };
            }
          }
          if (tc.function?.arguments) {
            toolBuffers[idx].args += tc.function.arguments;
          }
        }
      }
    }

    // After stream ends: dispatch the last complete tool call (if any).
    const completed = Object.values(toolBuffers).filter(t => t.name && t.args);
    if (completed.length > 0) {
      const last = completed[completed.length - 1];
      try {
        const args = JSON.parse(last.args);
        if (last.name === 'propose_roadmap') {
          yield { type: 'roadmap', roadmap: args };
          return;
        }
        if (last.name === 'build_workbook') {
          yield { type: 'function_call', args: args as BuildWorkbookArgs };
          return;
        }
      } catch (e) {
        yield {
          type: 'error',
          kind: 'unknown',
          text: 'OpenAI returned a malformed tool-call payload.',
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

async function generateContentPage(
  title: string,
  objective: string,
  type: string,
  context: string,
  stylePrefs?: StylePrefs
): Promise<string> {
  const mod = await loadSdk();
  if (!mod || !apiKey()) return `<div><h2>${title}</h2><p>${objective}</p></div>`;
  try {
    const client = makeClient(mod);
    const res = await client.chat.completions.create({
      model: getModel('openai') || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You output clean HTML only, wrapped in a single <div>. No markdown fences.' },
        {
          role: 'user',
          content: buildContentPagePrompt({ title, objective, type, context, stylePrefs }),
        },
      ],
    });
    return res.choices[0]?.message?.content || `<div><h2>${title}</h2></div>`;
  } catch {
    return `<div><h2>${title}</h2><p>${objective}</p></div>`;
  }
}

async function verifyWorkbook(workbook: Workbook): Promise<string> {
  const mod = await loadSdk();
  if (!mod || !apiKey()) return 'Verification unavailable (no OpenAI key).';
  try {
    const client = makeClient(mod);
    const res = await client.chat.completions.create({
      model: getModel('openai') || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a pedagogy reviewer. Score /10 and give 3 suggestions.' },
        { role: 'user', content: `Review for level ${workbook.level}:\n${JSON.stringify(workbook).slice(0, 6000)}` },
      ],
    });
    return res.choices[0]?.message?.content || 'Verification could not be generated.';
  } catch {
    return 'Verification failed.';
  }
}

async function generateChatTitle(messages: ChatMessage[]): Promise<string> {
  if (!messages.length) return 'New Conversation';
  const mod = await loadSdk();
  if (!mod || !apiKey()) return 'Untitled';
  try {
    const client = makeClient(mod);
    const res = await client.chat.completions.create({
      model: getModel('openai') || 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `Generate a short (max 5 words) title. Output only the title.\n${messages
            .map(m => `${m.role}: ${m.text}`)
            .join('\n')}`,
        },
      ],
    });
    return res.choices[0]?.message?.content?.replace(/"/g, '').trim() || 'Untitled';
  } catch {
    return 'Untitled';
  }
}

async function ping(): Promise<PingResult> {
  const start = Date.now();
  if (!apiKey()) return { ok: false, latencyMs: 0, message: 'No API key set' };
  const mod = await loadSdk();
  if (!mod) return { ok: false, latencyMs: 0, message: 'openai SDK not installed' };
  try {
    const client = makeClient(mod);
    const list = await client.models.list();
    return {
      ok: true,
      latencyMs: Date.now() - start,
      models: list.data.map((m: { id: string }) => m.id).slice(0, 20),
      message: 'Connected',
    };
  } catch (e: unknown) {
    const c = classifyError(e);
    return { ok: false, latencyMs: Date.now() - start, message: c.userMessage };
  }
}

async function summarize(messages: ChatMessage[]): Promise<string> {
  const mod = await loadSdk();
  if (!mod || !apiKey()) return '';
  try {
    const client = makeClient(mod);
    const res = await client.chat.completions.create({
      model: getModel('openai') || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Summarize the conversation as strict JSON: {"summary": string, "decisions": string[], "openQuestions": string[]}.',
        },
        {
          role: 'user',
          content: messages.map(m => `${m.role}: ${m.text}`).join('\n').slice(0, 8000),
        },
      ],
    });
    return res.choices[0]?.message?.content || '';
  } catch {
    return '';
  }
}

export const openaiProvider: AIProvider = {
  id: 'openai',
  chatStream,
  generateContentPage,
  generateSVGIllustration: async () =>
    '<svg viewBox="0 0 500 500"><rect width="500" height="500" fill="#FAF9F6"/></svg>',
  verifyWorkbook,
  generateChatTitle,
  ping,
  summarize,
};
