import type { ClassServiceOf } from '$lib/services/registry';
import type { CodeExecutorRegistry } from './codeExecutorRegistry';
import type { ExecutionRequest, ExecutionResult } from './types';

export abstract class CodeExecutor {
  // eslint-disable-next-line no-unused-vars
  public abstract execute(request: ExecutionRequest): Promise<ExecutionResult>;

  public languages() {
    return (this.constructor as ClassServiceOf<CodeExecutorRegistry>).languages();
  }
}
