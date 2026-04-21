import { Workbook, StylePrefs } from './types';
import { PRINT_THEMES_CSS, DENSITY_CSS_ALL, getPrintTheme } from './generation/print_themes';

export function workbookToMarkdown(workbook: Workbook): string {
  let md = `# ${workbook.title}\n\n`;
  md += `**Subject:** ${workbook.subject}\n`;
  md += `**Level:** ${workbook.level}\n`;
  md += `**Region:** ${workbook.region}\n\n`;

  if (workbook.outline) {
    md += `## Outline\n${workbook.outline}\n\n`;
  }

  workbook.pages.forEach((page, index) => {
    md += `--- \n\n`;
    md += `## Page ${index + 1}: ${page.title}\n`;
    md += `**Type:** ${page.type}\n\n`;
    md += `${page.content}\n\n`;
  });

  if (workbook.verificationReport) {
    md += `## Verification Report\n${workbook.verificationReport}\n`;
  }

  return md;
}

export function workbookToText(workbook: Workbook): string {
  let text = `${workbook.title.toUpperCase()}\n`;
  text += `${'='.repeat(60)}\n\n`;
  text += `Subject: ${workbook.subject}\n`;
  text += `Level: ${workbook.level}\n`;
  text += `Region: ${workbook.region}\n\n`;

  workbook.pages.forEach((page, index) => {
    text += `${'-'.repeat(60)}\n`;
    text += `PAGE ${index + 1}: ${page.title.toUpperCase()}\n`;
    text += `TYPE: ${page.type.toUpperCase()}\n`;
    text += `${'-'.repeat(60)}\n\n`;

    const plainContent = page.content.replace(/<[^>]*>?/gm, '');
    text += `${plainContent}\n\n`;
  });

  return text;
}

/**
 * Shared print CSS used by the standalone HTML export and the PDF export.
 * Uses ONLY system fonts so it works offline and in html2pdf/html2canvas
 * headless rendering (no external network fetch for fonts).
 *
 * Each `.page` is a fixed A4 block (210mm x 297mm) with `page-break-after:always`,
 * so html2pdf.js + the `pagebreak.mode: ['css','legacy']` option produces
 * one PDF page per workbook page.
 */
