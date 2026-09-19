import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AutoSave } from './autosave.svelte';

type Code = Record<string, string>;

/**
 * A write whose resolution the test controls, so two of them can be held in
 * flight at once -- the shape of the bug these tests cover.
 */
function deferred() {
  let resolve!: () => void;
  let reject!: (_error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * Stands in for the server: records every write in arrival order, and hands
 * back the code the last arrival left behind.
 */
function makeServer() {
  const arrivals: Code[] = [];
  const gates: ReturnType<typeof deferred>[] = [];

  const callback = vi.fn(async (data: Code) => {
    const gate = deferred();
    gates.push(gate);
    await gate.promise;
    // The PUT lands when the request completes, not when it was made.
    arrivals.push(data);
  });

  return {
    callback,
    arrivals,
    /** Lets the nth write (in the order the callback was entered) complete. */
    land: (index: number) => gates[index].resolve(),
    fail: (index: number, error: Error) => gates[index].reject(error),
    get stored(): Code | undefined {
      return arrivals.at(-1);
    },
    get entered(): number {
      return gates.length;
    }
  };
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('AutoSave', () => {
  it('does not start a write while an earlier one is still in flight', async () => {
    const server = makeServer();
    const autosave = new AutoSave<Code>(server.callback, { body: 'start' });

    autosave.save({ body: 'a' });
    await vi.advanceTimersByTimeAsync(3000);
    expect(server.entered).toBe(1);

    // The debounced write for 'a' has not come back yet. Forcing a save of 'b'
    // must queue behind it rather than race it.
    const forced = autosave.forceSave({ body: 'b' });
    await flush();
    expect(server.entered).toBe(1);

    server.land(0);
    await flush();
    expect(server.entered).toBe(2);
    server.land(1);
    await forced;

    expect(server.arrivals).toEqual([{ body: 'a' }, { body: 'b' }]);
  });

  it('leaves the server holding the newest code when a forced save overtakes a debounced one', async () => {
    // The prod bug: `run` awaited only its own write, so a slower debounced
    // write of the previous revision could land after it and the grader would
    // read that older code back out of the session.
    const server = makeServer();
    const autosave = new AutoSave<Code>(server.callback, { body: 'start' });

    autosave.save({ body: 'a' });
    await vi.advanceTimersByTimeAsync(3000);

    const forced = autosave.forceSave({ body: 'b' });
    await flush();

    // 'a' is deliberately the slower of the two.
    server.land(0);
    await flush();
    server.land(1);
    await forced;

    expect(server.stored).toEqual({ body: 'b' });
  });

  it('reports saving, not saved, while a queued write is still outstanding', async () => {
    const server = makeServer();
    const autosave = new AutoSave<Code>(server.callback, { body: 'start' });

    autosave.save({ body: 'a' });
    await vi.advanceTimersByTimeAsync(3000);
    void autosave.forceSave({ body: 'b' });
    await flush();

    server.land(0);
    await flush();
    // 'a' is persisted, but 'b' is not -- calling this 'saved' is what told the
    // student their latest keystrokes were safe when they were still on the wire.
    expect(autosave.state).toBe('saving');

    server.land(1);
    await flush();
    expect(autosave.state).toBe('saved');
  });

  it('awaits an in-flight write instead of sending a duplicate of it', async () => {
    const server = makeServer();
    const autosave = new AutoSave<Code>(server.callback, { body: 'start' });

    autosave.save({ body: 'a' });
    await vi.advanceTimersByTimeAsync(3000);

    // Run with no edits since the debounce fired: there is nothing new to send,
    // but the caller still has to wait for 'a' to land before grading it.
    let settled = false;
    const forced = autosave.forceSave({ body: 'a' }).then(() => (settled = true));
    await flush();
    expect(server.entered).toBe(1);
    expect(settled).toBe(false);

    server.land(0);
    await forced;
    expect(settled).toBe(true);
    expect(server.callback).toHaveBeenCalledTimes(1);
  });

  it('sends the queued snapshot rather than whatever is current when the write runs', async () => {
    const server = makeServer();
    const autosave = new AutoSave<Code>(server.callback, { body: 'start' });

    autosave.save({ body: 'a' });
    await vi.advanceTimersByTimeAsync(3000);
    void autosave.forceSave({ body: 'b' });
    await flush();

    server.land(0);
    await flush();

    // The second write was queued with 'b' and must still carry 'b', even
    // though it only reached the front of the queue later.
    expect(server.callback).toHaveBeenNthCalledWith(2, { body: 'b' });
  });

  it('retries data whose write failed', async () => {
    const server = makeServer();
    const autosave = new AutoSave<Code>(server.callback, { body: 'start' });

    autosave.save({ body: 'a' });
    await vi.advanceTimersByTimeAsync(3000);
    server.fail(0, new Error('offline'));
    await flush();
    expect(autosave.state).toBe('error');

    // Same data as the failed write: the dedup baseline must have rolled back,
    // or this change would be mistaken for already-persisted.
    autosave.save({ body: 'a' });
    await vi.advanceTimersByTimeAsync(3000);
    expect(server.entered).toBe(2);

    server.land(1);
    await flush();
    expect(autosave.state).toBe('saved');
    expect(server.stored).toEqual({ body: 'a' });
  });

  // Regression: `forceSave` used to resolve the same way whether or not the
  // write landed, so `run` and `submit` went ahead and graded the revision the
  // server still held -- and, once submissions were recorded, wrote that
  // verdict into the student's history against code they had not written.
  it('tells a forced save its write failed', async () => {
    const server = makeServer();
    const autosave = new AutoSave<Code>(server.callback, { body: 'start' });

    const saved = autosave.forceSave({ body: 'a' });
    await flush();
    server.fail(0, new Error('offline'));

    await expect(saved).resolves.toBe(false);
    expect(autosave.state).toBe('error');
  });

  it('tells a forced save its write landed', async () => {
    const server = makeServer();
    const autosave = new AutoSave<Code>(server.callback, { body: 'start' });

    const saved = autosave.forceSave({ body: 'a' });
    await flush();
    server.land(0);

    await expect(saved).resolves.toBe(true);
    expect(server.stored).toEqual({ body: 'a' });
  });

  // The failure is reported as a value rather than a rejection precisely so the
  // chain tail stays on its success track: a rejected `pending` would fail every
  // write linked onto it afterwards.
  it('keeps writing after a failure instead of poisoning the queue', async () => {
    const server = makeServer();
    const autosave = new AutoSave<Code>(server.callback, { body: 'start' });

    const first = autosave.forceSave({ body: 'a' });
    await flush();
    server.fail(0, new Error('offline'));
    await expect(first).resolves.toBe(false);

    const second = autosave.forceSave({ body: 'b' });
    await flush();
    server.land(1);

    await expect(second).resolves.toBe(true);
    expect(server.stored).toEqual({ body: 'b' });
    expect(autosave.state).toBe('saved');
  });

  it('skips a write when nothing changed', async () => {
    const server = makeServer();
    const autosave = new AutoSave<Code>(server.callback, { body: 'start' });

    autosave.save({ body: 'start' });
    await vi.advanceTimersByTimeAsync(3000);

    expect(server.callback).not.toHaveBeenCalled();
    expect(autosave.state).toBe('saved');
  });
});
