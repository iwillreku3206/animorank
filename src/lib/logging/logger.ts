/* eslint-disable no-unused-vars */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARNING = 2,
  ERROR = 3,
  CRITICAL = 4
}

export const LogLevelNames = {
  [LogLevel.DEBUG]: 'debug',
  [LogLevel.INFO]: 'info',
  [LogLevel.WARNING]: 'warning',
  [LogLevel.ERROR]: 'error',
  [LogLevel.CRITICAL]: 'critical'
};

export interface Loggable {
  level: LogLevel;
  message: string;
}

export abstract class Logger {
  protected module: string;

  public constructor(module: string) {
    this.module = module;
  }

  protected abstract log(message: Loggable): void | Promise<void>;

  public debug(message: string) {
    this.emit({ level: LogLevel.DEBUG, message });
  }

  public info(message: string) {
    this.emit({ level: LogLevel.INFO, message });
  }

  public warning(message: string) {
    this.emit({ level: LogLevel.WARNING, message });
  }

  public error(message: string) {
    this.emit({ level: LogLevel.ERROR, message });
  }

  public critical(message: string) {
    this.emit({ level: LogLevel.CRITICAL, message });
  }

  /**
   * A logger must not be able to take the process down: a file logger's append
   * can reject long after the call that asked for it returned, and an
   * unhandled rejection exits the process under Node's default policy.
   */
  private emit(message: Loggable): void {
    try {
      const result = this.log(message);
      if (result instanceof Promise) {
        result.catch((error) => console.error(`Logger "${this.module}" failed`, error));
      }
    } catch (error) {
      console.error(`Logger "${this.module}" failed`, error);
    }
  }
}
