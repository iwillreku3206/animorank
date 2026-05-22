import type { ExecutionEvent } from '$lib/testCase/executionHook';
import type { Subscribable } from '$lib/utils/subscription';
import type { editor } from 'monaco-editor';
import { TelemetryHook } from '../telemetryHook';

export class ExecutionHook extends TelemetryHook {
  public monacoHook(_monaco: editor.IStandaloneCodeEditor): () => void {
    return () => {};
  }
  public windowHook(_window: Window): () => void {
    return () => {};
  }
  public executionHook(executionObservable: Subscribable<ExecutionEvent>): () => void {
    return executionObservable.subscribe('run', (execution) => {
      this.addEntry({
        type: 'RUN_ATTEMPT',
        data: execution
      });
    });
  }
}
