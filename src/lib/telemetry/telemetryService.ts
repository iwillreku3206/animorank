import type { ExecutionEvent } from '$lib/testCase/executionHook';
import type { monaco } from '$lib/monaco';
import type { Subscribable } from '$lib/utils/subscription';
import type { Entry, TelemetryCallback, TelemetryHook } from './telemetryHook';
import { TextInputHook } from './hooks/textInput';
import { ExecutionHook } from './hooks/execution';

type UnmountCallback = () => void;

export abstract class TelemetryService {
  private hooks = new Set<TelemetryHook>();

  private monacoUnmounts: UnmountCallback[] = [];
  private windowUnmounts: UnmountCallback[] = [];
  private executionUnmounts: UnmountCallback[] = [];

  /** The practice session whose history entries are recorded into. */
  public readonly sessionId: string;

  private registerHook(hook: new (_callback: TelemetryCallback) => TelemetryHook) {
    // Arrow wrapper keeps `this` bound to the service when the hook fires.
    this.hooks.add(new hook((entry: Entry) => this.telemetryCallback(entry)));
  }

  public constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.registerHook(TextInputHook);
    this.registerHook(ExecutionHook);
  }

  public attachMonaco(monaco: monaco.editor.IStandaloneCodeEditor) {
    for (const hook of this.hooks) {
      this.monacoUnmounts.push(hook.monacoHook(monaco));
    }
  }

  public attachWindow(window: Window) {
    for (const hook of this.hooks) {
      this.windowUnmounts.push(hook.windowHook(window));
    }
  }

  public attachExecution(executionObservable: Subscribable<ExecutionEvent>) {
    for (const hook of this.hooks) {
      this.executionUnmounts.push(hook.executionHook(executionObservable));
    }
  }

  public unmountMonaco() {
    while (this.monacoUnmounts.length) {
      this.monacoUnmounts.pop()!();
    }
  }

  public unmountWindow() {
    while (this.windowUnmounts.length) {
      this.windowUnmounts.pop()!();
    }
  }

  public unmountExecution() {
    while (this.executionUnmounts.length) {
      this.executionUnmounts.pop()!();
    }
  }

  /**
   * Persist or transmit any entries the service has collated so far (the
   * session history strategy writes them out in one batch). Called by the
   * app when the session is saved; a no-op for strategies without a sink.
   */
  public async flush(): Promise<void> {}

  protected abstract telemetryCallback(_entry: Entry): void | Promise<void>;
}
