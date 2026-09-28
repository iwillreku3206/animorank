import Fastify, { type LogLevel } from 'fastify';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsoleLogger } from './console';
import { FastifyLoggerAdapter } from './fastify';
import { FileLogger } from './file';
import type { Loggable } from './logger';

/** A logger that keeps the messages it was asked to write, for a test to read back. */
class RecordingLogger extends ConsoleLogger {
  public readonly messages: string[] = [];

  protected override log(message: Loggable): void {
    this.messages.push(message.message);
  }
}

/** A file logger whose writes a test can await, so it never has to wait on the clock. */
class AwaitableFileLogger extends FileLogger {
  public readonly writes: Promise<void>[] = [];

  protected override log(message: Loggable): Promise<void> {
    const write = super.log(message);
    this.writes.push(write);
    return write;
  }
}

describe('FastifyLoggerAdapter', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'fastify-logger-'));
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('records a whole request cycle through the console logger', async () => {
    const app = Fastify({ loggerInstance: new FastifyLoggerAdapter(new ConsoleLogger('webserver')) });
    app.get('/ok', async () => 'ok');
    app.get('/boom', async () => {
      throw new Error('kaboom');
    });

    const lines: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((line: string) => void lines.push(line));
    try {
      const base = await app.listen({ port: 0 });
      await fetch(`${base}/ok`);
      await fetch(`${base}/boom`);
      await app.close();
    } finally {
      spy.mockRestore();
    }

    // Server startup lines arrive as info records.
    expect(lines.some((line) => /^\[info\] \[.*\] \[webserver\] Server listening at http/.test(line))).toBe(true);

    // Per-request records carry the reqId binding plus Fastify's req/res/err serializers.
    expect(lines.find((line) => line.includes('incoming request {"reqId":"req-1"'))).toContain(
      '[webserver] incoming request {"reqId":"req-1","req":{"method":"GET","url":"/ok"'
    );
    const completed = lines.find((line) => line.includes('request completed {"reqId":"req-1"'));
    expect(completed).toContain('"res":{"statusCode":200}');
    expect(completed).toMatch(/"responseTime":\d/);

    // A thrown route error is an error record whose message is the thrown error's message.
    const failed = lines.find((line) => line.includes('kaboom'));
    expect(failed).toMatch(/^\[error\] /);
    expect(failed).toContain('"reqId":"req-2"');
    expect(failed).toContain('"res":{"statusCode":500}');
    expect(failed).toContain('"err":{"type":"Error","message":"kaboom"');
  });

  it('records through the file logger', async () => {
    process.env.FILE_LOGGER_FILE = path.join(dir, 'app.log');
    const logger = new AwaitableFileLogger('webserver');
    const app = Fastify({ loggerInstance: new FastifyLoggerAdapter(logger) });
    app.get('/ok', async () => 'ok');

    const base = await app.listen({ port: 0 });
    await fetch(`${base}/ok`);
    await app.close();
    await Promise.all(logger.writes);

    const contents = await fs.readFile(path.join(dir, 'app.log'), 'utf8');
    expect(contents).toMatch(/\[info\] \[.*\] \[webserver\] Server listening at http/);
    expect(contents).toMatch(/\[info\] \[.*\] \[webserver\] incoming request \{"reqId":"req-1",/);
  });

  it('filters on the pino level scale and stays silent when asked', () => {
    const logger = new RecordingLogger('webserver');
    const adapter = new FastifyLoggerAdapter(logger);

    expect(adapter.level).toBe('trace');

    adapter.debug('debug record');
    adapter.info('info record');
    expect(logger.messages).toEqual(['debug record', 'info record']);

    adapter.level = 'warn';
    expect(adapter.level).toBe('warn');
    adapter.info('dropped');
    adapter.warn('kept');
    adapter.error('kept');
    adapter.fatal('kept');
    expect(logger.messages).toEqual(['debug record', 'info record', 'kept', 'kept', 'kept']);

    adapter.level = 'silent';
    adapter.fatal('dropped');
    adapter.silent();
    expect(logger.messages).toHaveLength(5);

    expect(() => {
      adapter.level = 'verbose';
    }).toThrow(/Unknown log level: verbose/);
  });

  it('rejects a level name every object inherits', () => {
    const adapter = new FastifyLoggerAdapter(new RecordingLogger('webserver'));

    expect(() => {
      adapter.level = 'toString';
    }).toThrow(/Unknown log level: toString/);
  });

  it('validates a route log level against the levels it exposes', async () => {
    const invalid = Fastify({ loggerInstance: new FastifyLoggerAdapter(new RecordingLogger('webserver')) });
    // A level no one knows reaches Fastify from untyped plugin code: it has to
    // be reported while the app is prepared, not while a request is served.
    invalid.register(async (instance) => {
      instance.get('/typo', { logLevel: 'verbose' as unknown as LogLevel }, async () => 'ok');
    });
    await expect(invalid.ready()).rejects.toThrow(/log level/i);

    const valid = Fastify({ loggerInstance: new FastifyLoggerAdapter(new RecordingLogger('webserver')) });
    valid.register(async (instance) => {
      instance.get('/fine', { logLevel: 'debug' }, async () => 'ok');
    });
    await expect(valid.ready()).resolves.toBeDefined();
  });

  it('formats messages, fields and errors the way pino does', () => {
    const logger = new RecordingLogger('webserver');
    const adapter = new FastifyLoggerAdapter(logger);

    adapter.info('formatted %s of %d', 'thing', 7);
    adapter.info({ user: { id: 7 } }, 'with fields');
    adapter.error(new Error('bare'));
    adapter.error({ err: new Error('field') });
    adapter.info(42);
    adapter.info({
      count: 1n,
      circular: (() => {
        const a: Record<string, unknown> = {};
        a.self = a;
        return a;
      })()
    });
    adapter.info('empty');

    expect(logger.messages[0]).toBe('formatted thing of 7');
    expect(logger.messages[1]).toBe('with fields {"user":{"id":7}}');
    expect(logger.messages[2]).toMatch(/^bare \{"err":\{"type":"Error","message":"bare","stack":/);
    expect(logger.messages[3]).toMatch(/^field \{"err":\{"type":"Error","message":"field","stack":/);
    expect(logger.messages[4]).toBe('42');
    expect(logger.messages[5]).toBe('{"count":"1","circular":{"self":"[Circular]"}}');
    expect(logger.messages[6]).toBe('empty');
  });

  it('renders a value used more than once, and only a real cycle as circular', () => {
    const logger = new RecordingLogger('webserver');
    const adapter = new FastifyLoggerAdapter(logger);
    const shared = { id: 1 };

    adapter.info({ items: [shared, shared], beside: shared });

    expect(logger.messages[0]).toBe('{"items":[{"id":1},{"id":1}],"beside":{"id":1}}');
  });

  it('keeps the bindings, level and serializers of a child', () => {
    const logger = new RecordingLogger('webserver');
    const adapter = new FastifyLoggerAdapter(logger);

    adapter.child({ reqId: 'req-7' }).info('bound record');
    expect(logger.messages[0]).toBe('bound record {"reqId":"req-7"}');

    // The serializers Fastify hands to the root child apply to the fields of every record, and
    // the per-request children Fastify derives from it keep them.
    const serializing = adapter.child(
      {},
      { serializers: { res: (value) => ({ statusCode: (value as { code: number }).code }) } }
    );
    serializing.info({ res: { code: 418 } }, 'serialized');
    serializing.child({ reqId: 'req-8' }).info({ res: { code: 500 } }, 'inherited');
    expect(logger.messages[1]).toBe('serialized {"res":{"statusCode":418}}');
    expect(logger.messages[2]).toBe('inherited {"reqId":"req-8","res":{"statusCode":500}}');

    // Fastify passes `level: ''` for routes that do not set one: that child keeps the parent's.
    adapter.level = 'error';
    expect(adapter.child({ reqId: 'req-9' }).level).toBe('error');
    expect(adapter.child({ reqId: 'req-9' }, { level: 'warn' }).level).toBe('warn');
  });

  it('never throws, even when a field cannot be read or serialized', () => {
    const logger = new RecordingLogger('webserver');
    const adapter = new FastifyLoggerAdapter(logger);

    const hostileGetter = {
      get boom(): never {
        throw new Error('getter threw');
      }
    };
    adapter.info({ hostileGetter }, 'rendered');
    expect(logger.messages[0]).toContain('rendered');
    expect(logger.messages[0]).toContain('boom');

    adapter.info(
      {
        badToJson: {
          toJSON: () => {
            throw new Error('toJSON threw');
          }
        }
      },
      'second'
    );
    expect(logger.messages[1]).toContain('second');
  });
});