const PRINT_CSS = `
  :root {
    --primary: #CC785C;
    --ink: #1F1F1C;
    --muted: #7A756B;
    --paper: #ffffff;
    --rule: #E8E4DC;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  html, body {
    background: #f3f1ec;
    font-family: Georgia, 'Times New Roman', 'Iowan Old Style', serif;
    color: var(--ink);
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    width: 210mm;
    height: 297mm;
    padding: 20mm 22mm;
    margin: 16px auto;
    background: var(--paper);
    box-shadow: 0 10px 40px rgba(0,0,0,0.08);
    position: relative;
    display: block;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
  }
  .page:last-child { page-break-after: auto; break-after: auto; }

  @page { size: A4; margin: 0; }

  @media print {
    html, body { background: #fff; }
    .page { margin: 0; box-shadow: none; }
  }

  .page-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 2px solid var(--ink);
    padding-bottom: 12mm;
    margin-bottom: 10mm;
  }
  .page-header h1 {
    font-family: Georgia, 'Times New Roman', serif;
    font-style: italic;
    font-weight: 700;
    font-size: 32pt;
    line-height: 1.15;
    flex: 1;
    color: var(--ink);
  }
  .page-number {
    font-family: 'SFMono-Regular', Menlo, Consolas, monospace;
    font-size: 10pt;
    font-weight: 700;
    color: var(--muted);
    letter-spacing: 0.1em;
  }
  .page-type {
    text-transform: uppercase;
    font-size: 9pt;
    letter-spacing: 0.22em;
    font-weight: 700;
    color: var(--primary);
    white-space: nowrap;
  }

  .page-body {
    font-size: 11pt;
    line-height: 1.65;
    color: var(--ink);
  }
  .page-body p { margin: 0 0 10pt; }
  .page-body h2 {
    font-family: Georgia, serif;
    font-size: 18pt;
    margin: 14pt 0 8pt;
    color: var(--ink);
  }
  .page-body h3 {
    font-family: Georgia, serif;
    font-size: 14pt;
    margin: 12pt 0 6pt;
    color: var(--ink);
  }
  .page-body ul, .page-body ol { margin: 0 0 10pt 22pt; }
  .page-body li { margin-bottom: 4pt; }
  .page-body strong { color: var(--ink); font-weight: 700; }
  .page-body em { color: var(--ink); }
  .page-body code {
    font-family: 'SFMono-Regular', Menlo, Consolas, monospace;
    font-size: 10pt;
    background: #f3f1ec;
    padding: 1pt 4pt;
    border-radius: 3px;
  }
  .page-body pre {
    background: #f3f1ec;
    padding: 10pt;
    border-radius: 6px;
    margin: 10pt 0;
    font-family: 'SFMono-Regular', Menlo, Consolas, monospace;
    font-size: 9.5pt;
    line-height: 1.45;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .page-body blockquote {
    border-left: 3px solid var(--primary);
    padding: 2pt 0 2pt 12pt;
    margin: 10pt 0;
    color: var(--muted);
    font-style: italic;
  }
  .page-body img { max-width: 100%; height: auto; }

  .illustration {
    margin: 14pt 0;
    padding: 12pt;
    background: #fafaf8;
    border: 1px solid var(--rule);
    border-radius: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .illustration svg { max-width: 100%; max-height: 180pt; height: auto; }

  .page-footer {
    position: absolute;
    left: 22mm;
    right: 22mm;
    bottom: 12mm;
    border-top: 1px solid var(--rule);
    padding-top: 8pt;
    display: flex;
    justify-content: space-between;
    gap: 12pt;
    font-size: 8pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--muted);
  }
  .page-footer .branding { color: var(--ink); }
`.trim();

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderPageSection(
  workbook: Workbook,
  page: Workbook['pages'][number],
  index: number,
): string {
  const pageNum = String(index + 1).padStart(2, '0');
  return `
    <section class="page" id="page-${index + 1}">
      <header class="page-header">
        <div style="display:flex;flex-direction:column;gap:4pt;flex:1;">
          <div class="page-number">${pageNum}</div>
          <h1>${escapeHtml(page.title)}</h1>
        </div>
        <div class="page-type">${escapeHtml(page.type)}</div>
      </header>
      <main class="page-body">
        ${page.content || ''}
        ${page.svgCode ? `<div class="illustration">${page.svgCode}</div>` : ''}
      </main>
      <footer class="page-footer">
        <div class="workbook-meta">${escapeHtml(workbook.title)} &middot; ${escapeHtml(workbook.subject)} &middot; ${escapeHtml(workbook.level)}</div>
        <div class="branding">EduSpark &copy; 2026</div>
      </footer>
    </section>`;
}

/**
 * Renders ONE workbook page as its own self-contained HTML document.
 * Useful when the user wants a per-page HTML export.
 */
export function pageToHTMLStandalone(
  workbook: Workbook,
  pageIndex: number,
): string {
  const page = workbook.pages[pageIndex];
  if (!page) return '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(workbook.title)} — ${escapeHtml(page.title)}</title>
<style>${PRINT_CSS}
${PRINT_THEMES_CSS}
${DENSITY_CSS_ALL}</style>
</head>
<body class="${bodyClassesFor(workbook.stylePrefs)}">
${renderPageSection(workbook, page, pageIndex)}
</body>
</html>`;
}

function bodyClassesFor(prefs?: StylePrefs): string {
  const theme = getPrintTheme(prefs?.theme);
  const density = prefs?.density ?? 'balanced';
  return `theme-${theme.id} density-${density}`;
}

/**
 * Renders the whole workbook as one HTML document, with every page as its
 * own A4 `.page` block and an explicit CSS page-break between them.
 * Shared by the HTML export and the PDF export.
 *
 * If `workbook.stylePrefs` is set, the matching theme + density classes are
 * applied on `<body>` so the 6 locked print themes in
 * `lib/generation/print_themes.ts` take effect.
 */
export function workbookToHTMLStandalone(workbook: Workbook): string {
  const pagesHtml = workbook.pages
    .map((page, i) => renderPageSection(workbook, page, i))
    .join('\n');

  const bodyClass = bodyClassesFor(workbook.stylePrefs);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(workbook.title)}</title>
<style>${PRINT_CSS}
${PRINT_THEMES_CSS}
${DENSITY_CSS_ALL}</style>
</head>
<body class="${bodyClass}">
${pagesHtml}
</body>
</html>`;
}
