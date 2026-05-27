import type { ExecutionEvent } from '$lib/testCase/executionHook';
import type { Subscribable } from '$lib/utils/subscription';
import { TelemetryHook } from '../telemetryHook';

export class ExecutionHook extends TelemetryHook {
  public monacoHook(): () => void {
    return () => {};
  }
  public windowHook(): () => void {
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
