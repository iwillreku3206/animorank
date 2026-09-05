import { Logger } from '$lib/logging/logger';
import { LoggerRegistry } from '$lib/logging/loggerRegistry';
import { ServiceRegistry, type ISingleton } from './registry';
import { ServiceProvider } from './serviceProvider';
import { ProblemService } from '$lib/problem/problemService';
import { ProblemSetService } from '$lib/problemSet/problemSetService';
import { PracticeSessionService } from '$lib/practiceSession/practiceSessionService';
import { TagService } from '$lib/tag/tagService';
import { TestCaseService } from '$lib/testCase/testCaseService';
import { CodeExecutor } from '$lib/executor';
import { CodeExecutorRegistry } from '$lib/executor/codeExecutorRegistry';
import { Judge0Executor } from '$lib/executor/judge0';

export class ServerServiceProvider extends ServiceProvider {
  private static _instance: ServerServiceProvider | null;

  private constructor() {
    super();
    // Import any service registries here
    this._registries.set(Logger, new LoggerRegistry());
    const codeExecutorRegistry = new CodeExecutorRegistry();
    codeExecutorRegistry.registerCodeExecutor(Judge0Executor);
    this._registries.set(CodeExecutor, codeExecutorRegistry);
    this._registries.set(
      ProblemService as ISingleton<ProblemService>,
      ServiceRegistry.createSingleSingletonServiceRegistry(ProblemService)
    );
    this._registries.set(
      ProblemSetService as ISingleton<ProblemSetService>,
      ServiceRegistry.createSingleSingletonServiceRegistry(ProblemSetService)
    );
    this._registries.set(
      PracticeSessionService as ISingleton<PracticeSessionService>,
      ServiceRegistry.createSingleSingletonServiceRegistry(PracticeSessionService)
    );
    this._registries.set(
      TagService as ISingleton<TagService>,
      ServiceRegistry.createSingleSingletonServiceRegistry(TagService)
    );
    this._registries.set(TestCaseService, ServiceRegistry.createSingleServiceRegistry(TestCaseService));
  }

  public static instance(): ServiceProvider {
    if (!ServerServiceProvider._instance) {
      ServerServiceProvider._instance = new ServerServiceProvider();
    }
    return ServerServiceProvider._instance;
  }
}
