/**
 * Authoring rubric + prompt builders shared across providers.
 *
 * Centralizing the rubric means every provider (Gemini / OpenAI / Anthropic /
 * Ollama) produces content with the same pedagogical standard and same
 * semantic HTML vocabulary — which is what the print themes are designed to
 * consume.
 */
import type { StylePrefs, QuestionTypeId } from './types';

export const AUTHORING_RUBRIC = `AUTHORING RUBRIC — absolute standards for top-tier content:
1. Chain of Thought: ALWAYS start your response with a <thought> block. Plan the page structure, Bloom's verb, difficulty ramp, and distractor logic before writing any HTML.
2. Learning objective: Every page must open with a Bloom's taxonomy verb (identify / explain / apply / analyze / evaluate / create).
3. Difficulty ramp: Progress from simple recall → complex application → critical synthesis within each page.
4. Answer-key completeness: Every question MUST have a model answer AND a 1-line pedagogical explanation.
5. MCQ quality: Exactly 4 options. 3 MUST be plausible distractors tied to common student misconceptions. No "All of the above".
6. Contextual Grounding: Use your tools (SEARCH, WIKI) to pull real-world data, historical dates, or scientific facts. Never hallucinate examples.
7. Structural Variety: Use callouts, case-studies, takeaways, and grids to break up text. Avoid walls of prose.
8. Interactive Depth: Include at least one section that requires active reflection ("Why do you think...", "Compare this to...").

HTML OUTPUT VOCABULARY (use these semantic classes ONLY):
- <section class="page"> (The root container)
- <header class="page-header"><h1>...</h1></header>
- <div class="thought"> (Hidden reasoning block, used for CoT - will be stripped by the app)
- <ol class="mc-options"> with <li class="mc-option">
- <div class="answer-line"></div>
- <div class="answer-box" data-lines="N"></div>
- <span class="math">...</span> / <div class="math block">...</div>
- <div class="figure"><svg>...</svg><figcaption>...</figcaption></div>
- <div class="callout">...</div>
- <div class="grid-2col">...</div>
- <div class="grid-bento"> (Bento Grid 2.0: Use <div class="bento-main"> for core concept, <div class="bento-side"> for trivia/sidebar, <div class="bento-foot"> for summary)
- <div class="layout-f"> (F-Pattern: Use alternating <div class="f-top"> (header) and <div class="f-body"> (content) blocks for high-retention reading)
- <div class="takeaway">...</div>
- <div class="case-study">...</div>
- <div class="glossary-item"><dt>Term</dt><dd>Definition</dd></div>

HARD RULES:
- Return valid HTML ONLY after the <thought> block.
- NO preamble, NO markdown fences (unless asked for specific snippets), NO commentary outside <thought>.
- Keep each page ≤ 450 words. If content is too long, focus on the most important sub-topic.
- RTL/LTR: If the content is in Hebrew or Arabic, ensure the semantic structure supports RTL (though CSS handles the heavy lifting).`;

export const CRITIQUE_PROMPT = `You are a Senior Pedagogical Reviewer. 
Evaluate the following workbook page against this rubric:
\${AUTHORING_RUBRIC}

Provide a critique in JSON format:
{
  "score": 1-10,
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "recommendingRevision": boolean,
  "actionableFix": "One specific instruction to fix the main weakness"
}`;

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

function difficultyHint(prefs?: StylePrefs): string {
  switch (prefs?.difficulty) {
    case 'basic':
      return '\nDIFFICULTY: basic — use simple vocabulary (CEFR A1/A2), concrete examples, and break down complex concepts into small steps.';
    case 'advanced':
      return '\nDIFFICULTY: advanced — use sophisticated academic vocabulary (CEFR C1/C2), complex sentence structures, and expect high-level synthesis.';
    case 'intermediate':
    default:
      return '\nDIFFICULTY: intermediate — standard grade-level vocabulary and balanced complexity.';
  }
}

function accessibilityHint(prefs?: StylePrefs): string {
  if (prefs?.accessibility === 'dyslexia-friendly') {
    return '\nACCESSIBILITY: dyslexia-friendly — use even more whitespace, shorter paragraphs, and bold important terms. Ensure logical flow is very explicit.';
  }
  return '';
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
${themeHint(stylePrefs)}${difficultyHint(stylePrefs)}${accessibilityHint(stylePrefs)}${densityHint(stylePrefs)}${questionTypeHint(stylePrefs?.questionTypes)}

TASK:
Create a ${type} page titled "${title}".
Objective: ${objective}
Context: ${context}

Return ONLY the page body HTML wrapped in a single <section class="page">. No markdown fences, no commentary, no preamble. Just the code.`;
}

/**
 * Clean up LLM output by removing markdown fences and extracting the 
 * <section class="page"> block.
 */
export function cleanHTML(text: string): string {
  let cleaned = text.replace(/```html/g, '').replace(/```/g, '').trim();
  const startIdx = cleaned.indexOf('<section');
  if (startIdx !== -1) {
    const endIdx = cleaned.lastIndexOf('</section>');
    if (endIdx !== -1) return cleaned.slice(startIdx, endIdx + 10);
    return cleaned.slice(startIdx);
  }
  return cleaned;
}
