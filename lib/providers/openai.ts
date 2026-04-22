/**
 * OpenAI provider: streaming chat completions with tool-calling.
 * Uses the official `openai` SDK (dynamic import so bundle stays lean when
 * the user doesn't pick OpenAI). Never sends keys to an EduSpark server —
 * requests go directly from the browser to `api.openai.com`.
 */
import type { BuildWorkbookArgs, ChatMessage, StylePrefs, Workbook } from '@/lib/types';
import { buildContentPagePrompt } from '@/lib/authoring';
import { AIProvider, ChatStreamChunk, PingResult } from './types';
import { mockProvider } from './mock';
import { getKey, getModel, getBaseURL, getRotatingKey } from '@/lib/ai/keys';
import { classifyError, withBackoff } from '@/lib/ai/errors';
import { OPENAI_TOOLS, SYSTEM_PROMPT } from './schemas';
import { openaiTools } from '@/lib/tools/adapters';
import { runTool } from '@/lib/tools/registry';

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

function apiKey(attempt = 0): string {
  return getRotatingKey('openai', attempt) || '';
}

async function loadSdk(): Promise<typeof import('openai') | null> {
  try {
    return await import('openai');
  } catch {
    return null;
  }
}

function makeClient(mod: typeof import('openai'), attempt = 0) {
  const Ctor = mod.default;
  return new Ctor({
    apiKey: apiKey(attempt),
    baseURL: getBaseURL('openai'),
    dangerouslyAllowBrowser: true,
  });
}

async function toolCallingLoop(
  mod: typeof import('openai'),
  prompt: string,
  system?: string,
  maxRounds = 2
): Promise<string> {
  const messages: any[] = [
    ...(system ? [{ role: 'system' as const, content: system }] : []),
    { role: 'user' as const, content: prompt },
  ];

  try {
    for (let round = 0; round < maxRounds; round++) {
      const res = await withBackoff((attempt) =>
        makeClient(mod, attempt).chat.completions.create({
          model: getModel('openai') || 'gpt-4o-mini',
          messages,
          stream: false,
          tools: openaiTools() as any,
          tool_choice: 'auto',
        })
      );

      const message = res.choices[0]?.message;
      if (!message) break;

      if (message.tool_calls && message.tool_calls.length > 0) {
        messages.push(message);
        for (const tc of message.tool_calls as any[]) {
          const name = tc.function.name;
          const args = JSON.parse(tc.function.arguments);
          const toolResult = await runTool(name, args);
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
          });
        }
        continue;
      }

      return message.content || '';
    }
  } catch (e) {
    console.warn('OpenAI tool loop failed:', e);
  }
  return '';
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
    const TERMINAL_TOOLS = new Set(['propose_roadmap', 'build_workbook']);
    const MAX_TOOL_ROUNDS = 3;
    const messages: any[] = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...history.map(m => ({
        role: (m.role === 'model' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: m.text,
      })),
      { role: 'user' as const, content: prompt },
    ];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      yield { type: 'status', message: round === 0 ? 'Thinking…' : 'Synthesizing…' };
      await sleep(800);

      const stream = await withBackoff((attempt) =>
        makeClient(mod, attempt).chat.completions.create({
          model: getModel('openai') || 'gpt-4o-mini',
          messages,
          stream: true,
          tools: [
            ...OPENAI_TOOLS,
            ...openaiTools(),
          ] as any,
          tool_choice: 'auto',
        })
      );

      // Accumulate partial tool calls across deltas (OpenAI streams arguments char-by-char).
      const toolBuffers: Record<number, { id?: string; name?: string; args: string }> = {};
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
            if (tc.id) toolBuffers[idx].id = tc.id;
            if (tc.function?.name) {
              toolBuffers[idx].name = tc.function.name;
              if (!announced.has(tc.function.name)) {
                announced.add(tc.function.name);
                yield { type: 'tool_breadcrumb', label: `Executing ${tc.function.name}…` };
              }
            }
            if (tc.function?.arguments) {
              toolBuffers[idx].args += tc.function.arguments;
            }
          }
        }
      }

      // After stream ends: check for tool calls
      const completed = Object.values(toolBuffers).filter(t => t.name && t.args);
      if (completed.length > 0) {
        // Add model's turn with tool calls to history
        messages.push({
          role: 'assistant',
          tool_calls: completed.map(t => ({
            id: t.id,
            type: 'function',
            function: { name: t.name, arguments: t.args },
          })),
        });

        for (const t of completed) {
          const name = t.name!;
          const args = JSON.parse(t.args);

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
            role: 'tool',
            tool_call_id: t.id,
            content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
          });
        }
        // Loop back to next round
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
  const mod = await loadSdk();
  if (!mod || !apiKey()) return 'Verification unavailable (no OpenAI key).';
  try {
    const res = await withBackoff((attempt) =>
      makeClient(mod, attempt).chat.completions.create({
        model: getModel('openai') || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a pedagogy reviewer. Score /10 and give 3 suggestions.' },
          {
            role: 'user',
            content: `Review for level ${workbook.level}:\n${JSON.stringify(workbook).slice(0, 6000)}`,
          },
        ],
      })
    );
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
    const res = await withBackoff((attempt) =>
      makeClient(mod, attempt).chat.completions.create({
        model: getModel('openai') || 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: `Generate a short (max 5 words) title. Output only the title.\n${messages
              .map((m) => `${m.role}: ${m.text}`)
              .join('\n')}`,
          },
        ],
      })
    );
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
    const res = await withBackoff((attempt) =>
      makeClient(mod, attempt).chat.completions.create({
        model: getModel('openai') || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Summarize the conversation as strict JSON: {"summary": string, "decisions": string[], "openQuestions": string[]}.',
          },
          {
            role: 'user',
            content: messages
              .map((m) => `${m.role}: ${m.text}`)
              .join('\n')
              .slice(0, 8000),
          },
        ],
      })
    );
    return res.choices[0]?.message?.content || '';
  } catch {
    return '';
  }
}

async function critiquePage(html: string): Promise<any> {
  const mod = await loadSdk();
  if (!mod || !apiKey()) return mockProvider.critiquePage(html);
  try {
    const { CRITIQUE_PROMPT, AUTHORING_RUBRIC } = await import('@/lib/authoring');
    const prompt = CRITIQUE_PROMPT.replace('${AUTHORING_RUBRIC}', AUTHORING_RUBRIC) + "\n\nPAGE HTML:\n" + html;
    const res = await withBackoff((attempt) =>
      makeClient(mod, attempt).chat.completions.create({
        model: getModel('openai') || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      })
    );
    const json = JSON.parse(res.choices[0]?.message?.content || '{}');
    return {
      score: json.score ?? 5,
      reason: json.weaknesses?.[0] ?? json.reason ?? 'Critique complete',
      strengths: json.strengths ?? [],
      weaknesses: json.weaknesses ?? [],
      recommendingRevision: json.recommendingRevision ?? json.score < 8,
      actionableFix: json.actionableFix ?? 'Refine pedagogical depth.'
    };
  } catch {
    return mockProvider.critiquePage(html);
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
  critiquePage,
  ping,
  summarize,
};
