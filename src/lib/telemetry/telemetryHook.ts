import type { ExecutionEvent } from '$lib/testCase/executionHook';
import type { monaco } from '$lib/monaco';
import type { Subscribable } from '$lib/utils/subscription';

export type Entry<T = object> = {
  type: string;
  data: T;
};

export type TelemetryCallback = (_entry: Entry) => void | Promise<void>;

export abstract class TelemetryHook {
  callback: TelemetryCallback;

  constructor(callback: TelemetryCallback) {
    this.callback = callback;
  }

  protected addEntry(entry: Entry) {
    this.callback(entry);
  }

  /** The editor code at the current history position, or undefined when this hook cannot prove it. */
  public snapshotText(): string | undefined {
    return undefined;
  }

  public abstract monacoHook(_monaco: monaco.editor.IStandaloneCodeEditor): () => void;
  public abstract windowHook(_window: Window): () => void;
  public abstract executionHook(_executionObservable: Subscribable<ExecutionEvent>): () => void;
}
