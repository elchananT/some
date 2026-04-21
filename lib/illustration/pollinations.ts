import { readCreds } from '@/lib/ai/keys';
import type { Illustrator, IllustrationRequest, IllustrationResult } from './types';

/**
 * Pollinations.ai — zero-auth image generation via URL.
 * Requires explicit user consent (prompts leave the machine).
 */
export const pollinationsIllustrator: Illustrator = {
  name: 'pollinations',
  available() {
    return !!readCreds().consent?.pollinations;
  },
  async generate(req: IllustrationRequest): Promise<IllustrationResult | null> {
    if (!readCreds().consent?.pollinations) return null;
    const style = req.style ? `, ${req.style} style` : '';
    const palette = req.palette ? `, palette: ${req.palette}` : '';
    const prompt = `Educational cover illustration for "${req.title}". ${req.description}${style}${palette}. Clean, friendly, print-safe.`;
    const src = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      prompt
    )}?width=1024&height=768&nologo=true`;
    return { kind: 'image', src, source: 'pollinations' };
  },
};
