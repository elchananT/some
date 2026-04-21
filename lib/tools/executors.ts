/**
 * Executors for the 8 in-app AI tools. All run in the browser; any tool that needs
 * a third-party API reads its key from `lib/tools/keys.ts` (BYOK — localStorage only).
 *
 * Tools deliberately return a compact string `content` for the LLM plus optional
 * structured `data` (e.g. inline SVG) for downstream rendering.
 */
import { readToolKeys } from './keys';
import type { ToolResult } from './types';

const TIMEOUT_MS = 20_000;

async function fetchWithTimeout(url: string, init?: RequestInit, ms = TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...(init ?? {}), signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function truncate(s: string, max = 4000): string {
  return s.length > max ? s.slice(0, max) + '…[truncated]' : s;
}

/** Web search via Tavily (BYOK). */
export async function webSearch(args: Record<string, unknown>): Promise<ToolResult> {
  const query = String(args.query ?? '').trim();
  const max = Math.min(Number(args.max_results ?? 5), 10);
  if (!query) return { ok: false, content: '', error: 'query is required' };
  const key = readToolKeys().tavily;
  if (!key) return { ok: false, content: '', error: 'Tavily API key not set. Add it in Settings → Tools.' };
  try {
    const res = await fetchWithTimeout('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: key, query, max_results: max, search_depth: 'basic' }),
    });
    if (!res.ok) return { ok: false, content: '', error: `Tavily ${res.status}` };
    const json = (await res.json()) as { results?: Array<{ title: string; url: string; content: string }> };
    const lines = (json.results ?? []).map(
      (r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${truncate(r.content ?? '', 400)}`
    );
    return { ok: true, content: truncate(lines.join('\n\n') || '(no results)'), data: json.results };
  } catch (e) {
    return { ok: false, content: '', error: (e as Error).message };
  }
}

/** Fetch a URL and return its readable text. */
export async function fetchUrl(args: Record<string, unknown>): Promise<ToolResult> {
  const url = String(args.url ?? '').trim();
  if (!url) return { ok: false, content: '', error: 'url is required' };
  try {
    // r.jina.ai is a free, public HTML-to-Markdown proxy that dodges CORS for reading public pages.
    const proxied = `https://r.jina.ai/${url}`;
    const res = await fetchWithTimeout(proxied);
    if (!res.ok) return { ok: false, content: '', error: `fetch ${res.status}` };
    const text = await res.text();
    return { ok: true, content: truncate(text, 8000) };
  } catch (e) {
    return { ok: false, content: '', error: (e as Error).message };
  }
}

/** Wikipedia OpenSearch. */
export async function wikiSearch(args: Record<string, unknown>): Promise<ToolResult> {
  const query = String(args.query ?? '').trim();
  if (!query) return { ok: false, content: '', error: 'query is required' };
  try {
    const res = await fetchWithTimeout(
      `https://en.wikipedia.org/w/api.php?action=opensearch&format=json&origin=*&limit=8&search=${encodeURIComponent(query)}`
    );
    if (!res.ok) return { ok: false, content: '', error: `wiki ${res.status}` };
    const [, titles, descs, urls] = (await res.json()) as [string, string[], string[], string[]];
    const lines = titles.map((t, i) => `- ${t}: ${descs[i] ?? ''}\n  ${urls[i] ?? ''}`);
    return { ok: true, content: lines.join('\n') || '(no results)', data: { titles, urls } };
  } catch (e) {
    return { ok: false, content: '', error: (e as Error).message };
  }
}

/** Wikipedia page summary. */
export async function wikiGet(args: Record<string, unknown>): Promise<ToolResult> {
  const title = String(args.title ?? '').trim();
  if (!title) return { ok: false, content: '', error: 'title is required' };
  try {
    const res = await fetchWithTimeout(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    );
    if (!res.ok) return { ok: false, content: '', error: `wiki ${res.status}` };
    const json = (await res.json()) as { title?: string; extract?: string; content_urls?: { desktop?: { page?: string } } };
    const body = `${json.title ?? title}\n\n${json.extract ?? ''}\n\n${json.content_urls?.desktop?.page ?? ''}`;
    return { ok: true, content: truncate(body, 4000), data: json };
  } catch (e) {
    return { ok: false, content: '', error: (e as Error).message };
  }
}

/** Wolfram Alpha Short Answers API (BYOK App ID). */
export async function wolframQuery(args: Record<string, unknown>): Promise<ToolResult> {
  const query = String(args.query ?? '').trim();
  if (!query) return { ok: false, content: '', error: 'query is required' };
  const appId = readToolKeys().wolfram;
  if (!appId) return { ok: false, content: '', error: 'Wolfram App ID not set. Add it in Settings → Tools.' };
  try {
    const res = await fetchWithTimeout(
      `https://api.wolframalpha.com/v1/result?appid=${encodeURIComponent(appId)}&i=${encodeURIComponent(query)}`
    );
    const text = await res.text();
    if (!res.ok) return { ok: false, content: '', error: `wolfram ${res.status}: ${text.slice(0, 120)}` };
    return { ok: true, content: text };
  } catch (e) {
    return { ok: false, content: '', error: (e as Error).message };
  }
}

/** Render LaTeX math to print-safe HTML via KaTeX (lazy loaded). */
export async function renderMath(args: Record<string, unknown>): Promise<ToolResult> {
  const latex = String(args.latex ?? '').trim();
  const display = Boolean(args.display ?? false);
  if (!latex) return { ok: false, content: '', error: 'latex is required' };
  try {
    const katex = (await import('katex')).default;
    const html = katex.renderToString(latex, { displayMode: display, throwOnError: false, output: 'html' });
    return { ok: true, content: html, data: { html, displayMode: display } };
  } catch (e) {
    return { ok: false, content: '', error: (e as Error).message };
  }
}

/** Render a Mermaid diagram to inline SVG (lazy loaded). */
export async function renderDiagram(args: Record<string, unknown>): Promise<ToolResult> {
  const code = String(args.code ?? '').trim();
  if (!code) return { ok: false, content: '', error: 'code is required' };
  try {
    const mermaid = (await import('mermaid')).default;
    mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'strict' });
    const id = `mmd-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const { svg } = await mermaid.render(id, code);
    return { ok: true, content: svg, data: { svg } };
  } catch (e) {
    return { ok: false, content: '', error: (e as Error).message };
  }
}

/** Unsplash image search (BYOK Access Key). */
export async function imageSearch(args: Record<string, unknown>): Promise<ToolResult> {
  const query = String(args.query ?? '').trim();
  const per = Math.min(Number(args.per_page ?? 5), 10);
  if (!query) return { ok: false, content: '', error: 'query is required' };
  const key = readToolKeys().unsplash;
  if (!key) return { ok: false, content: '', error: 'Unsplash Access Key not set. Add it in Settings → Tools.' };
  try {
    const res = await fetchWithTimeout(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${per}`,
      { headers: { Authorization: `Client-ID ${key}` } }
    );
    if (!res.ok) return { ok: false, content: '', error: `unsplash ${res.status}` };
    const json = (await res.json()) as {
      results?: Array<{ urls: { regular: string; small: string }; alt_description?: string; user: { name: string }; links: { html: string } }>;
    };
    const lines = (json.results ?? []).map(
      (r, i) =>
        `[${i + 1}] ${r.alt_description ?? query} — by ${r.user.name}\n  img: ${r.urls.regular}\n  credit: ${r.links.html}`
    );
    return { ok: true, content: lines.join('\n\n') || '(no results)', data: json.results };
  } catch (e) {
    return { ok: false, content: '', error: (e as Error).message };
  }
}

