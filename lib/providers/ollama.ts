import { ChatMessage, StylePrefs, Workbook } from '@/lib/types';
import { AIProvider, ChatStreamChunk, PingResult } from './types';
import { mockProvider } from './mock';
import { getBaseURL, getModel } from '@/lib/ai/keys';
import { getActiveToolDefinitions, runTool } from '@/lib/tools/registry';

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

function baseUrl(): string {
  return (
    getBaseURL('ollama') ||
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_OLLAMA_BASE_URL) ||
    'http://localhost:11434'
  );
}
function modelName(): string {
  return (
    getModel('ollama') ||
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_OLLAMA_MODEL) ||
    'gemma4'
  );
}

/**
 * Lazily instantiate the Ollama SDK client with the user's base URL.
 * Dynamically imported so it isn't bundled server-side or when Ollama is unused.
 */
async function getClient() {
  const { Ollama } = await import('ollama/browser');
  return new Ollama({ host: baseUrl() });
}

async function ollamaGenerate(prompt: string, system?: string): Promise<string> {
  // Non-streaming helper for one-shot tasks (title, verify, summarize).
  try {
    const client = await getClient();
    const res = await client.chat({
      model: modelName(),
      messages: [
        ...(system ? [{ role: 'system' as const, content: system }] : []),
        { role: 'user' as const, content: prompt },
      ],
      stream: false,
    });
    return (res.message?.content || '').trim();
  } catch (e) {
    // Fallback to legacy /api/generate endpoint (helps debug CORS setups).
    console.warn('Ollama SDK call failed, using /api/generate fallback:', e);
    try {
      const res = await fetch(`${baseUrl()}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelName(), prompt, system, stream: false }),
      });
      if (!res.ok) return '';
      const json = await res.json();
      return (json.response || '').trim();
    } catch (e2) {
      console.warn('Ollama unreachable:', e2);
      return '';
    }
  }
}

async function toolCallingLoop(
  prompt: string,
  system?: string,
  maxRounds = 2
): Promise<string> {
  const messages = [
    ...(system ? [{ role: 'system' as const, content: system }] : []),
    { role: 'user' as const, content: prompt },
  ];

  try {
    for (let round = 0; round < maxRounds; round++) {
      const client = await getClient();
      const tools = getActiveToolDefinitions().map(d => ({
        type: 'function' as const,
        function: {
          name: d.name,
          description: d.description,
          parameters: d.parameters,
        },
      }));

      const res = await client.chat({
        model: modelName(),
        messages,
        tools,
        stream: false,
      });

      const message = res.message;
      if (!message) break;

      if (message.tool_calls && message.tool_calls.length > 0) {
        messages.push(message as any);

        for (const call of message.tool_calls) {
          const name = call.function.name;
          const args = call.function.arguments;
          const toolResult = await runTool(name, args);
          messages.push({
            role: 'tool',
            content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
          } as any);
        }
        continue;
      }

      return (message.content || '').trim();
    }
  } catch (e) {
    console.warn('Ollama tool loop failed:', e);
  }
  return ollamaGenerate(prompt, system);
}

async function* chatStream(
  history: ChatMessage[],
  prompt: string
): AsyncGenerator<ChatStreamChunk, void, unknown> {
  const TERMINAL_TOOLS = new Set(['propose_roadmap', 'build_workbook']);
  const MAX_TOOL_ROUNDS = 2;

  const messages = [
    {
      role: 'system' as const,
      content:
        'You are EduSpark, a professional curriculum architect. ' +
        'Keep prose short and deliberate. Use tools when needed for research or diagrams.',
    },
    ...history.map(m => ({
      role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.text,
    })),
    { role: 'user' as const, content: prompt },
  ];

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      yield { type: 'status', message: round === 0 ? 'Thinking…' : 'Synthesizing…' };
      await sleep(800); // Intentional delay to make thoughts "slower" and more deliberate

      const client = await getClient();
      const tools = getActiveToolDefinitions().map(d => ({
        type: 'function' as const,
        function: {
          name: d.name,
          description: d.description,
          parameters: d.parameters,
        },
      }));

      const res = await client.chat({
        model: modelName(),
        messages,
        tools,
        stream: false,
      });

      const message = res.message;
      if (!message) break;

      // Check for tool calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        messages.push(message as any);

        for (const call of message.tool_calls) {
          const name = call.function.name;
          const args = call.function.arguments;

          yield { type: 'tool_breadcrumb', label: `Executing ${name}…` };
          await sleep(600);

          if (TERMINAL_TOOLS.has(name)) {
            if (name === 'propose_roadmap') {
              yield { type: 'roadmap', roadmap: args as any };
              return;
            }
            if (name === 'build_workbook') {
              yield { type: 'function_call', args: args as any };
              return;
            }
          }

          const toolResult = await runTool(name, args);
          messages.push({
            role: 'tool',
            content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
          } as any);
        }
        // Continue to next round to let model react to tool results
        continue;
      }

      // No tool calls, just text
      if (message.content) {
        yield { type: 'text', text: message.content, delta: true };
      }
      break;
    }
  } catch (e) {
    console.warn('Ollama tool loop failed, falling back to basic chat:', e);
    // Legacy fallback logic
    yield { type: 'text', text: 'I encountered an issue with the local model. Let me try to respond simply.', delta: true };
  }
}

async function generateContentPage(
  title: string,
  objective: string,
  type: string,
  context: string,
  stylePrefs?: StylePrefs
): Promise<string> {
  const sys =
    'You are an educational content author. Output clean HTML only, starting with <section class="page">. No preamble, no commentary, no markdown fences. Use tools for research or diagrams if helpful.';
  const { buildContentPagePrompt, cleanHTML } = await import('@/lib/authoring');
  const prompt = buildContentPagePrompt({ title, objective, type, context, stylePrefs });
  const out = await toolCallingLoop(prompt, sys);
  const cleaned = cleanHTML(out);
  if (cleaned && cleaned.includes('<')) return cleaned;
  return mockProvider.generateContentPage(title, objective, type, context, stylePrefs);
}

async function generateSVGIllustration(
  title: string,
  description: string,
  style?: string,
  palette?: string
): Promise<string> {
  // Local text-only models rarely produce valid SVG — use mock for reliability.
  return mockProvider.generateSVGIllustration(title, description, style, palette);
}

async function verifyWorkbook(workbook: Workbook): Promise<string> {
  const sys =
    'You are a pedagogy reviewer. Respond in short Markdown with a score /10 and 3 suggestions.';
  const out = await ollamaGenerate(
    `Review this workbook for level ${workbook.level}:\n${JSON.stringify(workbook).slice(0, 4000)}`,
    sys
  );
  return out || mockProvider.verifyWorkbook(workbook);
}

async function generateChatTitle(messages: ChatMessage[]): Promise<string> {
  if (!messages.length) return 'New Conversation';
  const out = await ollamaGenerate(
    `Generate a short 3-5 word title for this conversation. Output ONLY the title, no quotes.\n${messages
      .map(m => `${m.role}: ${m.text}`)
      .join('\n')}`,
    'You generate terse titles.'
  );
  const cleaned = out.replace(/["\n]/g, '').trim();
  return cleaned || mockProvider.generateChatTitle(messages);
}

async function summarize(messages: ChatMessage[]): Promise<string> {
  const sys =
    'Summarize this EduSpark conversation in 4-6 sentences. ' +
    'Preserve: user goal, chosen style/variant, roadmap decisions, and any open questions.';
  const body = messages.map(m => `${m.role}: ${m.text}`).join('\n').slice(0, 6000);
  const out = await ollamaGenerate(body, sys);
  return out || '';
}

async function ping(): Promise<PingResult> {
  const start = Date.now();
  try {
    const client = await getClient();
    const list = (await client.list()) as { models?: Array<{ name: string }> };
    return {
      ok: true,
      latencyMs: Date.now() - start,
      models: (list.models || []).map(m => m.name),
      message: 'Connected',
    };
  } catch {
    try {
      const res = await fetch(`${baseUrl()}/api/tags`);
      if (!res.ok)
        return { ok: false, latencyMs: Date.now() - start, message: `HTTP ${res.status}` };
      const json = (await res.json()) as { models?: Array<{ name: string }> };
      return {
        ok: true,
        latencyMs: Date.now() - start,
        models: (json.models || []).map(m => m.name),
        message: 'Connected',
      };
    } catch {
      return { ok: false, latencyMs: Date.now() - start, message: `Cannot reach ${baseUrl()}` };
    }
  }
}

export const ollamaProvider: AIProvider = {
  id: 'ollama',
  chatStream,
  generateContentPage,
  generateSVGIllustration,
  verifyWorkbook,
  generateChatTitle,
  ping,
  summarize,
};
