import { describe, it, expect } from 'vitest';
import { runWithConcurrency } from '@/lib/pipeline/concurrency';

describe('runWithConcurrency', () => {
  it('returns [] for empty input without deadlock', async () => {
    const out = await runWithConcurrency([], 3);
    expect(out).toEqual([]);
  });

  it('preserves input order in results', async () => {
    const tasks = [10, 1, 20, 2, 5].map(
      ms => () => new Promise<number>(res => setTimeout(() => res(ms), ms))
    );
    const out = await runWithConcurrency(tasks, 2);
    expect(out).toEqual([10, 1, 20, 2, 5]);
  });

  it('actually caps concurrent in-flight tasks', async () => {
    let inFlight = 0;
    let peak = 0;
    const makeTask = () => async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise(res => setTimeout(res, 20));
      inFlight--;
      return 1;
    };
    const tasks = Array.from({ length: 10 }, makeTask);
    await runWithConcurrency(tasks, 3);
    expect(peak).toBeLessThanOrEqual(3);
    expect(peak).toBeGreaterThan(0);
  });

  it('coerces limit < 1 to 1', async () => {
    const tasks = [1, 2, 3].map(n => async () => n);
    const out = await runWithConcurrency(tasks, 0);
    expect(out).toEqual([1, 2, 3]);
  });

  it('propagates rejections', async () => {
    const tasks = [
      async () => 1,
      async () => {
        throw new Error('boom');
      },
      async () => 3,
    ];
    await expect(runWithConcurrency(tasks, 2)).rejects.toThrow('boom');
  });
});
