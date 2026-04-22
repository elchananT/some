/**
 * Tool registry — single source of truth for the 8 in-app AI tools.
 * Providers (Gemini/Anthropic/OpenAI) translate these definitions into their
 * native tool-use schemas via `lib/tools/adapters.ts`.
 */
import type { ToolDefinition, ToolId, ToolKeys, ToolResult } from './types';
import { readEnabledTools, readToolKeys } from './keys';
import {
  fetchUrl,
  imageSearch,
  renderDiagram,
  renderMath,
  webSearch,
  wikiGet,
  wikiSearch,
  wolframQuery,
  ytTranscript,
} from './executors';

export const TOOL_REGISTRY: Record<ToolId, ToolDefinition> = {
  web_search: {
    id: 'web_search',
    name: 'web_search',
    description:
      'Search the live web via Tavily. Use for current events, fresh statistics, or when grounding content in cited sources.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        max_results: { type: 'number', description: 'Max results (1-10). Default 5.' },
      },
      required: ['query'],
    },
    requiresKey: 'tavily',
    defaultEnabled: false,
    execute: webSearch,
  },
  fetch_url: {
    id: 'fetch_url',
    name: 'fetch_url',
    description:
      'Fetch a public web page and return its readable text. Use when the user pastes a URL or when you need the full content of a source.',
    parameters: {
      type: 'object',
      properties: { url: { type: 'string', description: 'Absolute URL to fetch' } },
      required: ['url'],
    },
    defaultEnabled: true,
    execute: fetchUrl,
  },
  wiki_search: {
    id: 'wiki_search',
    name: 'wiki_search',
    description: 'Search English Wikipedia titles and descriptions.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Search query' } },
      required: ['query'],
    },
    defaultEnabled: true,
    execute: wikiSearch,
  },
  wiki_get: {
    id: 'wiki_get',
    name: 'wiki_get',
    description: 'Fetch the Wikipedia summary for an exact article title.',
    parameters: {
      type: 'object',
      properties: { title: { type: 'string', description: 'Exact Wikipedia page title' } },
      required: ['title'],
    },
    defaultEnabled: true,
    execute: wikiGet,
  },
  wolfram_query: {
    id: 'wolfram_query',
    name: 'wolfram_query',
    description: 'Ask Wolfram Alpha a math/science question and get a short answer.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Natural-language math/science query' } },
      required: ['query'],
    },
    requiresKey: 'wolfram',
    defaultEnabled: false,
    execute: wolframQuery,
  },
  render_math: {
    id: 'render_math',
    name: 'render_math',
    description:
      'Render LaTeX math to print-safe HTML (KaTeX). Always use this instead of emitting raw LaTeX so the PDF prints correctly.',
    parameters: {
      type: 'object',
      properties: {
        latex: { type: 'string', description: 'LaTeX source, without $ delimiters' },
        display: { type: 'boolean', description: 'Display mode (block) vs inline' },
      },
      required: ['latex'],
    },
    defaultEnabled: true,
    execute: renderMath,
  },
  render_diagram: {
    id: 'render_diagram',
    name: 'render_diagram',
    description:
      'Render a Mermaid diagram (flowchart, sequence, tree, mindmap) to inline SVG suitable for embedding in a workbook page.',
    parameters: {
      type: 'object',
      properties: { code: { type: 'string', description: 'Mermaid source' } },
      required: ['code'],
    },
    defaultEnabled: true,
    execute: renderDiagram,
  },
  image_search: {
    id: 'image_search',
    name: 'image_search',
    description: 'Search Unsplash for royalty-free illustrations and photos.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        per_page: { type: 'number', description: 'Results per page (1-10). Default 5.' },
      },
      required: ['query'],
    },
    requiresKey: 'unsplash',
    defaultEnabled: false,
    execute: imageSearch,
  },
  yt_transcript: {
    id: 'yt_transcript',
    name: 'yt_transcript',
    description: 'Fetch the transcript of a YouTube video by URL or ID.',
    parameters: {
      type: 'object',
      properties: { url: { type: 'string', description: 'YouTube URL or 11-char video ID' } },
      required: ['url'],
    },
    defaultEnabled: true,
    execute: ytTranscript,
  },
};

export const ALL_TOOL_IDS: ToolId[] = Object.keys(TOOL_REGISTRY) as ToolId[];

/** Returns the tool IDs that are currently active: they have any required key present. 
 * We no longer require an explicit 'enable' toggle per tool to keep the experience 
 * autonomous and 'behind the scenes' as requested. */
export function getActiveToolIds(): ToolId[] {
  const keys = readToolKeys();
  return ALL_TOOL_IDS.filter(id => {
    const def = TOOL_REGISTRY[id];
    if (def.requiresKey && !keys[def.requiresKey as keyof ToolKeys]) return false;
    return true;
  });
}

export function getActiveToolDefinitions(): ToolDefinition[] {
  return getActiveToolIds().map(id => TOOL_REGISTRY[id]);
}

/** Dispatch a tool call by name. Unknown names return an error result. */
export async function runTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  const def = (Object.values(TOOL_REGISTRY) as ToolDefinition[]).find(t => t.name === name);
  if (!def) return { ok: false, content: '', error: `unknown tool: ${name}` };
  try {
    return await def.execute(args ?? {});
  } catch (e) {
    return { ok: false, content: '', error: (e as Error).message };
  }
}
