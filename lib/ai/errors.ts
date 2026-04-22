/**
 * Central AI error classifier. Maps unknown thrown objects into a typed, user-friendly
 * error shape used by provider streams and the UI.
 */

export type AIErrorKind = 'network' | 'rate_limit' | 'auth' | 'safety' | 'unknown';

export interface ClassifiedError {
  kind: AIErrorKind;
  userMessage: string;
  retryable: boolean;
  originalMessage?: string;
}

function toMessage(e: unknown): string {
  if (!e) return '';
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message;
  try {
    const anyE = e as { message?: unknown; toString?: () => string };
    if (typeof anyE.message === 'string') return anyE.message;
    return String(e);
  } catch {
    return '';
  }
}

function statusOf(e: unknown): number | undefined {
  if (!e || typeof e !== 'object') return undefined;
  const r = e as { status?: unknown; statusCode?: unknown; code?: unknown };
  const raw = r.status ?? r.statusCode ?? r.code;
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  return Number.isFinite(n) ? (n as number) : undefined;
}

/**
 * Extract a server-suggested retry delay (in ms) from common error shapes:
 *  - HTTP `Retry-After` header (seconds or HTTP-date) on `error.headers`
 *  - Gemini's `error.error.details[].retryDelay` (e.g. "27s")
 *  - Anthropic / OpenAI SDK `error.headers['retry-after']`
 * Returns `undefined` if nothing found.
 */
export function retryAfterMsOf(e: unknown): number | undefined {
  if (!e || typeof e !== 'object') return undefined;
  const any = e as Record<string, unknown>;

  // Headers-based (fetch Response / SDK wrappers)
  const headersRaw = (any.headers ?? (any.response as Record<string, unknown> | undefined)?.headers) as
    | Record<string, string>
    | Headers
    | undefined;
  const readHeader = (name: string): string | undefined => {
    if (!headersRaw) return undefined;
    if (typeof (headersRaw as Headers).get === 'function') {
      const v = (headersRaw as Headers).get(name);
      return v ?? undefined;
    }
    const rec = headersRaw as Record<string, string>;
    return rec[name] ?? rec[name.toLowerCase()];
  };
  const ra = readHeader('retry-after') ?? readHeader('Retry-After');
  if (ra) {
    const secs = Number(ra);
    if (Number.isFinite(secs)) return Math.max(0, Math.floor(secs * 1000));
    const when = Date.parse(ra);
    if (Number.isFinite(when)) return Math.max(0, when - Date.now());
  }

  // Gemini-shape: { error: { details: [ { '@type': '...RetryInfo', retryDelay: '27s' } ] } }
  const details = ((any.error as Record<string, unknown> | undefined)?.details ??
    (any as { details?: unknown }).details) as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(details)) {
    for (const d of details) {
      const rd = d?.retryDelay;
      if (typeof rd === 'string') {
        const m = rd.match(/^(\d+(?:\.\d+)?)s$/);
        if (m) return Math.max(0, Math.floor(Number(m[1]) * 1000));
      }
    }
  }

  // Fall back to scanning the message for "... retry in 27s"
  const msg = toMessage(e);
  const m = msg.match(/retry(?:\s*(?:in|after))?\s*[:=]?\s*(\d+(?:\.\d+)?)\s*s(?:econd)?s?/i);
  if (m) return Math.max(0, Math.floor(Number(m[1]) * 1000));

  return undefined;
}

