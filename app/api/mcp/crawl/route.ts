import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    if (!response.ok) {
        return NextResponse.json({ error: `Failed to fetch URL: ${response.status} ${response.statusText}` }, { status: 500 });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove script, style, and nav elements to clean up text
    $('script, style, nav, footer, header, iframe, noscript').remove();
    
    // Extract text and condense whitespace
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    
    // Limit to ~20000 characters to prevent context overload
    const truncatedText = text.substring(0, 20000);

    return NextResponse.json({ text: truncatedText });
  } catch (error: any) {
    console.error("Crawler Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
