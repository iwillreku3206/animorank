import deepEqual from 'deep-equal';

export type AutoSaveState = 'hold' | 'saving' | 'saved' | 'error';

type Callback<T> = (_data: T) => Promise<void>;

export class AutoSave<T> {
  private timeoutId: number | NodeJS.Timeout | undefined;

  private lastSave: T;

  private callback: Callback<T>;
  private delayInMilliseconds: number;

  /**
   * Tail of the write chain. Writes link onto this instead of firing straight
   * away, so they reach the server in the order they were asked for and
   * `forceSave` settles only once the writes ahead of it have landed.
   *
   * Overlapping writes are the thing this guards against. The server keeps
   * whichever arrives last, so two in flight at once can land out of order and
   * leave it holding the older revision -- with the newer write already
   * resolved and its caller free to run against code the server never kept.
   */
  private pending: Promise<void> = Promise.resolve();

  /**
   * The newest data handed to a write, landed or not. The dedup checks read
   * this rather than `lastSave`, which lags a round trip behind and would wave
   * a redundant copy of an in-flight write into the queue.
   */
  private queued: T;

  /** Writes queued or in flight. Only the last one out reports 'saved'. */
  private outstanding = 0;

  public state: AutoSaveState = $state('saved');

  constructor(callback: Callback<T>, lastSave: T, delayInMilliseconds = 3000) {
    this.callback = callback;
    this.delayInMilliseconds = delayInMilliseconds;
    this.lastSave = lastSave;
    this.queued = lastSave;

    this.state = 'saved';
  }

  public save(data: T) {
    this.clearTimeout();
    if (deepEqual(data, this.queued)) {
      // Nothing new to persist. A write already on its way reports its own
      // outcome, so only claim 'saved' once none is left.
      if (this.outstanding === 0) this.state = 'saved';
      return;
    }
    this.state = 'hold';
    this.timeoutId = setTimeout(() => {
      void this._save(data);
    }, this.delayInMilliseconds);
  }

  public forceSave(data: T): Promise<void> {
    this.clearTimeout();
    return this._save(data);
  }

  private clearTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }

  private _save(data: T): Promise<void> {
    this.clearTimeout();
    if (deepEqual(data, this.queued)) {
      // Already sent, or already waiting its turn. Hand back the chain anyway:
      // a caller forcing a save is about to act on the server's copy, so it has
      // to wait for this code to land even when another call is what sent it.
      return this.pending;
    }

    this.queued = data;
    this.outstanding += 1;
    this.state = 'saving';

    const write = this.pending.then(() => this.write(data));
    this.pending = write;
    return write;
  }

  /** Runs one write, once the writes queued ahead of it have finished. */
  private async write(data: T): Promise<void> {
    try {
      await this.callback(data);
      // Only advance the baseline on success, so a failed save is retried by
      // the next change rather than being mistaken for already-persisted.
      this.lastSave = data;
      this.outstanding -= 1;
      // A newer write may still be queued behind this one, and calling that
      // 'saved' would tell the student their latest keystrokes are persisted
      // while they are still on the wire.
      if (this.outstanding === 0) this.state = 'saved';
    } catch (error) {
      this.outstanding -= 1;
      // Swallowed rather than rethrown: `run` and `submit` await `forceSave`,
      // and a rejection would strand the editor locked. The 'error' state is
      // how a failed save reaches the student.
      this.state = 'error';
      console.error(error);
      // Nothing landed, so drop the dedup baseline back and let the next change
      // retry this data -- unless something newer is queued behind it, which is
      // the newer baseline and has to stand.
      if (deepEqual(this.queued, data)) this.queued = this.lastSave;
    }
  }
}
