import { Logger } from '$lib/logging/logger';
import { LoggerRegistry } from '$lib/logging/loggerRegistry';
import { TestCaseService } from '$lib/testCase/testCaseService';
import { CodeExecutor } from '$lib/testCase/executor';
import { Judge0Executor } from '$lib/testCase/executor/judge0';
import { ServiceRegistry, type ISingleton } from './registry';
import { ServiceProvider } from './serviceProvider';
import { ProblemService } from '$lib/problem/problemService';
import { PracticeSessionService } from '$lib/practiceSession/practiceSessionService';

export class ServerServiceProvider extends ServiceProvider {
  private static _instance: ServerServiceProvider | null;

  private constructor() {
    super();
    // Import any service registries here
    this._registries.set(Logger, new LoggerRegistry());
    this._registries.set(
      TestCaseService as ISingleton<TestCaseService>,
      ServiceRegistry.createSingleSingletonServiceRegistry(TestCaseService)
    );
    this._registries.set(
      ProblemService as ISingleton<ProblemService>,
      ServiceRegistry.createSingleSingletonServiceRegistry(ProblemService)
    );
    this._registries.set(
      PracticeSessionService as ISingleton<PracticeSessionService>,
      ServiceRegistry.createSingleSingletonServiceRegistry(PracticeSessionService)
    );
    this._registries.set(CodeExecutor, ServiceRegistry.createSingleServiceRegistry(Judge0Executor));
  }

  public static instance(): ServiceProvider {
    if (!ServerServiceProvider._instance) {
      ServerServiceProvider._instance = new ServerServiceProvider();
    }
    return ServerServiceProvider._instance;
  }
}
