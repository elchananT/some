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

export function classifyError(e: unknown): ClassifiedError {
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

  // Rate-limit
  if (
    status === 429 ||
    lower.includes('rate limit') ||
    lower.includes('rate_limit') ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota')
  ) {
    return {
      kind: 'rate_limit',
      userMessage: 'Rate limit reached. Retrying in a moment…',
      retryable: true,
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
    lower.includes('invalid_argument') && lower.includes('key')
  ) {
    return {
      kind: 'auth',
      userMessage:
        'Authentication failed. Check your API key in Settings and try again.',
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

/** Exponential backoff helper: 200ms → 600ms → 1800ms (3 retries max by default). */
export async function withBackoff<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseMs?: number; shouldRetry?: (e: unknown) => boolean } = {}
): Promise<T> {
  const retries = opts.retries ?? 3;
  const base = opts.baseMs ?? 200;
  const shouldRetry =
    opts.shouldRetry ??
    ((e: unknown) => {
      const k = classifyError(e).kind;
      return k === 'rate_limit' || k === 'network';
    });

  let lastErr: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt === retries - 1 || !shouldRetry(e)) throw e;
      const delay = base * Math.pow(3, attempt); // 200, 600, 1800
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw lastErr;
}
