import { ServiceRegistry } from '$lib/services/registry';
import type { CodeExecutor } from './executor';

export class ExecutorRegistry extends ServiceRegistry<CodeExecutor, []> {
  public getDefault(): CodeExecutor {
    return this.getInstance('judge0');
  }

  public constructor() {
    super();
  }
}
