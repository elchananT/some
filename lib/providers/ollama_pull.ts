/**
 * Stream real byte-progress for an `ollama pull <model>` from the browser.
 *
 * Wraps the official `ollama/browser` SDK's `pull({stream:true})` which yields
 * chunks of the form `{ status, digest?, total?, completed? }`. We translate
 * those into a uniform `{status, percent}` so the UI can render a progress bar
 * without caring about the underlying stages (manifest / downloading / verifying).
 *
 * Usage:
 *   for await (const ev of pullModel('llama3.2')) {
 *     setProgress(ev.percent); setLabel(ev.status);
 *   }
 */

export interface PullProgress {
  status: string;
  percent: number; // 0..100, monotonic-ish; 100 only on the terminal "success" event
  completed?: number;
  total?: number;
}

interface PullChunk {
  status?: string;
  total?: number;
  completed?: number;
  digest?: string;
  error?: string;
}

export async function* pullModelFromIterable(
  source: AsyncIterable<PullChunk>
): AsyncGenerator<PullProgress, void, unknown> {
  let lastPercent = 0;
  for await (const chunk of source) {
    if (chunk.error) {
      throw new Error(chunk.error);
    }
    const status = chunk.status ?? 'working';
    let percent = lastPercent;
    if (typeof chunk.total === 'number' && typeof chunk.completed === 'number' && chunk.total > 0) {
      const raw = (chunk.completed / chunk.total) * 100;
      percent = Math.max(0, Math.min(99, Math.floor(raw)));
      if (percent < lastPercent) percent = lastPercent; // clamp monotonic
    }
    if (status.toLowerCase() === 'success') {
      percent = 100;
    }
    lastPercent = percent;
    yield { status, percent, completed: chunk.completed, total: chunk.total };
  }
}

export async function* pullModel(
  modelName: string,
  opts?: { baseURL?: string }
): AsyncGenerator<PullProgress, void, unknown> {
  const { Ollama } = await import('ollama/browser');
  const client = opts?.baseURL ? new Ollama({ host: opts.baseURL }) : new Ollama();
  const stream = await client.pull({ model: modelName, stream: true });
  yield* pullModelFromIterable(stream as AsyncIterable<PullChunk>);
}
