import deepEqual from 'deep-equal';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';

export type AutoSaveState = 'hold' | 'saving' | 'saved' | 'error';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Callback<T> = T extends any[]
  ? // eslint-disable-next-line no-unused-vars
    (changed: T) => Promise<void>
  : () => Promise<void>;

export class AutoSave<T> {
  private timeoutId: number | NodeJS.Timeout | undefined;

  private lastSave: T;

  private callback: Callback<T>;
  private delayInMilliseconds: number;
  private uniqueKey: (_item: T, _index: number) => T[keyof T] | number;

  public state: AutoSaveState = $state('saved');

  constructor(
    callback: Callback<T>,
    lastSave: T,
    uniqueKey: (_item: T, _index: number) => T[keyof T] | number = (_, i) => i,
    delayInMilliseconds = 3000
  ) {
    this.callback = callback;
    this.delayInMilliseconds = delayInMilliseconds;
    this.lastSave = lastSave;
    this.uniqueKey = uniqueKey;

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

  private async _save(data: T): Promise<void> {
    const _then = () => {
      this.state = 'saved';
    };

    const _catch = (error: Error) => {
      this.state = 'error';
      console.error(error);
    };

    const _finally = () => {
      this.state = 'saved';
      this.clearTimeout();
    };

    if (Array.isArray(data)) {
      const currentArray = data as unknown[];
      const lastArray = this.lastSave as unknown[];

      const lastMap = new SvelteMap(
        lastArray.map((item: unknown, index) => [this.uniqueKey(item as T, index), item] as const)
      );

      const changedItems: unknown[] = [];

      // Check for new or modified items
      currentArray.forEach((item, index) => {
        const key = this.uniqueKey(item as T, index);
        const last = lastMap.get(key);
        if (last === undefined || !deepEqual(item, last)) {
          changedItems.push(item);
        }
      });

      // Check for deleted items (in lastSave but not in data)
      const dataKeys = new SvelteSet(
        currentArray.map((item: unknown, index) => this.uniqueKey(item as T, index))
      );
      for (const [lastKey, lastItem] of lastMap) {
        if (!dataKeys.has(lastKey)) {
          changedItems.push(lastItem);
        }
      }

      if (changedItems.length > 0) {
        this.lastSave = data;
        return this.callback(changedItems as T)
          .then(_then)
          .catch(_catch)
          .finally(_finally);
      }
    } else {
      if (!deepEqual(data, this.lastSave)) {
        this.lastSave = data;
        return (this.callback as () => Promise<void>)().then(_then).catch(_catch).finally(_finally);
      }
    }
  }
}
