import type { ExecutionEvent } from '$lib/codeExecutor/executionHook';
import type { monaco } from '$lib/monaco';
import type { Subscribable } from '$lib/utils/subscription';
import type { HistoryEntryType } from '$lib/zenstack/models';

export type Entry<T = object> = {
  type: HistoryEntryType;
  data: T;
};

export type TelemetryCallback = (entry: Entry) => void | Promise<void>;

export abstract class TelemetryHook {
  callback: TelemetryCallback;

  constructor(callback: TelemetryCallback) {
    this.callback = callback;
  }

  protected addEntry(entry: Entry) {
    this.callback(entry);
  }

  public abstract monacoHook(monaco: monaco.editor.IStandaloneCodeEditor): () => void;
  public abstract windowHook(window: Window): () => void;
  public abstract executionHook(executionObservable: Subscribable<ExecutionEvent>): () => void;
}
