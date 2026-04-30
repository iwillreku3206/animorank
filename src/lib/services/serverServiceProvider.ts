import { Logger } from '$lib/logging/logger';
import { LoggerRegistry } from '$lib/logging/loggerRegistry';
import { TestCaseService } from '$lib/testCase/testCaseService';
import { ServiceRegistry, type ISingleton } from './registry';
import { ServiceProvider } from './serviceProvider';

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
  }

  public static instance(): ServiceProvider {
    if (!ServerServiceProvider._instance) {
      ServerServiceProvider._instance = new ServiceProvider();
    }
    return ServerServiceProvider._instance;
  }
}
