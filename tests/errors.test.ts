import { describe, it, expect } from 'vitest';
import { classifyError, withBackoff } from '../lib/ai/errors';

describe('classifyError', () => {
  it('detects rate_limit from status 429', () => {
    const r = classifyError({ status: 429, message: 'Too Many Requests' });
    expect(r.kind).toBe('rate_limit');
    expect(r.retryable).toBe(true);
  });

  it('detects rate_limit from RESOURCE_EXHAUSTED message', () => {
    expect(classifyError(new Error('RESOURCE_EXHAUSTED quota exceeded')).kind).toBe('rate_limit');
  });

  it('detects auth from status 401', () => {
    expect(classifyError({ status: 401 }).kind).toBe('auth');
  });

  it('detects auth from api key message', () => {
    expect(classifyError(new Error('Invalid API key')).kind).toBe('auth');
  });

  it('detects safety block', () => {
    expect(classifyError(new Error('response blocked by SAFETY settings')).kind).toBe('safety');
  });

  it('detects network errors', () => {
    expect(classifyError(new Error('fetch failed')).kind).toBe('network');
    expect(classifyError({ status: 503 }).kind).toBe('network');
  });

  it('defaults to unknown', () => {
    expect(classifyError(new Error('oops')).kind).toBe('unknown');
  });

  it('handles non-error inputs', () => {
    expect(classifyError(null).kind).toBe('unknown');
    expect(classifyError('simple string').kind).toBe('unknown');
  });
});

describe('withBackoff', () => {
  it('returns result on first success', async () => {
    const result = await withBackoff(async () => 42);
    expect(result).toBe(42);
  });

  it('retries on rate_limit and eventually succeeds', async () => {
    let calls = 0;
    const result = await withBackoff(
      async () => {
        calls++;
        if (calls < 2) throw { status: 429, message: 'rate limit' };
        return 'ok';
      },
      { baseMs: 1 }
    );
    expect(result).toBe('ok');
    expect(calls).toBe(2);
  });

  it('does not retry on auth errors', async () => {
    let calls = 0;
    await expect(
      withBackoff(
        async () => {
          calls++;
          throw { status: 401 };
        },
        { baseMs: 1 }
      )
    ).rejects.toBeTruthy();
    expect(calls).toBe(1);
  });
});
