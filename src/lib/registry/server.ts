import { Logger } from '$lib/logging/logger';
import { LoggerRegistry } from '$lib/logging/loggerRegistry';
import { ServiceRegistry } from '.';
import { ProblemService } from '$lib/problem/problemService';
import { ProblemSetService } from '$lib/problemSet/problemSetService';
import { PracticeSessionService } from '$lib/practiceSession/practiceSessionService';
import { TagService } from '$lib/tag/tagService';
import { TestCaseService } from '$lib/testCase/testCaseService';
import { CodeExecutor } from '$lib/executor';
import { CodeExecutorRegistry } from '$lib/executor/codeExecutorRegistry';
import { Judge0Executor } from '$lib/executor/judge0';
import { ServerTestCaseRegistry } from '$lib/testCase/testCaseRegistry.server';
import { RegistryProvider } from './registryProvider';

export class ServerRegistryProvider extends RegistryProvider {
  private static _instance: ServerRegistryProvider | null;

  private constructor() {
    super();
    // Import any service registries here
    this._registries.set(Logger, new LoggerRegistry());
    const codeExecutorRegistry = new CodeExecutorRegistry();
    codeExecutorRegistry.registerCodeExecutor(Judge0Executor);
    this._registries.set(CodeExecutor, codeExecutorRegistry);
    this._registries.set(ServerTestCaseRegistry, new ServerTestCaseRegistry());
    this._registries.set(ProblemService, ServiceRegistry.createSingleSingletonServiceRegistry(new ProblemService()));
    this._registries.set(
      ProblemSetService,
      ServiceRegistry.createSingleSingletonServiceRegistry(new ProblemSetService())
    );
    this._registries.set(
      PracticeSessionService,
      ServiceRegistry.createSingleSingletonServiceRegistry(new PracticeSessionService())
    );
    this._registries.set(TagService, ServiceRegistry.createSingleSingletonServiceRegistry(new TagService()));
    this._registries.set(TestCaseService, ServiceRegistry.createSingleServiceRegistry(TestCaseService));
  }

  public static instance(): RegistryProvider {
    if (!ServerRegistryProvider._instance) {
      ServerRegistryProvider._instance = new ServerRegistryProvider();
    }
    return ServerRegistryProvider._instance;
  }
}
