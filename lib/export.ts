import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { Workbook } from './types';
import { workbookToHTMLStandalone } from './export_utils';
import { sanitizeDocument, sanitizeHTML } from './security/sanitize';

/**
 * Exports the workbook to a PDF by rendering the same standalone HTML that
 * the "Export HTML" button produces (system fonts, fixed A4 pages, explicit
 * page-breaks). This replaces the older html2canvas-of-the-editor approach,
 * which collapsed everything into a small image and looked terrible.
 *
 * Legacy signature is preserved: callers that passed `(containerId, filename)`
 * can now pass `(workbook, filename)` instead. For the legacy call site we
 * also fall back to a `window.__eduspark_export_workbook` handoff so
 * `WorkbookPreview.tsx` keeps working without refactor.
 */
export async function exportToPDF(
  containerIdOrWorkbook: string | Workbook,
  filename: string,
): Promise<void> {
  let workbook: Workbook | undefined;

  if (typeof containerIdOrWorkbook === 'string') {
    workbook =
      typeof window !== 'undefined'
        ? (window as unknown as { __eduspark_export_workbook?: Workbook })
            .__eduspark_export_workbook
        : undefined;
    if (!workbook) {
      // Fallback: print the live container via the browser's print dialog.
      const container = document.getElementById(containerIdOrWorkbook);
      if (!container) return;
      const printWin = window.open('', '_blank');
      if (!printWin) return;
      // SECURITY: container.innerHTML can contain AI-authored markup — sanitize
      // before writing into a same-origin window that would otherwise execute
      // any injected <script>/on*= and steal BYOK keys from localStorage.
      const safeTitle = String(filename).replace(/[<>&"]/g, '');
      const safeBody = sanitizeHTML(container.innerHTML);
      printWin.document.write(
        `<html><head><title>${safeTitle}</title></head><body>${safeBody}</body></html>`,
      );
      printWin.document.close();
      printWin.focus();
      printWin.print();
      return;
    }
  } else {
    workbook = containerIdOrWorkbook;
  }

  type Html2Pdf = () => {
    set: (o: unknown) => {
      from: (el: HTMLElement) => { save: () => Promise<void> };
    };
  };
  const mod = (await import('html2pdf.js')) as unknown as {
    default?: Html2Pdf;
  };
  const html2pdf: Html2Pdf = mod.default ?? (mod as unknown as Html2Pdf);

  const html = sanitizeDocument(workbookToHTMLStandalone(workbook));
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.width = '210mm';
  host.style.background = '#ffffff';
  host.innerHTML = html;
  document.body.appendChild(host);

  try {
    await html2pdf()
      .set({
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          windowWidth: 794, // 210mm @ 96dpi
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], before: '.page' },
      })
      .from(host)
      .save();
  } finally {
    host.remove();
  }
}

export async function exportToDocx(workbook: Workbook) {
  const doc = new Document({
    sections: workbook.pages.map((page, index) => {
      const cleanContent = page.content
        .replace(/<[^>]+>/g, '\n')
        .replace(/&nbsp;/g, ' ')
        .split('\n')
        .filter(p => p.trim() !== '');

      const children = [
        new Paragraph({ text: page.title, heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: '' }),
        ...cleanContent.map(text => new Paragraph({ children: [new TextRun(text)] })),
      ];

      return {
        properties: { page: { pageNumbers: { start: index + 1 } } },
        children,
      };
    }),
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${workbook.title.replace(/\s+/g, '_')}_Workbook.docx`);
}
