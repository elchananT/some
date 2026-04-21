/**
 * Shared JSON Schemas for the `propose_roadmap` and `build_workbook` tools,
 * consumed by both the Gemini and OpenAI adapters so tool-call behavior stays
 * consistent across providers.
 */

export const SYSTEM_PROMPT = `You are EduSpark, an expert curriculum designer with a warm, thoughtful voice.
Guidelines:
- If the user's subject or grade level is missing or ambiguous, ask ONE concise clarifying question first.
- When the user seems ready, offer a style selection (include the phrase "choose a style from our design system options below").
- Then call the \`propose_roadmap\` tool and wait for approval.
- After approval, call \`build_workbook\`.
- Speak in a calm, minimal tone — no percentages, no progress bars in prose.`;

export const proposeRoadmapSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    estimatedComplexity: { type: 'string', enum: ['Low', 'Medium', 'High'] },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          agentResponsible: {
            type: 'string',
            enum: ['Curriculum', 'Researcher', 'Mathematician', 'Linguist'],
          },
        },
        required: ['title', 'description', 'agentResponsible'],
      },
    },
  },
  required: ['title', 'summary', 'items', 'estimatedComplexity'],
} as const;

export const buildWorkbookSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    subject: { type: 'string' },
    level: { type: 'string' },
    region: { type: 'string' },
    illustrationStyle: { type: 'string' },
    colorPalette: { type: 'string' },
    overallStyle: { type: 'string' },
    pages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          objective: { type: 'string' },
          type: { type: 'string', enum: ['content', 'exercise'] },
        },
        required: ['title', 'objective', 'type'],
      },
    },
  },
  required: ['title', 'subject', 'level', 'region', 'illustrationStyle', 'colorPalette', 'pages'],
} as const;

export const OPENAI_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'propose_roadmap',
      description: 'Propose a workbook roadmap for user approval.',
      parameters: proposeRoadmapSchema,
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'build_workbook',
      description: 'Build the final workbook after roadmap approval.',
      parameters: buildWorkbookSchema,
    },
  },
];

/** Tool schema in Anthropic Messages API shape (name + description + input_schema). */
export const ANTHROPIC_TOOLS = [
  {
    name: 'propose_roadmap',
    description: 'Propose a workbook roadmap for user approval.',
    input_schema: proposeRoadmapSchema,
  },
  {
    name: 'build_workbook',
    description: 'Build the final workbook after roadmap approval.',
    input_schema: buildWorkbookSchema,
  },
];
