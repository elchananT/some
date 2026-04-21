import { ChatMessage, Workbook } from '@/lib/types';
import { AIProvider, ChatStreamChunk, PingResult } from './types';
import { mockProvider } from './mock';
import { getBaseURL, getModel } from '@/lib/ai/keys';

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
    'llama3.2'
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
  // Non-streaming helper for one-shot tasks (title, verify, summarize, page content).
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

async function* chatStream(
  history: ChatMessage[],
  prompt: string
): AsyncGenerator<ChatStreamChunk, void, unknown> {
  // Reuse the mock orchestrator for flow control (style gallery, roadmap,
  // build trigger), but replace plain text chunks with real token streaming.
  for await (const chunk of mockProvider.chatStream(history, prompt)) {
    if (chunk.type === 'text') {
      yield { type: 'status', message: `Thinking locally with ${modelName()}…` };
      const system =
        'You are EduSpark, a concise educational curriculum designer. ' +
        'Reply in 2-4 short sentences. Do not output code fences.';
      const messages = [
        { role: 'system' as const, content: system },
        ...history.map(m => ({
          role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.text,
        })),
        { role: 'user' as const, content: prompt },
      ];
      let streamed = '';
      try {
        const client = await getClient();
        const stream = (await client.chat({
          model: modelName(),
          messages,
          stream: true,
        })) as unknown as AsyncIterable<{ message?: { content?: string } }>;
        for await (const part of stream) {
          const delta = part.message?.content;
          if (delta) {
            streamed += delta;
            yield { type: 'text', text: delta, delta: true };
          }
        }
      } catch (e) {
        console.warn('Ollama streaming failed, falling back:', e);
      }
      if (!streamed) {
        // Last-resort fallback: one-shot generate + mock text safety net.
        const fallback = (await ollamaGenerate(prompt, system)) || chunk.text;
        yield { type: 'text', text: fallback, delta: true };
      }
    } else {
      yield chunk;
    }
  }
}

async function generateContentPage(
  title: string,
  objective: string,
  type: string,
  context: string
): Promise<string> {
  const sys =
    'You are an educational content author. Output clean HTML only, wrapped in a single <div>.';
  const prompt = `Create a ${type} page titled "${title}".
Objective: ${objective}
Context: ${context}
If this is an exercise page, include 5 numbered questions AND an answer key.`;
  const out = await ollamaGenerate(prompt, sys);
  if (out && out.includes('<')) return out;
  return mockProvider.generateContentPage(title, objective, type, context);
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