/** YouTube transcript via a public, no-auth bridge. The YouTube Data API key is
 * used here only as a soft throttle signal — the transcript is fetched via
 * `youtubetranscript.com` which does not require a key. If the user provided a
 * key, we include the video title via the Data API for extra context. */
export async function ytTranscript(args: Record<string, unknown>): Promise<ToolResult> {
  const raw = String(args.url ?? args.video_id ?? '').trim();
  if (!raw) return { ok: false, content: '', error: 'url or video_id is required' };
  const m = raw.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/) ?? [null, raw.length === 11 ? raw : null];
  const id = m[1];
  if (!id) return { ok: false, content: '', error: 'could not parse video id' };
  try {
    let title = '';
    const apiKey = readToolKeys().youtube;
    if (apiKey) {
      try {
        const meta = await fetchWithTimeout(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${id}&key=${apiKey}`
        );
        if (meta.ok) {
          const mj = (await meta.json()) as { items?: Array<{ snippet?: { title?: string } }> };
          title = mj.items?.[0]?.snippet?.title ?? '';
        }
      } catch {
        // non-fatal
      }
    }
    const res = await fetchWithTimeout(`https://youtubetranscript.com/?server_vid2=${id}`);
    if (!res.ok) return { ok: false, content: '', error: `transcript ${res.status}` };
    const xml = await res.text();
    const text = xml
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
    const header = title ? `Title: ${title}\n\n` : '';
    return { ok: true, content: truncate(header + text, 8000), data: { id, title } };
  } catch (e) {
    return { ok: false, content: '', error: (e as Error).message };
  }
}
