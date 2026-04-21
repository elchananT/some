import { getKey } from '@/lib/ai/keys';
import type { Illustrator, IllustrationRequest, IllustrationResult } from './types';

/**
 * Google Imagen illustrator. Available iff a Gemini API key is configured.
 * Gracefully returns `null` on quota / 403 errors so the caller can fall back.
 */
export const imagenIllustrator: Illustrator = {
  name: 'imagen',
  available() {
    return !!getKey('gemini');
  },
  async generate(req: IllustrationRequest): Promise<IllustrationResult | null> {
    const apiKey = getKey('gemini');
    if (!apiKey) return null;
    const prompt = buildPrompt(req);
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const res = await ai.models.generateImages({
        model: 'imagen-3.0-generate-001',
        prompt,
        config: { numberOfImages: 1 },
      });
      const img = res.generatedImages?.[0]?.image;
      const b64 = img?.imageBytes;
      if (!b64) return null;
      return { kind: 'image', src: `data:image/png;base64,${b64}`, source: 'imagen' };
    } catch (e) {
      console.warn('Imagen generation failed, falling back:', e);
      return null;
    }
  },
};

function buildPrompt(req: IllustrationRequest): string {
  const style = req.style ? `, ${req.style} style` : '';
  const palette = req.palette ? `, palette: ${req.palette}` : '';
  return `Educational cover illustration for "${req.title}". ${req.description}${style}${palette}. Clean, friendly, age-appropriate, print-safe.`;
}
