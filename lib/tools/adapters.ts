/**
 * Convert the shared tool registry into each provider's native tool-use schema.
 */
import { Type } from '@google/genai';
import type { ToolDefinition, ToolParamSchema } from './types';
import { getActiveToolDefinitions } from './registry';

function toGeminiType(t: 'string' | 'number' | 'boolean') {
  if (t === 'string') return Type.STRING;
  if (t === 'number') return Type.NUMBER;
  return Type.BOOLEAN;
}

function toGeminiParams(p: ToolParamSchema) {
  const properties: Record<string, { type: Type; description?: string; enum?: string[] }> = {};
  for (const [k, v] of Object.entries(p.properties)) {
    properties[k] = { type: toGeminiType(v.type), description: v.description, enum: v.enum };
  }
  return { type: Type.OBJECT, properties, required: p.required ?? [] };
}

/** Returns Gemini `functionDeclarations` for all currently-active tools. */
export function geminiToolDeclarations() {
  return getActiveToolDefinitions().map((def: ToolDefinition) => ({
    name: def.name,
    description: def.description,
    parameters: toGeminiParams(def.parameters),
  }));
}

/** Returns Anthropic-shaped tools for all currently-active tools. */
export function anthropicTools() {
  return getActiveToolDefinitions().map((def: ToolDefinition) => ({
    name: def.name,
    description: def.description,
    input_schema: {
      type: 'object',
      properties: def.parameters.properties,
      required: def.parameters.required ?? [],
    },
  }));
}

/** Returns OpenAI-shaped `tools` for all currently-active tools. */
export function openaiTools() {
  return getActiveToolDefinitions().map((def: ToolDefinition) => ({
    type: 'function' as const,
    function: {
      name: def.name,
      description: def.description,
      parameters: {
        type: 'object',
        properties: def.parameters.properties,
        required: def.parameters.required ?? [],
      },
    },
  }));
}
