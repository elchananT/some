import type { PrintThemeId, DensityId, QuestionTypeId, AccessibilityId } from '@/lib/types';

/**
 * Six locked print themes. Each is a self-contained CSS block scoped to a body
 * class (`.theme-xxx`). The shared base stylesheet in `export_utils.ts` already
 * defines layout primitives (`.page`, `.page-header`, `.page-body`) + A4 page
 * break discipline; these themes ONLY override typography, color and accents.
 *
 * No external font fetches (offline + html2pdf safe).
 */

export interface PrintTheme {
  id: PrintThemeId;
  label: string;
  blurb: string;
  accent: string; // preview-swatch only
  bg: string;
  css: string;
}

export const PRINT_THEMES: PrintTheme[] = [
  {
    id: 'classic-textbook',
    label: 'Classic Textbook',
    blurb: 'Serif typography, two-column density, numbered sections.',
    accent: '#2d3436',
    bg: '#fdfbf7',
    css: `
      body.theme-classic-textbook { background:#e9e4d8; }
      .theme-classic-textbook .page { background:#fdfbf7; font-family: 'Iowan Old Style', Georgia, 'Times New Roman', serif; }
      .theme-classic-textbook .page-header h1 { font-weight:700; font-style:normal; font-size:28pt; color:#1c1c1c; letter-spacing:-0.01em; }
      .theme-classic-textbook .page-header { border-bottom-color:#2d3436; }
      .theme-classic-textbook .page-type { color:#636e72; letter-spacing:0.28em; }
      .theme-classic-textbook .page-body { columns: 2; column-gap: 10mm; font-size:10.5pt; line-height:1.55; text-align:justify; hyphens:auto; }
      .theme-classic-textbook .page-body h2 { column-span: all; font-weight:700; font-size:15pt; border-bottom:1px solid #d8d2c2; padding-bottom:4pt; }
      .theme-classic-textbook .answer-line { border-bottom:1px solid #1c1c1c; height:14pt; margin:6pt 0; }
      .theme-classic-textbook .answer-box { border:1px solid #1c1c1c; padding:6pt; margin:6pt 0; }
    `,
  },
  {
    id: 'modern-workbook',
    label: 'Modern Workbook',
    blurb: 'Sans-serif, generous whitespace, soft warm accent (Claude-like).',
    accent: '#CC785C',
    bg: '#ffffff',
    css: `
      body.theme-modern-workbook { background:#F5F1EB; }
      .theme-modern-workbook .page { background:#ffffff; font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif; }
      .theme-modern-workbook .page-header { border-bottom:1px solid #E8E4DC; }
      .theme-modern-workbook .page-header h1 { font-style:normal; font-weight:600; letter-spacing:-0.02em; font-size:28pt; color:#1F1F1C; }
      .theme-modern-workbook .page-type { color:#CC785C; }
      .theme-modern-workbook .page-body { font-size:11pt; line-height:1.7; color:#1F1F1C; }
      .theme-modern-workbook .page-body h2 { font-weight:600; font-size:16pt; color:#1F1F1C; }
      .theme-modern-workbook .answer-line { border-bottom:1.5px solid #CC785C; height:16pt; margin:6pt 0; }
      .theme-modern-workbook .answer-box { border:1.5px solid #E8E4DC; border-radius:8px; padding:8pt; margin:6pt 0; }
      .theme-modern-workbook .mc-option { display:block; padding:4pt 0 4pt 20pt; position:relative; }
      .theme-modern-workbook .mc-option::before { content:''; position:absolute; left:0; top:6pt; width:10pt; height:10pt; border:1.5px solid #CC785C; border-radius:50%; }
    `,
  },
  {
    id: 'playful-kids',
    label: 'Playful Kids',
    blurb: 'Rounded, colorful, large and friendly.',
    accent: '#f59e0b',
    bg: '#fffbeb',
    css: `
      body.theme-playful-kids { background:#FFE9B0; }
      .theme-playful-kids .page { background:#fffbeb; font-family: 'Comic Sans MS', 'Chalkboard SE', 'Baloo 2', system-ui, sans-serif; border-radius:18px; }
      .theme-playful-kids .page-header { border-bottom:3px dashed #f59e0b; }
      .theme-playful-kids .page-header h1 { font-style:normal; font-weight:700; font-size:32pt; color:#b45309; letter-spacing:-0.01em; }
      .theme-playful-kids .page-type { color:#f59e0b; }
      .theme-playful-kids .page-body { font-size:13pt; line-height:1.75; color:#1a1a1a; }
      .theme-playful-kids .page-body h2 { font-weight:700; font-size:18pt; color:#b45309; }
      .theme-playful-kids .answer-line { border-bottom:2px dotted #f59e0b; height:18pt; margin:6pt 0; }
      .theme-playful-kids .answer-box { border:2px dashed #f59e0b; border-radius:14px; padding:8pt; margin:6pt 0; background:#fff7df; }
      .theme-playful-kids .mc-option::before { border-color:#f59e0b !important; }
    `,
  },
  {
    id: 'exam-prep',
    label: 'Exam Prep',
    blurb: 'Dense, monochrome, strict numbering, answer lines everywhere.',
    accent: '#1a1a1a',
    bg: '#ffffff',
    css: `
      body.theme-exam-prep { background:#eeeeee; }
      .theme-exam-prep .page { background:#ffffff; font-family: 'Helvetica Neue', Arial, sans-serif; }
      .theme-exam-prep .page-header { border-bottom:2px solid #000; padding-bottom:8mm; margin-bottom:8mm; }
      .theme-exam-prep .page-header h1 { font-style:normal; font-weight:700; text-transform:uppercase; font-size:18pt; letter-spacing:0.04em; color:#000; }
      .theme-exam-prep .page-type { color:#000; letter-spacing:0.24em; }
      .theme-exam-prep .page-body { font-size:10pt; line-height:1.45; color:#000; }
      .theme-exam-prep .page-body h2 { font-weight:700; font-size:12pt; text-transform:uppercase; letter-spacing:0.05em; margin-top:10pt; }
      .theme-exam-prep .question { padding:6pt 0; border-bottom:1px dashed #888; }
      .theme-exam-prep .answer-line { border-bottom:1px solid #000; height:12pt; margin:4pt 0; }
      .theme-exam-prep .answer-box { border:1px solid #000; padding:6pt; }
    `,
  },
  {
    id: 'scientific-paper',
    label: 'Scientific Paper',
    blurb: 'Latin-Modern-style serif, tight leading, figure captions.',
    accent: '#0f172a',
    bg: '#fdfdfb',
    css: `
      body.theme-scientific-paper { background:#e8eaee; }
      .theme-scientific-paper .page { background:#fdfdfb; font-family: 'Latin Modern Roman', 'Computer Modern', 'Cambria', 'Georgia', serif; }
      .theme-scientific-paper .page-header { border-bottom:0.5pt solid #0f172a; padding-bottom:6mm; margin-bottom:8mm; }
      .theme-scientific-paper .page-header h1 { font-style:normal; font-weight:700; font-size:22pt; color:#0f172a; letter-spacing:-0.005em; }
      .theme-scientific-paper .page-type { color:#475569; }
      .theme-scientific-paper .page-body { font-size:10.5pt; line-height:1.42; text-align:justify; hyphens:auto; }
      .theme-scientific-paper .page-body h2 { font-weight:700; font-size:13pt; margin-top:12pt; }
      .theme-scientific-paper .page-body p { text-indent: 1.5em; margin:0 0 4pt; }
      .theme-scientific-paper .page-body p:first-of-type { text-indent:0; }
      .theme-scientific-paper .figure { margin:10pt auto; text-align:center; }
      .theme-scientific-paper .figure .caption { font-size:9pt; color:#475569; margin-top:4pt; font-style:italic; }
      .theme-scientific-paper .answer-box { border:0.5pt solid #0f172a; padding:6pt; }
    `,
  },
  {
    id: 'notebook-handwritten',
    label: 'Notebook / Handwritten',
    blurb: 'Lined-paper background, hand-drawn accents.',
    accent: '#2563eb',
    bg: '#fcfcff',
    css: `
      body.theme-notebook-handwritten { background:#dfe7f2; }
      .theme-notebook-handwritten .page {
        background:
          linear-gradient(#e6efff 1px, transparent 1px) 0 0 / 100% 8mm,
          #fcfcff;
        font-family: 'Bradley Hand', 'Segoe Script', 'Comic Sans MS', cursive;
      }
      .theme-notebook-handwritten .page::before {
        content:''; position:absolute; top:0; bottom:0; left:18mm; width:1px; background:#ef4444; opacity:0.35;
      }
      .theme-notebook-handwritten .page-header { border-bottom:2px solid #2563eb; }
      .theme-notebook-handwritten .page-header h1 { font-style:italic; font-weight:700; font-size:30pt; color:#1e3a8a; }
      .theme-notebook-handwritten .page-type { color:#2563eb; }
      .theme-notebook-handwritten .page-body { font-size:12pt; line-height:8mm; color:#111; }
      .theme-notebook-handwritten .page-body h2 { font-weight:700; font-size:16pt; color:#1e3a8a; text-decoration: underline wavy #2563eb; }
      .theme-notebook-handwritten .answer-line { border-bottom:1px solid #2563eb; height:8mm; margin:0; }
      .theme-notebook-handwritten .answer-box { border:1.5px solid #2563eb; border-radius:6px; padding:6pt; }
    `,
  },
];

