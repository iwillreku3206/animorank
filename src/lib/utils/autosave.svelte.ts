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
    this.state = 'hold';
    this.timeoutId = setTimeout(async () => {
      await this._save(data);
      this.state = 'saved';
    }, this.delayInMilliseconds);
  }

  public forceSave(data: T): Promise<T | void> {
    this.clearTimeout();
    return this._save(data);
  }

  private clearTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }

  private async _save(data: T): Promise<T | void> {
    if (deepEqual(data, this.lastSave)) {
      return;
    }
    return this.callback()
      .then((d) => {
        this.state = 'saved';
        return d;
      })
      .catch((error) => {
        this.state = 'error';
        console.error(error);
      })
      .finally(() => {
        this.state = 'saved';
        this.clearTimeout();
      });
  }
}
