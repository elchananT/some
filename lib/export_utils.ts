import { Workbook } from './types';

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
  text += `=".=".=".=".=".=".=".=".=".=".=".=".=".=".=".=".=".=".=".=".=".=".=".\n\n`;
  text += `Subject: ${workbook.subject}\n`;
  text += `Level: ${workbook.level}\n`;
  text += `Region: ${workbook.region}\n\n`;

  workbook.pages.forEach((page, index) => {
    text += `----------------------------------------------------------\n`;
    text += `PAGE ${index + 1}: ${page.title.toUpperCase()}\n`;
    text += `TYPE: ${page.type.toUpperCase()}\n`;
    text += `----------------------------------------------------------\n\n`;
    
    const plainContent = page.content.replace(/<[^>]*>?/gm, '');
    text += `${plainContent}\n\n`;
  });

  return text;
}

export function workbookToHTMLStandalone(workbook: Workbook): string {
  const pagesHtml = workbook.pages.map((page, i) => `
    <section class="page" id="page-${i+1}">
      <header>
        <div class="page-number">0${i+1}</div>
        <h1>${page.title}</h1>
        <div class="page-type">${page.type}</div>
      </header>
      <main>
        ${page.content}
        ${page.svgCode ? `<div class="illustration">${page.svgCode}</div>` : ''}
      </main>
      <footer>
        <div class="workbook-meta">${workbook.title} &middot; ${workbook.subject} &middot; ${workbook.level}</div>
        <div class="branding">EduSpark &copy; 2026</div>
      </footer>
    </section>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${workbook.title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Playfair+Display:ital,wght@0,900;1,900&family=JetBrains+Mono&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #d44d29;
            --ink: #1a1a1a;
            --paper: #ffffff;
            --shadow: rgba(0,0,0,0.1);
        }
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            background: #f5f5f5;
            font-family: 'Inter', sans-serif;
            color: var(--ink);
            line-height: 1.6;
        }

        .page {
            width: 210mm;
            min-height: 297mm;
            padding: 25mm;
            margin: 20px auto;
            background: white;
            box-shadow: 0 10px 40px var(--shadow);
            position: relative;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        @media print {
            body { background: white; }
            .page { margin: 0; box-shadow: none; page-break-after: always; }
        }

        header {
            border-bottom: 2px solid var(--ink);
            padding-bottom: 1.5rem;
            margin-bottom: 2rem;
            display: flex;
            align-items: flex-end;
            justify-content: justify-between;
        }

        header h1 {
            font-family: 'Playfair Display', serif;
            font-style: italic;
            font-size: 2.5rem;
            flex: 1;
        }

        .page-number {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.8rem;
            font-weight: 800;
            opacity: 0.3;
            margin-bottom: 0.5rem;
        }

        .page-type {
            text-transform: uppercase;
            font-size: 0.7rem;
            letter-spacing: 0.2em;
            font-weight: 800;
            color: var(--primary);
        }

        main { flex: 1; }
        
        main h2, main h3 {
            font-family: 'Playfair Display', serif;
            margin-top: 2rem;
            margin-bottom: 1rem;
        }

        .illustration {
            margin: 2rem 0;
            padding: 2rem;
            background: #fafafa;
            border-radius: 20px;
            display: flex;
            justify-content: center;
        }

        .illustration svg { max-width: 100%; height: auto; }

        footer {
            margin-top: 3rem;
            border-top: 1px solid #eee;
            padding-top: 1.5rem;
            display: flex;
            justify-content: justify-between;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #ababab;
        }

        .branding { color: var(--ink); }

        /* Typography spacing */
        p { margin-bottom: 1rem; }
        ul, ol { margin-left: 1.5rem; margin-bottom: 1.5rem; }
        li { margin-bottom: 0.5rem; }
    </style>
</head>
<body>
    ${pagesHtml}
</body>
</html>
  `;
}
