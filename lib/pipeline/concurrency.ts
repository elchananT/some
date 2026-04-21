/**
 * Run async tasks with bounded concurrency, preserving input order in results.
 *
 * - `tasks` — array of zero-arg async functions
 * - `limit` — max simultaneous in-flight; coerced to >= 1
 *
 * Empty input returns [] immediately (no deadlock).
 * The first rejection is propagated; in-flight tasks finish but their results
 * are discarded.
 */
export async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<T[]> {
  if (tasks.length === 0) return [];
  const cap = Math.max(1, Math.floor(limit));
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;
  const worker = async (): Promise<void> => {
    while (true) {
      const i = nextIndex++;
      if (i >= tasks.length) return;
      results[i] = await tasks[i]();
    }
  };
  const workers = Array.from({ length: Math.min(cap, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
