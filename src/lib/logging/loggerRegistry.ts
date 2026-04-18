import { ConsoleLogger } from "$lib/logging/console";
import { FileLogger } from "$lib/logging/file";
import type { Logger } from "$lib/logging/logger";
import { ServiceRegistry } from "$lib/services/registry";

export class LoggerRegistry extends ServiceRegistry<Logger, [string]> {
  public constructor() {
    super()

    this.register('console', ConsoleLogger)
    this.register('file', FileLogger)
  }

  public getInstance(key: string, module?: string): Logger {
    const service = this._registry.get(key)

    if (!service) throw new Error(`Service ${key} not found`);

    if (service.singleton) {
      return service.classObject.instance()
    }

    return new service.classObject(module || 'General')
  }

  public getDefault(module: string): Logger {
    let logger = process.env.LOGGER_TYPE || 'console'
    if (!this._registry.has(logger)) {
      logger = 'console'
    }
    return this.getInstance(logger, module)
  }
}
