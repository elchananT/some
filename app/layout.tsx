import type { Metadata } from 'next';
import './globals.css';
import 'katex/dist/katex.min.css';

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
      <head />
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
