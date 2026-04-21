import { NextResponse } from 'next/server';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
});

export async function POST(req: Request) {
  try {
    const { content, title } = await req.json();
    if (!content) return NextResponse.json({ error: 'Content is required' }, { status: 400 });

    const htmlContent = md.render(content);

    // Provide a print-ready HTML template with print CSS
    const finalHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title || 'Workbook'}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Open+Sans:wght@400;600;700&display=swap');
        
        body {
            font-family: 'Open Sans', sans-serif;
            color: #333;
            line-height: 1.6;
            margin: 0;
            padding: 0;
        }
        
        h1, h2, h3, h4 {
            font-family: 'Merriweather', serif;
            color: #111;
        }

        h1 { font-size: 2.5rem; text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-top: 40px;}
        h2 { font-size: 1.8rem; margin-top: 30px; color: #2c3e50; }
        
        p { margin-bottom: 15px; }
        
        /* Print Styles */
        @media print {
            body { 
                margin: 0.5in 0.5in; 
                font-size: 12pt;
                background: white;
            }
            .page-break { page-break-before: always; }
            h1, h2 { page-break-after: avoid; }
            img { max-width: 100% !important; page-break-inside: avoid; }
            @page { margin: 1in; }
        }

        .workbook-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            background: white;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div class="workbook-container">
        ${htmlContent}
    </div>
</body>
</html>
    `;

    return NextResponse.json({ html: finalHtml });
  } catch (error: any) {
    console.error("Typeset Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
