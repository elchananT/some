import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

// Use system font stacks via CSS variables to keep the app offline-friendly (no Google Fonts fetch).
const inter = { variable: 'font-sans-var' };
const jetbrainsMono = { variable: 'font-mono-var' };
const serif = { variable: 'font-serif-var' };

export const metadata: Metadata = {
  title: 'EduSpark: AI Workbook Architect',
  description: 'Design professional-grade workbooks with AI research and verification.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${serif.variable}`}>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js" strategy="beforeInteractive" />
        <Script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js" strategy="beforeInteractive" />
        <Script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js" strategy="beforeInteractive" />
      </body>
    </html>
  );
}
