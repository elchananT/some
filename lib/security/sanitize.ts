/**
 * Central HTML/SVG sanitizer for all AI-generated content.
 *
 * SECURITY: Every call to `dangerouslySetInnerHTML` / `el.innerHTML = ...`
 * with AI-produced or user-editable content MUST go through one of these
 * helpers. AI output is NOT trusted — prompt-injection via the `fetch_url`
 * research tool can cause the model to emit <script>/on*= payloads that
 * would otherwise run in the same origin as the app and exfiltrate the
 * user's BYOK API keys from localStorage (`eduspark_ai_keys_v1`, etc.).
 */
import DOMPurify from 'dompurify';

// Shared hardening: forbid script-bearing tags/attrs even if a profile allows them.
const FORBID_TAGS = ['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'base', 'form'];
const FORBID_ATTR = ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onanimationend', 'formaction', 'srcdoc'];

function cfg(extra: Record<string, unknown> = {}) {
  return {
    FORBID_TAGS,
    FORBID_ATTR,
    ALLOW_DATA_ATTR: true,
    // Block javascript: and data: (except images) URLs; DOMPurify already
    // blocks javascript:/vbscript:, but be explicit.
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|ftp):|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i,
    ...extra,
  };
}

/** Sanitize AI/user-authored rich HTML (page content, block content). */
export function sanitizeHTML(dirty: string): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, cfg({ USE_PROFILES: { html: true } })) as unknown as string;
}

/** Sanitize an SVG string (AI-generated illustrations). Blocks <script>, foreignObject, event handlers. */
export function sanitizeSVG(dirty: string): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, cfg({
    USE_PROFILES: { svg: true, svgFilters: true },
    // foreignObject can host arbitrary HTML/scripts inside SVG — drop it.
    FORBID_TAGS: [...FORBID_TAGS, 'foreignObject'],
  })) as unknown as string;
}

/**
 * Sanitize a full HTML document (used by the PDF/HTML export pipeline).
 * Keeps <html>/<head>/<body> structure but strips scripts, event handlers,
 * and external references that could run code at print time.
 */
export function sanitizeDocument(dirty: string): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, cfg({
    WHOLE_DOCUMENT: true,
    // Allow <style> in the export document — our themes need it — but
    // scripts/iframes/etc. remain forbidden via FORBID_TAGS override.
    FORBID_TAGS: FORBID_TAGS.filter(t => t !== 'style'),
  })) as unknown as string;
}

/** Sanitize a scoped custom CSS snippet before injecting via <style>. */
export function sanitizeCSS(css: string): string {
  if (!css) return '';
  // Strip anything that could escape the scoped selector or load remote code.
  return css
    .replace(/<\/?\s*style[^>]*>/gi, '')
    .replace(/@import[^;]*;?/gi, '')
    .replace(/expression\s*\(/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/behavior\s*:/gi, '')
    .replace(/url\(\s*["']?\s*(?:javascript|data|vbscript):/gi, 'url(about:blank');
}
