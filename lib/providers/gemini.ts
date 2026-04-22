import { GoogleGenAI, Type, GenerateContentConfig } from '@google/genai';
import { BuildWorkbookArgs, ChatMessage, StylePrefs, Workbook } from '@/lib/types';
import { buildContentPagePrompt } from '@/lib/authoring';
import { WORKBOOK_STYLES } from '@/lib/themes';
import { AIProvider, ChatStreamChunk, PingResult } from './types';
import { getKey, getModel, getRotatingKey } from '@/lib/ai/keys';
import { classifyError, withBackoff } from '@/lib/ai/errors';
import { geminiToolDeclarations } from '@/lib/tools/adapters';
import { runTool } from '@/lib/tools/registry';

const DEFAULT_MODEL = 'gemini-1.5-flash';

function apiKey(attempt = 0): string {
  return getRotatingKey('gemini', attempt) || '';
}

function makeClient(attempt = 0) {
  return new GoogleGenAI({ apiKey: apiKey(attempt) });
}

function chatModel(): string {
  return getModel('gemini') || DEFAULT_MODEL;
}

function utilModel(): string {
  return process.env.NEXT_PUBLIC_GEMINI_UTIL_MODEL || 'gemini-2.5-flash';
}

function assertKey() {
  if (!apiKey()) {
    throw new Error(
      'Gemini API Key is missing. Add it in Settings or set NEXT_PUBLIC_GEMINI_API_KEY in .env.local.'
    );
  }
}

function buildConfig(): GenerateContentConfig {
  return {
    systemInstruction: `You are EduSpark, an expert curriculum designer with a warm, thoughtful voice.
Guidelines:
- If the user's subject or grade level is missing or ambiguous, ask ONE concise clarifying question first.
- When the user seems ready, offer a style selection (include the phrase "choose a style from our design system options below").
- Then call the \`propose_roadmap\` tool and wait for approval.
- After approval, call \`build_workbook\`.
- Speak in a calm, minimal tone — no percentages, no progress bars in prose.
Available styles: ${WORKBOOK_STYLES.map(s => s.name).join(', ')}.`,
    temperature: 0.7,
    tools: [
      {
        functionDeclarations: [
          ...geminiToolDeclarations(),
          {
            name: 'propose_roadmap',
            description: 'Propose a workbook roadmap for user approval.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                estimatedComplexity: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      agentResponsible: {
                        type: Type.STRING,
                        enum: ['Curriculum', 'Researcher', 'Mathematician', 'Linguist'],
                      },
                    },
                    required: ['title', 'description', 'agentResponsible'],
                  },
                },
              },
              required: ['title', 'summary', 'items', 'estimatedComplexity'],
            },
          },
          {
            name: 'build_workbook',
            description: 'Build the final workbook after roadmap approval.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                subject: { type: Type.STRING },
                level: { type: Type.STRING },
                region: { type: Type.STRING },
                illustrationStyle: { type: Type.STRING },
                colorPalette: { type: Type.STRING },
                overallStyle: { type: Type.STRING },
                pages: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      objective: { type: Type.STRING },
                      type: { type: Type.STRING, enum: ['content', 'exercise'] },
                    },
                    required: ['title', 'objective', 'type'],
                  },
                },
              },
              required: ['title', 'subject', 'level', 'region', 'illustrationStyle', 'colorPalette', 'pages'],
            },
          },
        ],
      },
    ],
  };
}

