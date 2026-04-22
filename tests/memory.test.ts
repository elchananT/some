import { describe, it, expect, vi } from 'vitest';
import { estimateTokens, isOverBudget, compactIfNeeded, CONTEXT_LIMIT } from '../lib/memory';
import type { ChatMessage } from '../lib/types';
import type { AIProvider } from '../lib/providers/types';

function msg(role: 'user' | 'model', text: string): ChatMessage {
  return { role, text };
}

function fakeProvider(summarize?: AIProvider['summarize']): AIProvider {
  return {
    id: 'mock',
    chatStream: async function* () {},
    generateContentPage: async () => '',
    generateSVGIllustration: async () => '',
    verifyWorkbook: async () => '',
    generateChatTitle: async () => 'T',
    critiquePage: async () => ({ score: 10, reason: 'ok', strengths: [], weaknesses: [], recommendingRevision: false, actionableFix: '' }),
    summarize,
  };
}

describe('estimateTokens', () => {
  it('returns 0 for empty input', () => {
    expect(estimateTokens([])).toBe(0);
  });
  it('scales with length', () => {
    const short = estimateTokens([msg('user', 'hi')]);
    const long = estimateTokens([msg('user', 'a'.repeat(4000))]);
    expect(long).toBeGreaterThan(short);
    expect(long).toBeGreaterThanOrEqual(1000);
  });
});

describe('compactIfNeeded', () => {
  it('returns input unchanged when under budget', async () => {
    const msgs = [msg('user', 'hi'), msg('model', 'hello')];
    const out = await compactIfNeeded(msgs, fakeProvider());
    expect(out).toEqual(msgs);
  });

  it('compacts and preserves first user + tail when over message count limit', async () => {
    const msgs: ChatMessage[] = [];
    msgs.push(msg('user', 'FIRST: build grade-8 fractions workbook'));
    for (let i = 0; i < CONTEXT_LIMIT + 5; i++) {
      msgs.push(msg(i % 2 === 0 ? 'model' : 'user', `turn ${i}`));
    }
    expect(isOverBudget(msgs)).toBe(true);

    const provider = fakeProvider(async () => 'summarized middle');
    const out = await compactIfNeeded(msgs, provider, { keepLastN: 5 });

    // Structure: firstUser + summary + 5 tail
    expect(out.length).toBe(7);
    expect(out[0].text).toContain('FIRST');
    expect(out[1].role).toBe('model');
    expect(out[1].text).toMatch(/\[Context Summary\]/);
    expect(out[1].text).toContain('summarized middle');
    expect(out[out.length - 1].text).toBe(msgs[msgs.length - 1].text);
  });

  it('falls back to heuristic when provider.summarize throws', async () => {
    const msgs: ChatMessage[] = [msg('user', 'goal')];
    for (let i = 0; i < 25; i++) msgs.push(msg('model', `chunk ${i}`));
    const provider = fakeProvider(async () => {
      throw new Error('network down');
    });
    const out = await compactIfNeeded(msgs, provider, { keepLastN: 3 });
    expect(out[1].text).toMatch(/\[Context Summary\]/);
    // Heuristic summary should mention one of the middle turns.
    expect(out[1].text).toMatch(/chunk/);
  });

  it('works when provider has no summarize method', async () => {
    const msgs: ChatMessage[] = [msg('user', 'goal')];
    for (let i = 0; i < 25; i++) msgs.push(msg('model', `x${i}`));
    const out = await compactIfNeeded(msgs, fakeProvider(undefined), { keepLastN: 3 });
    expect(out[1].text).toMatch(/\[Context Summary\]/);
  });

  it('triggers on token budget even with few messages', async () => {
    const bigText = 'a'.repeat(30000);
    const msgs = [msg('user', bigText), msg('model', bigText), msg('user', 'hi')];
    const out = await compactIfNeeded(msgs, fakeProvider(async () => 'S'), { keepLastN: 1 });
    expect(out.length).toBeLessThanOrEqual(3);
    expect(out.some(m => m.text.includes('[Context Summary]'))).toBe(true);
  });
});
