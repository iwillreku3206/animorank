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
import { ServerTestCaseRegistry } from '$lib/testCase/testCaseRegistry.server';
import { FunctionTestCaseLanguageRegistry } from '$lib/testCase/builtin/functionTestCase/languageRegistry';
import { StdioTestCaseLanguageRegistry } from '$lib/testCase/builtin/stdioTestCase/languageRegistry';
import { CustomTestCaseLanguageRegistry } from '$lib/testCase/builtin/customTestCase/languageRegistry';
import { CTypeRegistry } from '$lib/testCase/builtin/functionTestCase/languages/c/typeRegistry';
import { TagRegistry } from '$lib/tag/tagRegistry';
import { RegistryProvider } from './registryProvider';

export class ServerRegistryProvider extends RegistryProvider {
  private static _instance: ServerRegistryProvider | null;

  private constructor() {
    super();
    // Registries and services for server-side execution.
    this.registerServiceRegistry(Logger, new LoggerRegistry());
    this.registerServiceRegistry(CodeExecutor, new CodeExecutorRegistry());
    this.registerRegistry(new ServerTestCaseRegistry());
    this.registerRegistry(new FunctionTestCaseLanguageRegistry());
    this.registerRegistry(new StdioTestCaseLanguageRegistry());
    this.registerRegistry(new CustomTestCaseLanguageRegistry());
    this.registerRegistry(new CTypeRegistry());
    this.registerRegistry(new TagRegistry());
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
