import { GoogleGenAI, Type, GenerateContentConfig } from '@google/genai';
import { BuildWorkbookArgs, ChatMessage, Workbook } from '@/lib/types';
import { WORKBOOK_STYLES } from '@/lib/themes';
import { AIProvider, ChatStreamChunk, PingResult } from './types';
import { getKey, getModel } from '@/lib/ai/keys';
import { classifyError, withBackoff } from '@/lib/ai/errors';

const DEFAULT_MODEL = 'gemini-2.5-flash';

function apiKey(): string {
  return getKey('gemini') || '';
}

function makeClient() {
  return new GoogleGenAI({ apiKey: apiKey() });
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

  try {
    yield { type: 'status', message: 'Thinking…' };

    const stream = await withBackoff(() =>
      makeClient().models.generateContentStream({
        model: chatModel(),
        contents: formatted,
        config,
      })
    );

    let aggregatedText = '';
    const collectedFunctionCalls: Array<{ name?: string; args?: unknown }> = [];
    let sawStyleTrigger = false;
    let sawToolBreadcrumbFor = new Set<string>();

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

    if (collectedFunctionCalls.length > 0) {
      const call = collectedFunctionCalls[collectedFunctionCalls.length - 1];
      const rawArgs = call.args;
      const args =
        typeof rawArgs === 'string' ? JSON.parse(rawArgs) : (rawArgs as Record<string, unknown>);
      if (call.name === 'propose_roadmap') {
        yield { type: 'roadmap', roadmap: args as never };
        return;
      }
      if (call.name === 'build_workbook') {
        yield { type: 'function_call', args: args as BuildWorkbookArgs };
        return;
      }
    }

    if (!aggregatedText.trim() && collectedFunctionCalls.length === 0) {
      yield { type: 'text', text: "I'm having trouble analyzing that request." };
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
  context: string
): Promise<string> {
  assertKey();
  const prompt = `Create a ${type} page titled "${title}". Objective: ${objective}. Context: ${context}. Return clean HTML inside a <div>.`;
  const res = await withBackoff(() =>
    makeClient().models.generateContent({ model: utilModel(), contents: prompt })
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
  const res = await withBackoff(() =>
    makeClient().models.generateContent({ model: utilModel(), contents: prompt })
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
  const res = await withBackoff(() =>
    makeClient().models.generateContent({ model: utilModel(), contents: prompt })
  );
  return res.text || 'Verification report could not be generated.';
}

async function generateChatTitle(messages: ChatMessage[]): Promise<string> {
  if (!messages.length) return 'New Conversation';
  try {
    assertKey();
    const res = await makeClient().models.generateContent({
      model: utilModel(),
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Generate a short (max 5 words) title for this conversation. Output only the title.\n${messages
                .map(m => `${m.role}: ${m.text}`)
                .join('\n')}`,
            },
          ],
        },
      ],
    });
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
