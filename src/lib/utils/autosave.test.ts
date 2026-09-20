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

  // Regression: the dedup branch used to answer every "is this saved?" question
  // by replaying the write chain's last result. After a failure that result is
  // `false` and never changes, so a student who undid their way back to the
  // saved revision was told their code could not be saved -- while the status
  // bar said 'saved' at the same moment -- and run and submit stayed blocked
  // until they typed something new.
  describe('after a failed write, once the code is back to what the server holds', () => {
    const revertedToLastSave = async () => {
      const server = makeServer();
      const autosave = new AutoSave<Code>(server.callback, { body: 'start' });

      const failed = autosave.forceSave({ body: 'a' });
      await flush();
      server.fail(0, new Error('offline'));
      await expect(failed).resolves.toBe(false);

      // The student undoes back to the revision the server confirmed on load.
      autosave.save({ body: 'start' });
      await vi.advanceTimersByTimeAsync(3000);
      await flush();

      return { server, autosave };
    };

    it('reports the code as saved', async () => {
      const { autosave } = await revertedToLastSave();

      expect(await autosave.forceSave({ body: 'start' })).toBe(true);
    });

    it('agrees with the status bar', async () => {
      // These two are read side by side in the solve view -- the status bar
      // from `state`, the alert from what `forceSave` resolved to. Disagreeing
      // put both on screen at once, each contradicting the other.
      const { autosave } = await revertedToLastSave();

      expect(autosave.state).toBe('saved');
      expect(await autosave.forceSave({ body: 'start' })).toBe(true);
    });

    it('sends nothing, because the server already has it', async () => {
      const { server, autosave } = await revertedToLastSave();

      await autosave.forceSave({ body: 'start' });

      expect(server.callback).toHaveBeenCalledTimes(1);
      expect(server.callback).toHaveBeenCalledWith({ body: 'a' });
    });

    it('stays saved however many times it is asked', async () => {
      // The stuck state survived repeat presses: nothing about asking again
      // moved the chain off the failure it was still reporting.
      const { autosave } = await revertedToLastSave();

      expect(await autosave.forceSave({ body: 'start' })).toBe(true);
      expect(await autosave.forceSave({ body: 'start' })).toBe(true);
      expect(await autosave.forceSave({ body: 'start' })).toBe(true);
    });
  });

  it('still waits for a write that is genuinely in flight', async () => {
    // The guard above must not short-cut a duplicate of a write still on the
    // wire: `lastSave` has not advanced to it yet, so the chain is the only
    // thing that knows when it lands.
    const server = makeServer();
    const autosave = new AutoSave<Code>(server.callback, { body: 'start' });

    autosave.save({ body: 'a' });
    await vi.advanceTimersByTimeAsync(3000);
    expect(server.entered).toBe(1);

    let settled = false;
    const forced = autosave.forceSave({ body: 'a' }).then((landed) => {
      settled = true;
      return landed;
    });
    await flush();
    expect(settled).toBe(false);

    server.land(0);
    await expect(forced).resolves.toBe(true);
    expect(server.callback).toHaveBeenCalledTimes(1);
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
