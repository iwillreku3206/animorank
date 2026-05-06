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

  public constructor() {
    this.registerHook(TextInputHook);
    this.registerHook(ExecutionHook);
  }

  private registerHook(hook: new (callback: TelemetryCallback) => TelemetryHook) {
    this.hooks.add(new hook(this.telemetryCallback));
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

  protected abstract telemetryCallback(entry: Entry): void | Promise<void>;
}
