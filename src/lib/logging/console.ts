import { Logger, LogLevelNames, type Loggable } from './logger';

export class ConsoleLogger extends Logger {
  timeFormat: Intl.DateTimeFormat;

  constructor(module: string, timeFormat?: Intl.DateTimeFormat) {
    super(module);

    this.timeFormat =
      timeFormat ||
      new Intl.DateTimeFormat('en', {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
  }

  protected log(message: Loggable): void {
    const dateTime = new Date();
    const formatted = this.timeFormat.format(dateTime);
    console.log(`[${LogLevelNames[message.level]}] [${formatted}] [${this.module}] ${message.message}`);
  }
}