export function classifyError(e: unknown): ClassifiedError {
  console.error('[AI_ERROR]', e);
  const msg = toMessage(e);
  const lower = msg.toLowerCase();
  const status = statusOf(e);

  // Safety / content-block
  if (
    lower.includes('safety') ||
    lower.includes('blocked') ||
    lower.includes('harm_category') ||
    lower.includes('content filter') ||
    lower.includes('content_filter')
  ) {
    return {
      kind: 'safety',
      userMessage:
        'That request was blocked for safety reasons. Please rephrase and try again.',
      retryable: false,
      originalMessage: msg,
    };
  }

  // Rate-limit (429 is always a rate limit)
  if (
    status === 429 ||
    lower.includes('rate limit') ||
    lower.includes('rate_limit') ||
    lower.includes('resource_exhausted')
  ) {
    const hintMs = retryAfterMsOf(e);
    const hint =
      hintMs !== undefined
        ? ` Retrying in ~${Math.max(1, Math.ceil(hintMs / 1000))}s…`
        : ' Retrying in a moment…';
    return {
      kind: 'rate_limit',
      userMessage:
        `Your provider rate-limited this request (API Error: ${msg}).` +
        hint +
        ' If this keeps happening, slow down, switch model in the composer, or add another API key in Settings.',
      retryable: true,
      originalMessage: msg,
    };
  }

  // Quota exceeded (can be 403 or 429)
  if (lower.includes('quota')) {
    const isHard =
      status === 403 ||
      lower.includes('daily') ||
      lower.includes('monthly') ||
      lower.includes('total') ||
      lower.includes('project') ||
      lower.includes('not enabled') ||
      lower.includes('disabled');

    const kind: AIErrorKind = isHard ? 'auth' : 'rate_limit';
    let userMessage = '';

    if (lower.includes('not enabled') || lower.includes('disabled')) {
      userMessage = `API not enabled for this project. Please enable the Generative AI API in your Google Cloud or AI Studio dashboard. Error: ${msg}`;
    } else if (isHard) {
      userMessage = `Quota exceeded (Daily/Total). This API key is out of units for today. If this is a new key, check if billing or the specific model is enabled. Error: ${msg}`;
    } else {
      userMessage = `Rate limit hit (Quota per minute). Retrying... (API Error: ${msg})`;
    }

    return {
      kind,
      userMessage,
      retryable: !isHard,
      originalMessage: msg,
    };
  }

  // Specific "Model not found" handling
  if (lower.includes('not found') || lower.includes('not_found') || lower.includes('model') && lower.includes('exist')) {
    return {
      kind: 'unknown',
      userMessage: `The selected model (${msg}) is not available for your API key. Try switching to a stable model like Gemini 1.5 Flash in the composer or settings.`,
      retryable: false,
      originalMessage: msg,
    };
  }

  // Auth
  if (
    status === 401 ||
    status === 403 ||
    lower.includes('api key') ||
    lower.includes('unauthorized') ||
    lower.includes('forbidden') ||
    lower.includes('permission') ||
    (lower.includes('invalid_argument') && lower.includes('key'))
  ) {
    return {
      kind: 'auth',
      userMessage:
        `Authentication failed (API Error: ${msg}). Check your API key in Settings and try again.`,
      retryable: false,
      originalMessage: msg,
    };
  }

  // Network
  if (
    lower.includes('fetch failed') ||
    lower.includes('network') ||
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    (typeof status === 'number' && status >= 500 && status < 600)
  ) {
    return {
      kind: 'network',
      userMessage: 'Network hiccup. Retrying…',
      retryable: true,
      originalMessage: msg,
    };
  }

  return {
    kind: 'unknown',
    userMessage: msg ? `Something went wrong: ${msg}` : 'Something went wrong. Please try again.',
    retryable: false,
    originalMessage: msg,
  };
}

/**
 * Exponential backoff that honors server-suggested retry delays.
 *
 * Why this matters: Gemini's free tier returns 429 with a `retryDelay: "27s"`
 * payload — retrying after 200ms just burns quota and reliably produces
 * "rate limit after one request" UX. We now:
 *   - honor `Retry-After` / Gemini's `retryDelay` when present,
 *   - otherwise use a rate-limit-aware backoff (4s → 16s → 64s),
 *   - use a shorter ladder (0.5s → 2s → 8s) for transient network errors.
 */
export async function withBackoff<T>(
  fn: (attempt: number) => Promise<T>,
  opts: { retries?: number; baseMs?: number; shouldRetry?: (e: unknown) => boolean } = {}
): Promise<T> {
  const retries = opts.retries ?? 3;
  const shouldRetry =
    opts.shouldRetry ??
    ((e: unknown) => {
      const k = classifyError(e).kind;
      return k === 'rate_limit' || k === 'network';
    });

  let lastErr: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (e) {
      lastErr = e;
      if (attempt === retries - 1 || !shouldRetry(e)) throw e;

      const kind = classifyError(e).kind;
      const serverSuggested = retryAfterMsOf(e);

      let delay: number;
      if (serverSuggested !== undefined) {
        // Always respect the server; clamp to a sane max so a stuck key can't freeze the UI.
        delay = Math.min(serverSuggested + 250, 90_000);
      } else if (kind === 'rate_limit') {
        // 4s, 16s, 64s (free-tier Gemini's per-minute window)
        const base = opts.baseMs ?? 4_000;
        delay = base * Math.pow(4, attempt);
      } else {
        // Network: 0.5s, 2s, 8s
        const base = opts.baseMs ?? 500;
        delay = base * Math.pow(4, attempt);
      }
      // Add light jitter to avoid thundering-herd when multiple pages are drafted in parallel.
      delay += Math.floor(Math.random() * 250);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw lastErr;
}