async function* chatStream(
  history: ChatMessage[],
  prompt: string
): AsyncGenerator<ChatStreamChunk, void, unknown> {
  try {
    assertKey();
  } catch (e: unknown) {
    yield { type: 'error', kind: 'auth', text: (e as Error)?.message ?? 'Missing API key' };
    return;
  }

  const formatted: Array<{ role: string; parts: Array<{ text: string }> }> = history.map(h => ({
    role: h.role,
    parts: [{ text: h.text }],
  }));
  formatted.push({ role: 'user', parts: [{ text: prompt }] });

  const config = buildConfig();
  const TERMINAL_TOOLS = new Set(['propose_roadmap', 'build_workbook']);
  const MAX_TOOL_ROUNDS = 3;

  // Mutable Gemini-shaped content history; we append function-call/response turns to it
  // as we execute in-app tools and loop back.
  const contents: Array<{ role: string; parts: Array<Record<string, unknown>> }> = formatted.map(
    m => ({ role: m.role, parts: m.parts.map(p => ({ ...p })) })
  );

  try {
    yield { type: 'status', message: 'Thinking…' };

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const stream = await withBackoff((attempt) =>
        makeClient(attempt).models.generateContentStream({
          model: chatModel(),
          contents,
          config,
        })
      );

      let aggregatedText = '';
      const collectedFunctionCalls: Array<{ name?: string; args?: unknown }> = [];
      let sawStyleTrigger = false;
      const sawToolBreadcrumbFor = new Set<string>();

      for await (const chunk of stream) {
        const fc = (chunk as { functionCalls?: Array<{ name?: string; args?: unknown }> })
          .functionCalls;
        if (fc && fc.length > 0) {
          for (const f of fc) {
            collectedFunctionCalls.push(f);
            if (f.name && !sawToolBreadcrumbFor.has(f.name)) {
              sawToolBreadcrumbFor.add(f.name);
              yield { type: 'tool_breadcrumb', label: `Calling ${f.name}` };
            }
          }
        }

        const delta = (chunk as { text?: string }).text ?? '';
        if (delta) {
          aggregatedText += delta;
          if (!sawStyleTrigger && /choose a style|design system options/i.test(aggregatedText)) {
            sawStyleTrigger = true;
            yield { type: 'trigger_style_selection' };
          }
          yield { type: 'text', text: delta, delta: true };
        }
      }

      // Look for a terminal workbook tool first.
      const terminal = collectedFunctionCalls.find(c => c.name && TERMINAL_TOOLS.has(c.name));
      if (terminal) {
        const rawArgs = terminal.args;
        const args =
          typeof rawArgs === 'string' ? JSON.parse(rawArgs) : (rawArgs as Record<string, unknown>);
        if (terminal.name === 'propose_roadmap') {
          yield { type: 'roadmap', roadmap: args as never };
          return;
        }
        if (terminal.name === 'build_workbook') {
          yield { type: 'function_call', args: args as BuildWorkbookArgs };
          return;
        }
      }

      // In-app tool calls? Execute them, append responses, loop.
      const inAppCalls = collectedFunctionCalls.filter(c => c.name && !TERMINAL_TOOLS.has(c.name));
      if (inAppCalls.length > 0) {
        // Append the model turn (function calls) to history.
        contents.push({
          role: 'model',
          parts: inAppCalls.map(c => ({
            functionCall: {
              name: c.name,
              args:
                typeof c.args === 'string'
                  ? JSON.parse(c.args as string)
                  : ((c.args as Record<string, unknown>) ?? {}),
            },
          })),
        });
        // Execute and append the function responses.
        const responseParts: Array<Record<string, unknown>> = [];
        for (const c of inAppCalls) {
          const args =
            typeof c.args === 'string'
              ? JSON.parse(c.args as string)
              : ((c.args as Record<string, unknown>) ?? {});
          const result = await runTool(c.name as string, args);
          responseParts.push({
            functionResponse: {
              name: c.name,
              response: result.ok
                ? { content: result.content }
                : { error: result.error ?? 'tool failed' },
            },
          });
        }
        contents.push({ role: 'user', parts: responseParts });
        continue; // next round
      }

      if (!aggregatedText.trim() && collectedFunctionCalls.length === 0) {
        yield { type: 'text', text: "I'm having trouble analyzing that request." };
      }
      return; // no more tool calls — we're done.
    }
  } catch (e: unknown) {
    const c = classifyError(e);
    console.error('Gemini chatStream error:', e);
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
  assertKey();
  const prompt = buildContentPagePrompt({ title, objective, type, context, stylePrefs });
  const res = await withBackoff((attempt) =>
    makeClient(attempt).models.generateContent({ model: utilModel(), contents: prompt })
  );
  return res.text || 'Content generation failed.';
}

async function generateSVGIllustration(
  title: string,
  description: string,
  style = 'minimalist',
  palette = 'black and white'
): Promise<string> {
  assertKey();
  const prompt = `Create a 500x500 viewBox SVG for "${title}" (${description}). Style: ${style}. Palette: ${palette}. Return ONLY raw <svg>...</svg>.`;
  const res = await withBackoff((attempt) =>
    makeClient(attempt).models.generateContent({ model: utilModel(), contents: prompt })
  );
  let code = res.text || '';
  if (code.includes('```svg')) code = code.split('```svg')[1].split('```')[0].trim();
  else if (code.includes('```xml')) code = code.split('```xml')[1].split('```')[0].trim();
  else if (code.includes('```html')) code = code.split('```html')[1].split('```')[0].trim();
  return code;
}

async function verifyWorkbook(workbook: Workbook): Promise<string> {
  assertKey();
  const prompt = `Evaluate this workbook for level ${workbook.level}. Give a score /10 and suggestions.\n${JSON.stringify(workbook).slice(0, 6000)}`;
  const res = await withBackoff((attempt) =>
    makeClient(attempt).models.generateContent({ model: utilModel(), contents: prompt })
  );
  return res.text || 'Verification report could not be generated.';
}

async function generateChatTitle(messages: ChatMessage[]): Promise<string> {
  if (!messages.length) return 'New Conversation';
  try {
    assertKey();
    const res = await withBackoff((attempt) =>
      makeClient(attempt).models.generateContent({
        model: utilModel(),
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Generate a short (max 5 words) title for this conversation. Output only the title.\n${messages
                  .map((m) => `${m.role}: ${m.text}`)
                  .join('\n')}`,
              },
            ],
          },
        ],
      })
    );
    return res.text?.replace(/"/g, '').trim() || 'Untitled';
  } catch {
    return 'Untitled';
  }
}

async function ping(): Promise<PingResult> {
  const start = Date.now();
  if (!apiKey()) return { ok: false, latencyMs: 0, message: 'No API key set' };
  try {
    await makeClient().models.generateContent({ model: chatModel(), contents: 'ping' });
    return {
      ok: true,
      latencyMs: Date.now() - start,
      models: ['gemini-2.5-flash', 'gemini-2.5-pro'],
      message: 'Connected',
    };
  } catch (e: unknown) {
    const c = classifyError(e);
    return { ok: false, latencyMs: Date.now() - start, message: c.userMessage };
  }
}

async function summarize(messages: ChatMessage[]): Promise<string> {
  assertKey();
  const transcript = messages.map(m => `${m.role}: ${m.text}`).join('\n').slice(0, 8000);
  const prompt = `Summarize the following conversation for long-term memory. Return strict JSON: {"summary": string, "decisions": string[], "openQuestions": string[]}.\n\n${transcript}`;
  const res = await makeClient().models.generateContent({ model: utilModel(), contents: prompt });
  return res.text || '';
}

export const geminiProvider: AIProvider = {
  id: 'gemini',
  chatStream,
  generateContentPage,
  generateSVGIllustration,
  verifyWorkbook,
  generateChatTitle,
  ping,
  summarize,
};
