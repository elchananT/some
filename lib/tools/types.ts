/**
 * In-app AI tool registry. These are tools the user's chosen LLM (Gemini/Claude/Ollama)
 * can call during roadmap/build to ground the workbook in fresh sources, render math,
 * embed diagrams, etc.
 *
 * BYOK: any tool that needs a third-party API reads its key from localStorage via
 * `lib/tools/keys.ts`. Keys never leave the browser.
 */

export type ToolId =
  | 'web_search'
  | 'fetch_url'
  | 'wiki_search'
  | 'wiki_get'
  | 'wolfram_query'
  | 'render_math'
  | 'render_diagram'
  | 'image_search'
  | 'yt_transcript';

export interface ToolParamSchema {
  type: 'object';
  properties: Record<
    string,
    { type: 'string' | 'number' | 'boolean'; description?: string; enum?: string[] }
  >;
  required?: string[];
}

export interface ToolDefinition {
  id: ToolId;
  name: string; // function name exposed to the LLM
  description: string;
  parameters: ToolParamSchema;
  /** Key in `ToolKeys` required to run this tool; undefined = no key needed. */
  requiresKey?: keyof ToolKeys;
  /** Whether the tool is enabled by default (local / free tools) vs opt-in. */
  defaultEnabled: boolean;
  execute: (args: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolResult {
  ok: boolean;
  /** Compact string the LLM will see. */
  content: string;
  /** Optional structured data, e.g. inline SVG, for downstream rendering. */
  data?: unknown;
  error?: string;
}

export interface ToolKeys {
  tavily?: string; // web_search
  wolfram?: string; // wolfram_query
  unsplash?: string; // image_search
  youtube?: string; // yt_transcript
}
