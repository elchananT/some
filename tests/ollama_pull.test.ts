import { describe, it, expect } from 'vitest';
import { pullModelFromIterable } from '@/lib/providers/ollama_pull';

async function* fakeSource(
  chunks: Array<{ status?: string; total?: number; completed?: number; error?: string }>
) {
  for (const c of chunks) yield c;
}

describe('pullModelFromIterable', () => {
  it('translates byte progress into monotonic 0..100 percent', async () => {
    const src = fakeSource([
      { status: 'pulling manifest' },
      { status: 'downloading', total: 1000, completed: 100 },
      { status: 'downloading', total: 1000, completed: 500 },
      { status: 'downloading', total: 1000, completed: 900 },
      { status: 'verifying sha256' },
      { status: 'success' },
    ]);
    const out = [];
    for await (const ev of pullModelFromIterable(src)) out.push(ev);
    const percents = out.map(o => o.percent);
    expect(percents).toEqual([0, 10, 50, 90, 90, 100]);
    expect(out[out.length - 1].status.toLowerCase()).toBe('success');
  });

  it('clamps non-monotonic regressions', async () => {
    const src = fakeSource([
      { status: 'downloading', total: 100, completed: 60 },
      { status: 'downloading', total: 100, completed: 30 }, // regression
      { status: 'success' },
    ]);
    const out = [];
    for await (const ev of pullModelFromIterable(src)) out.push(ev);
    expect(out.map(o => o.percent)).toEqual([60, 60, 100]);
  });

  it('caps non-success progress at 99%', async () => {
    const src = fakeSource([{ status: 'downloading', total: 100, completed: 100 }]);
    const out = [];
    for await (const ev of pullModelFromIterable(src)) out.push(ev);
    expect(out[0].percent).toBe(99);
  });

  it('throws on error chunk', async () => {
    const src = fakeSource([{ status: 'downloading', total: 100, completed: 10 }, { error: 'boom' }]);
    await expect(async () => {
      for await (const _ of pullModelFromIterable(src)) {
        // drain
      }
    }).rejects.toThrow('boom');
  });

  it('handles empty source without error', async () => {
    const out = [];
    for await (const ev of pullModelFromIterable(fakeSource([]))) out.push(ev);
    expect(out).toEqual([]);
  });
});
