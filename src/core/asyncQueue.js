/**
 * Serialize async tasks so read-modify-write storage updates cannot interleave.
 * @returns {(task: () => Promise<any>) => Promise<any>}
 */
export function createAsyncQueue() {
  let tail = Promise.resolve();
  return function enqueue(task) {
    const run = tail.then(task, task);
    // Keep the chain alive even if a task rejects.
    tail = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  };
}
