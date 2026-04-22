---
sessionId: session-260421-183414-1o4z
isActive: false
---

# Requirements

### Overview & Goals
Upgrade EduSpark from a high-quality workbook generator to a professional educational platform. We will focus on deepening the pedagogical accuracy through RAG grounding, adding interactive learning capabilities for students, and professionalizing the output with brand kits and LMS-ready exports.

### Scope

**In Scope**
1. **Difficulty & Accessibility Tiers**: 3 levels of difficulty (Basic/Int/Adv) and a Dyslexia-friendly theme (fonts/spacing).
2. **Deep RAG (Uploads)**: Support for PDF/Text source uploads to ground the AI's generation.
3. **Interactive Student Mode**: A "Live" view where questions can be answered in-browser with instant AI feedback.
4. **Professional Branding**: Custom school logo and color palette injection.
5. **LMS Exports**: SCORM 1.2 support for integration with Canvas/Moodle/Google Classroom.
6. **Visual Layouts**: Enhanced Bento-grid and F-pattern logic for magazine-quality PDFs.

**Out of Scope**
- Server-side storage (remains BYOK/localStorage).
- Real-time multi-user collaboration (requires a backend).
- Paid hosting/credits (remains zero-ops).

# Technical Design

### Current Implementation
The pipeline already supports autonomous research, Paged.js high-fidelity export, and a pedagogical critique loop. It is model-agnostic via the `toolCallingLoop`.

### Key Decisions
1. **RAG via local extraction**: Since this is a browser-only app, RAG will be "Small-scale RAG": we extract text from uploaded PDFs in the browser and inject the most relevant sections into the prompt context.
2. **Interactive mode via standard HTML/JS**: Student mode will use standard `<input>` and `<button>` elements styled to match the theme. The "grading" logic will reside in a script tag within the exported HTML.
3. **OpenDyslexic & System Fonts**: To stay zero-ops, accessibility fonts will be loaded locally or via reliable system fallbacks.

### Proposed Changes

#### 1. Pipeline & RAG
- `lib/pipeline/index.ts`: Add `sourceDocuments` to the research phase.
- `lib/authoring.ts`: Update rubric to include difficulty-based vocabulary constraints.

#### 2. UI & Settings
- `components/chat/MessageInput.tsx`: File upload dropzone in the `+` menu.
- `components/chat/StylePickerCard.tsx`: Add Difficulty (3 chips) and Accessibility (Toggle).
- `components/layout/SettingsPanel.tsx`: New "Brand Kit" tab (Logo upload, Accent color picker).

#### 3. Artifact & Preview
- `components/artifact/ArtifactPane.tsx`: "Student Mode" toggle switch.
- `components/WorkbookPreview.tsx`: Interactive state management for `answer-box` inputs.

#### 4. Export Utility
- `lib/export_utils.ts`: `workbookToSCORM()` wrapper.
- `lib/export_utils.ts`: Dynamic Index generator using `target-counter` in Paged.js.

# Testing

### Validation Approach
- **RAG Test**: Upload a custom text file about a niche topic; verify the AI doesn't hallucinate and uses the file's facts.
- **Accessibility Check**: Toggle Dyslexia mode; verify the `font-family` swaps and `line-height` increases in the preview.
- **Grading Test**: Enter a wrong answer in Student Mode; verify the "explanation" correctly identifies the error.
- **SCORM Check**: Export a SCORM package and verify it opens in a standard SCORM player (SCORM Cloud).

# Delivery Steps

### ✓ Step 1: Stage 1: Multi-Tiered Pedagogy & Accessibility Themes
- Extend `StylePrefs` with `difficulty` (Basic/Intermediate/Advanced) and `accessibility` (Standard/Dyslexia-Friendly) fields.
- Update `lib/authoring.ts` to adjust tone, vocabulary, and font-family (e.g. OpenDyslexic) based on these new preferences.
- Add "Standard/Dyslexia-Friendly" toggle to `StylePickerCard`.
- Integrate difficulty selection into the drafting prompts in `lib/pipeline/index.ts`.

### ✓ Step 2: Stage 2: Deep RAG Grounding (Upload Sources)
- Update `MessageInput.tsx` to handle file uploads (PDF/TXT/DOCX) in the `+` menu.
- Store uploaded document context in `Conversation` or `BuildWorkbookArgs`.
- Update the research phase in `lib/pipeline/index.ts` to prioritize user-uploaded sources over general web search when available.
- Implement a "RAG summary" pass that extracts key facts from uploaded documents to ground the workbook generation.

### ✓ Step 3: Stage 3: Interactive Student Mode & Auto-Grading
- Add a "Student Mode" toggle to `ArtifactPane` and `WorkbookPreview`.
- When active, transform `answer-box` and `mc-option` elements into interactive inputs.
- Implement an `Auto-Grade` button that uses the hidden answer keys to provide instant feedback and explanations to the user.
- Add an "Interactive HTML" export option that includes the student mode logic in a standalone file.

### ✓ Step 4: Stage 4: Visual Polish & Professional Brand Kits
- Implement "Bento Grid 2.0" and "F-Pattern" layouts in `lib/authoring.ts` and `lib/types.ts`.
- Update the AI prompts to intelligently assign content to specific grid slots based on importance (e.g. main concept in the large bento box).
- Ensure consistent SVG illustration seeds across a single workbook run to maintain visual identity.
- Add "School/Brand Kit" to Settings, allowing users to upload a logo and primary color that gets injected into the header of every exported page.

### ✓ Step 5: Stage 5: Professional Infrastructure (SCORM/LMS & Indexing)
- Add SCORM 1.2 / xAPI export format in `lib/export_utils.ts` (wrapping the interactive student mode in a standard LMS package).
- Implement a dynamic "Index" page for workbooks >10 pages.
- Add "Teacher copy" vs "Student copy" toggle to the Pro PDF export flow.
- Ensure the pipeline remains "model-agnostic" by wrapping any new complex logic (like RAG or Multi-agent research) in the unified `toolCallingLoop`.