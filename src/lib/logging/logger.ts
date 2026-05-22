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

  protected abstract log(message: Loggable): void;

  public debug(message: string) {
    this.log({ level: LogLevel.DEBUG, message });
  }

  public info(message: string) {
    this.log({ level: LogLevel.INFO, message });
  }

  public warning(message: string) {
    this.log({ level: LogLevel.WARNING, message });
  }

  public error(message: string) {
    this.log({ level: LogLevel.ERROR, message });
  }

  public critical(message: string) {
    this.log({ level: LogLevel.CRITICAL, message });
  }
}
