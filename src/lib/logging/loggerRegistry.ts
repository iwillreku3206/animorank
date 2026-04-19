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

  public getDefault(module: string): Logger {
    let logger = process.env.LOGGER_TYPE || 'console'
    if (!this._registry.has(logger)) {
      logger = 'console'
    }
    return this.getInstance(logger, module)
  }
}
