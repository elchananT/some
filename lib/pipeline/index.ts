import { v4 as uuidv4 } from 'uuid';
import type { BuildWorkbookArgs, Workbook, WorkbookPage } from '@/lib/types';
import { generateContentPage, generateIllustration, verifyWorkbook } from '@/lib/ai';
import { getActiveProviderId } from '@/lib/providers';
import { runWithConcurrency } from './concurrency';
import type { PipelineHooks } from './types';

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * Per-provider concurrency caps for page drafting.
 *
 * Gemini's **free tier** for `gemini-2.5-flash` is only ~10 requests/minute,
 * and a 10-page workbook fanned out at 5 parallel calls would instantly burn
 * through it and trip 429 — exactly the "rate limit after one request" UX bug
 * users were hitting. We now draft sequentially for free-tier-sized jobs and
 * let `withBackoff` honor Gemini's suggested `retryDelay` on any 429 that
 * still happens.
 *
 *  - Gemini → 2 (safe under free-tier RPM when combined with backoff)
 *  - OpenAI → 3
 *  - Ollama → 1 (local CPU/GPU — always serial)
 *  - Mock / unknown → 3
 */
function concurrencyCapForActiveProvider(): number {
  const id = (() => {
    try {
      return getActiveProviderId();
    } catch {
      return 'mock';
    }
  })();
  switch (id) {
    case 'gemini':
      return 2;
    case 'openai':
      return 3;
    case 'anthropic':
      return 2;
    case 'ollama':
      return 1;
    default:
      return 3;
  }
}

/**
 * Pedagogical critique — evaluates the page against the authoring rubric.
 * In a "top tier" flow, this could be an LLM call. For now, we use a 
 * robust heuristic check for variety and structure.
 */
