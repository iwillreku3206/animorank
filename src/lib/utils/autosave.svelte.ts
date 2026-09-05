import deepEqual from 'deep-equal';

export type AutoSaveState = 'hold' | 'saving' | 'saved' | 'error';

type Callback = () => Promise<void>;

export class AutoSave<T> {
  private timeoutId: number | NodeJS.Timeout | undefined;

  private lastSave: T;

  private callback: Callback;
  private delayInMilliseconds: number;

  public state: AutoSaveState = $state('saved');

  constructor(callback: Callback, lastSave: T, delayInMilliseconds = 3000) {
    this.callback = callback;
    this.delayInMilliseconds = delayInMilliseconds;
    this.lastSave = lastSave;

    this.state = 'saved';
  }

  public save(data: T) {
    this.clearTimeout();
    if (deepEqual(data, this.lastSave)) {
      this.state = 'saved';
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

  private async _save(data: T): Promise<void> {
    this.clearTimeout();
    if (deepEqual(data, this.lastSave)) {
      this.state = 'saved';
      return;
    }
    this.state = 'saving';
    try {
      await this.callback();
      // Only advance the baseline on success, so a failed save is retried by
      // the next change rather than being mistaken for already-persisted.
      this.lastSave = data;
      this.state = 'saved';
    } catch (error) {
      this.state = 'error';
      console.error(error);
    }
  }
}
