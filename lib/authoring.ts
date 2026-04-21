/**
 * Authoring rubric + prompt builders shared across providers.
 *
 * Centralizing the rubric means every provider (Gemini / OpenAI / Anthropic /
 * Ollama) produces content with the same pedagogical standard and same
 * semantic HTML vocabulary — which is what the print themes are designed to
 * consume.
 */
import type { StylePrefs, QuestionTypeId } from './types';

export const AUTHORING_RUBRIC = `AUTHORING RUBRIC — self-check before you answer:
1. Learning objective: every page opens with a Bloom's verb (identify / explain / apply / analyze / evaluate / create).
2. Difficulty ramp: within each page or section, progress from recall → application → synthesis.
3. Answer-key completeness: every question gets a model answer AND a 1-line explanation.
4. MCQ quality: 4 options, 3 plausible distractors tied to real misconceptions (no "none of the above").
5. No duplicate questions or near-duplicates across a workbook.
6. Age/level consistency with the stated level.
7. Factual grounding: if you are unsure of a fact, hedge or omit — never invent.

HTML OUTPUT VOCABULARY (use these semantic classes, nothing else):
- <section class="page"> ONE per physical page
- <header class="page-header"><h1>...</h1></header>
- <h2>, <h3> for section titles — no inline styles
- <ol class="mc-options"> with <li class="mc-option"> for multiple-choice
- <div class="answer-line"></div> for a single underline
- <div class="answer-box" data-lines="N"></div> for multi-line boxes
- <span class="math">LaTeX...</span> for math (inline) / <div class="math block">...</div> (block)
- <div class="figure"><svg>...</svg><figcaption>...</figcaption></div>
- <div class="callout"><strong>Note:</strong> ...</div>
- <div class="grid-2col">...</div> for side-by-side

HARD RULES:
- NEVER emit <style>, <link>, or style="..." attributes.
- NEVER use external images or <img src="http...">. Inline SVG only.
- Keep each page ≤ 450 words / ≤ 25 vertical lines. If you'd overflow, split into a second page.
- Always include a concrete example before asking a question about a concept.`;

export const QUESTION_TYPE_LABELS: Record<QuestionTypeId, string> = {
  mcq: 'multiple choice (4 options with distractors)',
  'true-false': 'true/false with a 1-line justification',
  'short-answer': 'open-ended short answer (1–2 lines)',
  'long-answer': 'open-ended long answer (paragraph)',
  'fill-blank': 'fill-in-the-blank with ____ tokens',
  matching: 'matching pairs (4–6 pairs)',
  'math-workspace': 'math problem with worked-solution space',
  'diagram-label': 'diagram labeling question',
  code: 'code question with monospace answer box',
};

function questionTypeHint(types?: QuestionTypeId[]): string {
  if (!types || types.length === 0) return '';
  const labels = types.map(t => `- ${QUESTION_TYPE_LABELS[t]}`).join('\n');
  return `\nALLOWED QUESTION TYPES (use ONLY these, rewrite content if it doesn't fit):\n${labels}`;
}

function densityHint(prefs?: StylePrefs): string {
  switch (prefs?.density) {
    case 'light':
      return '\nDENSITY: light — fewer questions, lots of whitespace, max 15 lines per page.';
    case 'dense':
      return '\nDENSITY: dense — pack information tightly, up to 30 lines per page, no filler.';
    case 'balanced':
    default:
      return '\nDENSITY: balanced — aim for ~20 lines per page.';
  }
}

function themeHint(prefs?: StylePrefs): string {
  switch (prefs?.theme) {
    case 'playful-kids':
      return '\nTONE: playful and warm. Use concrete everyday examples. Short sentences.';
    case 'exam-prep':
      return '\nTONE: neutral, no-nonsense exam style. Strict numbering (1., 2., 3.). Answer slots mandatory.';
    case 'scientific-paper':
      return '\nTONE: precise and formal. Define terms on first use. Include figure captions where relevant.';
    case 'classic-textbook':
      return '\nTONE: classic textbook prose. One or two well-developed paragraphs before the exercises.';
    case 'notebook-handwritten':
      return '\nTONE: conversational, as if a teacher is writing on lined paper. Shorter prose.';
    case 'modern-workbook':
    default:
      return '\nTONE: clear and modern, like a premium published workbook.';
  }
}

/**
 * Builds a content-page prompt that injects the authoring rubric plus any
 * style-pref guidance. Used by provider `generateContentPage` implementations.
 */
export function buildContentPagePrompt(args: {
  title: string;
  objective: string;
  type: string;
  context: string;
  stylePrefs?: StylePrefs;
}): string {
  const { title, objective, type, context, stylePrefs } = args;
  return `${AUTHORING_RUBRIC}
${themeHint(stylePrefs)}${densityHint(stylePrefs)}${questionTypeHint(stylePrefs?.questionTypes)}

TASK:
Create a ${type} page titled "${title}".
Objective: ${objective}
Context: ${context}

Return ONLY the page body HTML wrapped in a single <div>. No markdown fences, no commentary.`;
}
