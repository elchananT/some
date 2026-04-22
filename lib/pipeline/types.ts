import type { WorkbookPage } from '@/lib/types';

/** A structured page block — a provider-agnostic content unit. */
export type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'callout'; tone: 'tip' | 'warn' | 'example'; text: string }
  | { kind: 'math'; latex: string };

export interface Exercise {
  id: string;
  prompt: string;
  kind: 'multiple_choice' | 'short_answer' | 'numerical' | 'essay';
  choices?: string[];
  answer: string;
  explanation?: string;
}

export interface StructuredPage {
  title: string;
  type: 'introduction' | 'lesson' | 'exercise' | 'review';
  blocks: Block[];
  exercises?: Exercise[];
  teacherNotes?: string[];
}

/** Callbacks for a pipeline run — the hook maps these onto React state. */
export interface PipelineHooks {
  onStage(stage: 'researching' | 'composing' | 'illustrating' | 'verifying' | 'complete'): void;
  onBreadcrumb(label: string): void;
  onPhase(text: string): void;
  onPageUpdate(index: number, page: WorkbookPage): void;
  onCoverIllustration?(svg: string): void;
  onVerificationReport?(report: string): void;
}
