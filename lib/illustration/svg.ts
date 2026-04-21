import { getProvider } from '@/lib/providers';
import type { Illustrator, IllustrationRequest, IllustrationResult } from './types';

/**
 * Default illustrator — delegates to the active AI provider's `generateSVGIllustration`.
 * Always "available" since it has a mock fallback.
 */
export const svgIllustrator: Illustrator = {
  name: 'svg',
  available() {
    return true;
  },
  async generate(req: IllustrationRequest): Promise<IllustrationResult | null> {
    try {
      const svg = await getProvider().generateSVGIllustration(
        req.title,
        req.description,
        req.style,
        req.palette
      );
      if (!svg) return null;
      return { kind: 'svg', svg };
    } catch (e) {
      console.warn('SVG illustrator failed:', e);
      return null;
    }
  },
};
