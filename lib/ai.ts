import { Workbook, StylePrefs } from './types';
import { getProvider } from './providers';
import { illustrate } from './illustration';
import type { IllustrationResult } from './illustration/types';

/**
 * Thin facade over the active AI provider (mock | gemini | ollama).
 * Kept as named exports to preserve backwards compatibility with code and
 * tests that import from `@/lib/ai`.
 */

export async function generateContentPage(
  title: string,
  objective: string,
  type: string,
  context: string,
  stylePrefs?: StylePrefs
): Promise<string> {
  try {
    return await getProvider().generateContentPage(title, objective, type, context, stylePrefs);
  } catch (e: any) {
    console.error('generateContentPage error:', e);
    return `<div><h2>${title}</h2><p>Content unavailable (${e?.message || e}).</p></div>`;
  }
}

export async function generateSVGIllustration(
  title: string,
  description: string,
  style: string = 'minimalist',
  palette: string = 'black and white'
): Promise<string> {
  try {
    return await getProvider().generateSVGIllustration(title, description, style, palette);
  } catch (e) {
    console.error('generateSVGIllustration error:', e);
    return '';
  }
}

/**
 * Preferred illustration entry point (as of Stage 5): delegates to the
 * illustration subsystem with Imagen → Pollinations → SVG fallback + LRU cache.
 * Returns either an inline SVG string or a remote / data-URL image source.
 */
export async function generateIllustration(
  title: string,
  description: string,
  style: string = 'minimalist',
  palette: string = 'black and white'
): Promise<IllustrationResult | null> {
  try {
    return await illustrate({ title, description, style, palette });
  } catch (e) {
    console.error('generateIllustration error:', e);
    return null;
  }
}

export async function verifyWorkbook(workbook: Workbook): Promise<string> {
  try {
    return await getProvider().verifyWorkbook(workbook);
  } catch (e: any) {
    console.error('verifyWorkbook error:', e);
    return `Verification failed: ${e?.message || e}`;
  }
}
