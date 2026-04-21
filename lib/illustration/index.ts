import { getActiveProviderId } from '@/lib/providers';
import { cacheGet, cacheKey, cachePut } from './cache';
import { imagenIllustrator } from './imagen';
import { pollinationsIllustrator } from './pollinations';
import { svgIllustrator } from './svg';
import type { IllustrationRequest, IllustrationResult, Illustrator } from './types';

/**
 * Provider-aware illustrator strategy:
 *   - Gemini user → try Imagen → Pollinations (if opted in) → SVG fallback
 *   - Others      → Pollinations (if opted in) → SVG fallback
 *
 * Each result is memoized in the LRU cache keyed by provider+style+palette+prompt,
 * so re-generating the same cover is instant.
 */
export function pickIllustrator(): Illustrator[] {
  const providerId = (() => {
    try {
      return getActiveProviderId();
    } catch {
      return 'mock';
    }
  })();
  const chain: Illustrator[] = [];
  if (providerId === 'gemini' && imagenIllustrator.available()) chain.push(imagenIllustrator);
  if (pollinationsIllustrator.available()) chain.push(pollinationsIllustrator);
  chain.push(svgIllustrator);
  return chain;
}

/** Run the illustrator chain with caching. Returns the first successful result. */
export async function illustrate(req: IllustrationRequest): Promise<IllustrationResult | null> {
  const providerId = (() => {
    try {
      return getActiveProviderId();
    } catch {
      return 'mock';
    }
  })();
  const key = cacheKey(providerId, req);
  const hit = cacheGet(key);
  if (hit) return hit;

  for (const ill of pickIllustrator()) {
    const out = await ill.generate(req);
    if (out) {
      cachePut(key, out);
      return out;
    }
  }
  return null;
}

export { cacheGet, cachePut, cacheKey, cacheClear, CACHE_MAX_ENTRIES } from './cache';
export type { IllustrationResult, IllustrationRequest, Illustrator } from './types';