export const PRINT_THEMES_CSS: string = PRINT_THEMES.map(t => t.css).join('\n');

export function getPrintTheme(id: PrintThemeId | undefined): PrintTheme {
  return PRINT_THEMES.find(t => t.id === id) || PRINT_THEMES[1]; // default: modern-workbook
}

export const DENSITY_CSS: Record<DensityId, string> = {
  light: `.density-light .page-body { font-size: 12pt; line-height: 1.85; } .density-light .page { padding: 22mm 26mm; }`,
  balanced: `.density-balanced .page-body { font-size: 11pt; line-height: 1.65; }`,
  dense: `.density-dense .page-body { font-size: 9.5pt; line-height: 1.35; } .density-dense .page { padding: 16mm 18mm; }`,
};

export const DENSITY_CSS_ALL = Object.values(DENSITY_CSS).join('\n');

export const ACCESSIBILITY_CSS: Record<AccessibilityId, string> = {
  standard: '',
  'dyslexia-friendly': `
    .accessibility-dyslexia-friendly .page { 
      font-family: 'OpenDyslexic', 'Comic Sans MS', 'Chalkboard SE', cursive !important; 
      line-height: 1.8 !important; 
      letter-spacing: 0.05em !important; 
      word-spacing: 0.1em !important;
    }
    .accessibility-dyslexia-friendly .page-body {
      font-size: 12pt !important;
    }
    .accessibility-dyslexia-friendly .page-body p {
      margin-bottom: 1.5em !important;
    }
  `,
};

export const ACCESSIBILITY_CSS_ALL = Object.values(ACCESSIBILITY_CSS).join('\n');

export const QUESTION_TYPES: { id: QuestionTypeId; label: string; hint: string }[] = [
  { id: 'mcq', label: 'Multiple choice', hint: '4 options' },
  { id: 'true-false', label: 'True / False', hint: 'binary' },
  { id: 'short-answer', label: 'Short answer', hint: '1–2 lines' },
  { id: 'long-answer', label: 'Long answer', hint: 'paragraph' },
  { id: 'fill-blank', label: 'Fill in the blank', hint: '_____' },
  { id: 'matching', label: 'Matching pairs', hint: 'A↔B' },
  { id: 'math-workspace', label: 'Math with workspace', hint: 'solve space' },
  { id: 'diagram-label', label: 'Diagram labels', hint: 'annotate' },
  { id: 'code', label: 'Code questions', hint: 'monospace box' },
];
