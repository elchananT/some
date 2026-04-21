# EduSpark UI Perfection Roadmap

This document outlines the strategic steps to elevate the EduSpark UI from functional to production-grade perfection.

## Step 1: Interactive Visual Style Gallery
**Objective**: replace text-based style selection with a high-fidelity interactive gallery in the Artifact Pane.
- [x] Add `SelectionStep` to `GeneratingStep` union.
- [x] Create `StyleSelector` component within `ArtifactPane.tsx`.
- [x] Pass `onSelectStyle` callback from `app/page.tsx` through to the selector.
- [x] Update `ai_stream.ts` to suggest styles using a format that the frontend can detect to trigger the gallery.

## Step 2: Global Hebrew (RTL) Logic
**Objective**: ensure the application is ready for bilingual Hebrew/English use with mirrored layouts.
- [x] Create `RTLContext` or use a global state for layout direction.
- [x] Add a "Mirror UI" toggle in the sidebar or header.
- [x] Implement `dir="rtl"` conditionally on the `main` container.
- [x] Add CSS overrides for RTL margins, padding, and icon directions.

## Step 3: Floating "Pro-Editor" Toolbar
**Objective**: provide a seamless, inline editing experience for workbook refinement.
- [x] Implement a `SelectionToolbar` component using `Framer Motion`.
- [x] Hook into `window.getSelection()` to position the toolbar above active text.
- [x] Add controls for Bold, Italic, Headings, and Math (Katex) injection.
- [x] Integrate with `WorkbookPreview` state to persist changes inline.

## Step 4: Semantic Bento-Style Layouts
**Objective**: move beyond columns to intelligent, high-design page structures.
- [x] Define `bento-grid` and `f-pattern` layouts in `types.ts`.
- [x] Update `WorkbookPreview.tsx` with CSS Grid implementations for these complex shapes.
- [x] Update AI prompts to encourage structured, bento-style grouping of workbook elements.

## Step 5: Advanced Micro-Animations
**Objective**: create a "premium" feel through motion and feedback.
- [x] Add staggered list entrances for conversation history.
- [x] Implement "morphing" transitions between generating steps (e.g., Roadmap -> Composing).
- [x] Add tactical feedback (subtle scale transforms) to all interactive buttons.
- [x] Implement smooth scrolling for chat and workbook pages.

---
*Roadmap created on 2026-04-21*
