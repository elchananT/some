import { v4 as uuidv4 } from 'uuid';
import type { BuildWorkbookArgs, Workbook, WorkbookPage } from '@/lib/types';
import { generateContentPage, generateIllustration, verifyWorkbook } from '@/lib/ai';
import { getActiveProviderId } from '@/lib/providers';
import { runWithConcurrency } from './concurrency';
import type { PipelineHooks } from './types';

/**
 * Per-provider concurrency caps for page drafting.
 *  - Gemini Flash has generous per-minute quotas → 5
 *  - OpenAI standard tier → 3
 *  - Ollama runs on local CPU/GPU → 1 (serial)
 *  - Mock / unknown → 3 (fast, in-memory)
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
      return 5;
    case 'openai':
      return 3;
    case 'ollama':
      return 1;
    default:
      return 3;
  }
}

/**
 * Lightweight heuristic critique — avoids burning a second round-trip for
 * pages that are clearly fine. Returns a score 0..10 and a short reason.
 *
 * A thorough LLM-based self-critique can layer on top of this later by
 * implementing `provider.critiquePage?`.
 */
function quickCritique(html: string): { score: number; reason: string } {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length < 120) return { score: 5, reason: 'too short' };
  if (!/[.!?]/.test(text)) return { score: 6, reason: 'no sentence punctuation' };
  if (/(lorem ipsum|placeholder|todo)/i.test(text)) return { score: 3, reason: 'placeholder text' };
  // Longer, punctuated, non-placeholder → good enough.
  return { score: 9, reason: 'ok' };
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
    pages: new Array(total).fill(null) as unknown as WorkbookPage[],
    outline: 'Generated conversationally.',
  };

  // --- Stage: draft pages (parallel) -----------------------------------------
  hooks.onStage('composing');
  hooks.onPhase(`Drafting ${total} pages · ${cap} in parallel`);
  hooks.onBreadcrumb(`Outline ready · ${total} pages`);

  const draftTasks = args.pages.map((pageInfo, i) => async () => {
    hooks.onBreadcrumb(`Drafting p${i + 1}: ${pageInfo.title}`);
    const content = await generateContentPage(
      pageInfo.title,
      pageInfo.objective,
      pageInfo.type,
      `Section ${i + 1} of a workbook titled "${args.title}". Focus on ${pageInfo.objective}.`
    );
    const page: WorkbookPage = {
      id: `page-${i}`,
      title: pageInfo.title,
      type: pageInfo.type as WorkbookPage['type'],
      content,
      theme: args.overallStyle as WorkbookPage['theme'],
      blocks: [],
    };
    workbook.pages[i] = page;
    hooks.onPageUpdate(i, page);
    return page;
  });
  await runWithConcurrency(draftTasks, cap);

  // --- Stage: critique & revise ---------------------------------------------
  const weakIndices: number[] = [];
  workbook.pages.forEach((p, i) => {
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
          `Rewrite this workbook page more thoroughly. Keep the original intent but expand to full paragraphs with examples. Previous draft:\n${original.content}`
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
