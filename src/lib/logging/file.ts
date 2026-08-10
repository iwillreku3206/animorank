import { Logger, LogLevelNames, type Loggable } from './logger';
import fs from 'fs/promises';

export class FileLogger extends Logger {
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

  protected async log(message: Loggable): Promise<void> {
    const dateTime = new Date();
    const formatted = this.timeFormat.format(dateTime);

    await fs.appendFile(
      process.env.FILE_LOGGER_FILE || '/tmp/animorank.log',
      Buffer.from(`[${LogLevelNames[message.level]}] [${formatted}] [${this.module}] ${message.message}\n`),
      'utf8'
    );
  }
}