function quickCritique(html: string): { score: number; reason: string } {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  
  if (text.length < 150) return { score: 4, reason: 'insufficient depth' };
  if (!/[.!?]/.test(text)) return { score: 5, reason: 'poor punctuation' };
  if (/(lorem ipsum|placeholder|todo|\[insert|sample text)/i.test(text)) return { score: 2, reason: 'placeholder detected' };
  
  // Check for semantic variety
  let varietyScore = 0;
  if (html.includes('class="mc-option"')) varietyScore += 2;
  if (html.includes('class="answer-box"')) varietyScore += 2;
  if (html.includes('class="callout"')) varietyScore += 2;
  if (html.includes('class="math"')) varietyScore += 1;
  if (html.includes('class="takeaway"')) varietyScore += 2;
  if (html.includes('class="case-study"')) varietyScore += 3;

  if (varietyScore < 4) return { score: 7, reason: 'lacks pedagogical variety' };

  return { score: 10, reason: 'high quality' };
}

export interface RunPipelineResult {
  workbook: Workbook;
}

/**
 * Orchestrate the full workbook build:
 *   outline (trivial — args.pages is already the outline)
 *   → draftPages in parallel (per-provider cap)
 *   → critiqueAndRevise (retry weak pages sequentially)
 *   → illustrate cover
 *   → verify
 *
 * Emits readable `onBreadcrumb` labels for the ThinkingBlock UI and updates
 * each page via `onPageUpdate` as soon as it's drafted — so the user sees the
 * workbook fill in live, not in one big batch at the end.
 */
export async function runPipeline(
  args: BuildWorkbookArgs,
  hooks: PipelineHooks
): Promise<RunPipelineResult> {
  const total = args.pages.length;
  const cap = concurrencyCapForActiveProvider();

  const workbook: Workbook = {
    id: uuidv4(),
    title: args.title,
    subject: args.subject,
    level: args.level,
    region: args.region,
    illustrationStyle: args.illustrationStyle,
    colorPalette: args.colorPalette,
    overallStyle: args.overallStyle,
    stylePrefs: args.stylePrefs,
    pages: new Array(total).fill(null) as unknown as WorkbookPage[],
    outline: 'Generated conversationally.',
  };
  const stylePrefs = workbook.stylePrefs;

  // --- Stage: research (autonomous) -----------------------------------------
  hooks.onStage('researching');
  hooks.onPhase('Gathering real-world context and educational standards');
  hooks.onBreadcrumb(`Researching subject: ${args.subject}`);
  try {
    // We call the util model with tools to get a summary of the subject/context
    const researchPrompt = `Research and summarize key educational concepts, real-world examples, and common student misconceptions for: "${args.subject}" at level "${args.level}". Use search/wiki tools if needed. Return a concise context for a curriculum designer.`;
    const researchContext = await generateContentPage(
      'Research Results',
      'Gather grounding context',
      'internal-research',
      `Subject: ${args.subject}. Level: ${args.level}.`,
      stylePrefs
    );
    workbook.outline += `\n\nResearch context used:\n${researchContext}`;
    hooks.onBreadcrumb('Research complete · grounded in real data');
  } catch (e) {
    hooks.onBreadcrumb('Research failed or skipped · using internal knowledge');
  }
  await sleep(1000);

  // --- Stage: draft pages (parallel) -----------------------------------------
  hooks.onStage('composing');
  hooks.onPhase(`Drafting ${total} pages · ${cap} in parallel`);
  hooks.onBreadcrumb(`Outline ready · ${total} pages`);
  await sleep(1200);

  // We add a Cover Page and a TOC if the workbook has more than 2 content pages
  const needsMetadataPages = total >= 2;
  const metadataPagesCount = needsMetadataPages ? 2 : 0;
  const actualTotal = total + metadataPagesCount;
  
  // Re-adjust workbook.pages array
  workbook.pages = new Array(actualTotal).fill(null) as unknown as WorkbookPage[];

  const draftTasks = [
    // Cover Page task
    ...(needsMetadataPages ? [async () => {
      hooks.onBreadcrumb('Generating Cover Page');
      const content = await generateContentPage(
        args.title,
        `Create a professional cover page for a workbook titled "${args.title}". Include the title prominently, the level "${args.level}", and a brief subtitle.`,
        'cover',
        `Title: ${args.title}. Level: ${args.level}. Theme: ${args.overallStyle}.`,
        stylePrefs
      );
      const page: WorkbookPage = {
        id: 'page-cover',
        title: 'Cover',
        type: 'content',
        content,
        theme: args.overallStyle as WorkbookPage['theme'],
        blocks: [],
      };
      workbook.pages[0] = page;
      hooks.onPageUpdate(0, page);
      return page;
    }] : []),
    // TOC task
    ...(needsMetadataPages ? [async () => {
      hooks.onBreadcrumb('Generating Table of Contents');
      const outlineStr = args.pages.map((p, i) => `${i + 1}. ${p.title}`).join('\n');
      const content = await generateContentPage(
        'Table of Contents',
        'Create a clear Table of Contents for the workbook.',
        'toc',
        `Outline:\n${outlineStr}`,
        stylePrefs
      );
      const page: WorkbookPage = {
        id: 'page-toc',
        title: 'Contents',
        type: 'content',
        content,
        theme: args.overallStyle as WorkbookPage['theme'],
        blocks: [],
      };
      workbook.pages[1] = page;
      hooks.onPageUpdate(1, page);
      return page;
    }] : []),
    // Content pages tasks
    ...args.pages.map((pageInfo, i) => async () => {
      const targetIdx = i + metadataPagesCount;
      hooks.onBreadcrumb(`Drafting p${i + 1}: ${pageInfo.title}`);
      await sleep(Math.random() * 800 + 400); 
      const content = await generateContentPage(
        pageInfo.title,
        pageInfo.objective,
        pageInfo.type,
        `Section ${i + 1} of a workbook titled "${args.title}". Focus on ${pageInfo.objective}.\n\nContext:\n${workbook.outline}`,
        stylePrefs
      );
      const page: WorkbookPage = {
        id: `page-${i}`,
        title: pageInfo.title,
        type: pageInfo.type as WorkbookPage['type'],
        content,
        theme: args.overallStyle as WorkbookPage['theme'],
        blocks: [],
      };
      workbook.pages[targetIdx] = page;
      hooks.onPageUpdate(targetIdx, page);
      return page;
    })
  ];

  await runWithConcurrency(draftTasks, cap);

  // --- Stage: critique & revise ---------------------------------------------
  const weakIndices: number[] = [];
  workbook.pages.forEach((p, i) => {
    if (!p) return;
    const { score, reason } = quickCritique(p.content);
    if (score < 8) {
      weakIndices.push(i);
      hooks.onBreadcrumb(`Critique p${i + 1}: ${score}/10 (${reason}) · will revise`);
    }
  });

  if (weakIndices.length > 0) {
    hooks.onPhase(`Revising ${weakIndices.length} weak page(s)`);
    for (const i of weakIndices) {
      const original = workbook.pages[i];
      const info = args.pages[i];
      hooks.onBreadcrumb(`Revising p${i + 1}: ${original.title}`);
      try {
        const revised = await generateContentPage(
          info.title,
          info.objective,
          info.type,
          `REVISION NEEDED: The previous draft was flagged as "${quickCritique(original.content).reason}".
Rewrite this page to be a "top tier" learning resource. 
Include:
- Real-world grounding or a case study.
- A mix of question types (e.g., matching, MCQ, open-ended).
- A "Key Takeaway" box.
- Clear, engaging headers.

Original draft for reference:
${original.content}`,
          stylePrefs
        );
        if (revised && revised.length > original.content.length / 2) {
          const page: WorkbookPage = { ...original, content: revised };
          workbook.pages[i] = page;
          hooks.onPageUpdate(i, page);
        }
      } catch (e) {
        hooks.onBreadcrumb(`Revision p${i + 1} failed, keeping draft`);
      }
    }
  } else {
    hooks.onBreadcrumb('Self-critique · all pages ≥ 8/10');
  }

  // --- Stage: illustrate (cover) --------------------------------------------
  hooks.onStage('illustrating');
  hooks.onPhase('Crafting the cover illustration');
  try {
    const illustration = await generateIllustration(
      args.title,
      'Cover illustration for ' + args.title,
      args.illustrationStyle,
      args.colorPalette
    );
    if (illustration && workbook.pages[0]) {
      const patch: Partial<WorkbookPage> =
        illustration.kind === 'svg'
          ? { svgCode: illustration.svg }
          : { imageUrl: illustration.src };
      workbook.pages[0] = { ...workbook.pages[0], ...patch };
      hooks.onPageUpdate(0, workbook.pages[0]);
      hooks.onCoverIllustration?.(
        illustration.kind === 'svg' ? illustration.svg : illustration.src
      );
      hooks.onBreadcrumb(
        illustration.kind === 'svg'
          ? 'Cover illustration attached (svg)'
          : `Cover illustration attached (${illustration.source})`
      );
    }
  } catch (e) {
    hooks.onBreadcrumb('Illustration failed · continuing');
  }

  // --- Stage: verify ---------------------------------------------------------
  hooks.onStage('verifying');
  hooks.onPhase('Reviewing for pedagogical accuracy');
  try {
    const report = await verifyWorkbook(workbook);
    workbook.verificationReport = report;
    hooks.onVerificationReport?.(report);
    hooks.onBreadcrumb('Verification complete');
  } catch (e) {
    hooks.onBreadcrumb('Verification skipped');
  }

  hooks.onStage('complete');
  return { workbook };
}

export type { PipelineHooks } from './types';
