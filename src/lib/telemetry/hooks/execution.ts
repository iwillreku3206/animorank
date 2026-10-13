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
    const testsUnmount = executionObservable.subscribe('tests', (execution) => {
      this.addEntry({
        type: 'RUN_ATTEMPT',
        data: execution
      });
    });

    const customUnmount = executionObservable.subscribe('custom', (execution) => {
      this.addEntry({
        type: 'CUSTOM_RUN',
        data: { execution: execution }
      });
    });

    return () => {
      testsUnmount();
      customUnmount();
    };
  }
}
