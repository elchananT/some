import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";
import { Workbook } from './types';

export async function exportToPDF(containerId: string, filename: string) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pages = container.querySelectorAll('.workbook-page');
  
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i] as HTMLElement;
    const canvas = await html2canvas(page, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210; // A4 width
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
  }
  
  pdf.save(filename);
}

export async function exportToDocx(workbook: Workbook) {
  const doc = new Document({
    sections: workbook.pages.map((page, index) => {
      // Stripping HTML tags simply for docx export, for a more robust solution we'd use a parser
      const cleanContent = page.content.replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').split('\n').filter(p => p.trim() !== '');
      
      const children = [
        new Paragraph({
          text: page.title,
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({ text: "" }), // Space
        ...cleanContent.map(text => new Paragraph({
          children: [new TextRun(text)]
        }))
      ];

      return {
        properties: {
           page: {
              pageNumbers: { start: index + 1 }
           }
        },
        children
      };
    })
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${workbook.title.replace(/\s+/g, '_')}_Workbook.docx`);
}
