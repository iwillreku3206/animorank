import type { FastifyBaseLogger } from 'fastify';
import { format, inspect } from 'node:util';
import type { Logger } from './logger';

/** pino's bindings: the fields a child logger adds to every record. */
type Bindings = Record<string, unknown>;

/** pino's serializer: how a field such as Fastify's `req`, `res` or `err` becomes plain data. */
type FieldSerializer = (_value: unknown) => unknown;

/** The child options pino and Fastify use that have an AnimoRank equivalent. */
interface ChildOptions {
  level?: string;
  serializers?: Record<string, FieldSerializer>;
}

/** The pino levels an AnimoRank logger records. */
type RecordingLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/** The pino level names: the recording levels plus `silent`, which records nothing. */
type PinoLevel = RecordingLevel | 'silent';

/**
 * pino's levels on the numeric scale `level` filters against, exactly as pino's
 * own `levels.values` holds them — the recording levels, `silent` excluded.
 */
const PinoLevelValues = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60
} as const satisfies Record<RecordingLevel, number>;

/** The scale the adapter filters on; `silent` sits above every level, so it drops everything. */
const LevelValues: Record<PinoLevel, number> = { ...PinoLevelValues, silent: Infinity };

/** The AnimoRank method each pino level is recorded as. */
const RecordingMethods = {
  trace: 'debug',
  debug: 'debug',
  info: 'info',
  warn: 'warning',
  error: 'error',
  fatal: 'critical'
} as const satisfies Record<RecordingLevel, keyof Logger>;

/** A pino log call: `(fields, message?, ...formatArgs)` or `(message, ...formatArgs)`. */
type LogArgs = [first: unknown, ...rest: unknown[]];

/** What one log call contributes: the message, its format arguments, and the record's fields. */
interface LogRecord {
  message: unknown;
  formatArgs: unknown[];
  fields: Record<string, unknown>;
}

/**
 * Presents an AnimoRank {@link Logger} as a Fastify logger, so Fastify's own records — startup
 * lines, `incoming request` / `request completed`, route and plugin errors — reach the same
 * console or file sink as the rest of the application's logs.
 *
 * Fastify drives the pino interface, so the adapter translates rather than forwards:
 *
 * - `level` filters on pino's numeric scale. AnimoRank's loggers never filter, so the adapter
 *   starts at `trace` and drops nothing until a level is set; `silent` drops everything.
 * - `child(bindings)` renders its bindings into every record, and `serializers` — Fastify passes
 *   pino's `req`/`res`/`err` ones to the root child — reduce those objects to the plain shape a
 *   pino record carries. A Fastify request or reply has no useful JSON of its own.
 * - Each record becomes one AnimoRank message: the message with `util.format` applied to any
 *   format arguments, then the fields as JSON.
 *
 * pino's other child options (`redact`, `formatters`, `customLevels`, `msgPrefix`) have no
 * AnimoRank equivalent and are ignored.
 */
export class FastifyLoggerAdapter implements FastifyBaseLogger {
  /**
   * The level table Fastify reads when it validates a route's or a plugin's
   * `logLevel` — it does so only when `levels.values` is there. Without it a
   * typo is taken on faith and fails while a request is being served, instead
   * of when the route is declared.
   */
  public readonly levels = { values: PinoLevelValues };

  private readonly logger: Logger;
  /** Bindings accumulated by `child()`, rendered into every record. */
  private bindings: Bindings = {};
  /** Field serializers by field name; the ones Fastify hands to the root child. */
  private serializers: Record<string, FieldSerializer> = {};
  private levelName: PinoLevel = 'trace';

  public constructor(logger: Logger) {
    this.logger = logger;
  }

  public get level(): PinoLevel {
    return this.levelName;
  }

  /** As in pino, an unknown level is a programming error rather than a silent no-op. */
  public set level(level: string) {
    // `hasOwn`, not `in`: the latter accepts names every object inherits, so
    // `level = 'toString'` would silently disable filtering instead of throwing.
    if (!Object.hasOwn(LevelValues, level)) {
      throw new Error(`Unknown log level: ${level}`);
    }
    this.levelName = level as PinoLevel;
  }

  public trace(...args: LogArgs): void {
    this.record('trace', args);
  }

  public debug(...args: LogArgs): void {
    this.record('debug', args);
  }

  public info(...args: LogArgs): void {
    this.record('info', args);
  }

  public warn(...args: LogArgs): void {
    this.record('warn', args);
  }

  public error(...args: LogArgs): void {
    this.record('error', args);
  }

  public fatal(...args: LogArgs): void {
    this.record('fatal', args);
  }

  /** pino's `silent` records nothing, whether called or set as the level. */
  public silent(): void {}

  /** A logger that adds `bindings` to every record, as Fastify's per-request children do. */
  public child(bindings: Bindings, options?: ChildOptions): FastifyLoggerAdapter {
    const child = new FastifyLoggerAdapter(this.logger);

    child.bindings = { ...this.bindings, ...bindings };
    child.serializers = options?.serializers ? { ...this.serializers, ...options.serializers } : this.serializers;

    // A child inherits its parent's level; Fastify passes `level: ''` for routes that set none.
    if (options?.level) {
      child.level = options.level;
    } else {
      child.levelName = this.levelName;
    }

    return child;
  }

  private record(level: RecordingLevel, args: LogArgs): void {
    if (LevelValues[level] < LevelValues[this.levelName]) return;

    let text: string;
    try {
      const { message, formatArgs, fields } = this.read(args);
      const rendered = renderMessage(message, formatArgs);
      const data = Object.keys(fields).length === 0 ? '' : stringifyFields(fields);
      text = rendered === '' || data === '' ? rendered + data : `${rendered} ${data}`;
    } catch {
      // Logging must never take down its caller: fall back to a rendering of the raw arguments,
      // which shows (rather than invokes) whatever could not be read.
      text = inspect(args, { depth: 2, breakLength: Infinity });
    }

    this.logger[RecordingMethods[level]](text);
  }

  private read(args: LogArgs): LogRecord {
    const [first, ...rest] = args;

    if (typeof first === 'object' && first !== null) {
      // A bare Error is recorded under `err`, and either kind of error supplies a missing message.
      const object = first instanceof Error ? { err: first } : (first as Record<string, unknown>);
      const [message = object.err instanceof Error ? object.err.message : undefined, ...formatArgs] = rest;

      return { message, formatArgs, fields: this.applySerializers(object) };
    }

    // `logger.info(undefined, message)` is pino's other spelling of a message-only call.
    const [message, ...formatArgs] = first === undefined ? rest : args;
    return { message, formatArgs, fields: { ...this.bindings } };
  }

  /** The record's fields: the child bindings, then the logged object's own fields, each through its serializer. */
  private applySerializers(object: Record<string, unknown>): Record<string, unknown> {
    const fields: Record<string, unknown> = { ...this.bindings };

    for (const [key, value] of Object.entries(object)) {
      const serializer = this.serializers[key];
      if (serializer === undefined) {
        fields[key] = value;
        continue;
      }

      try {
        fields[key] = serializer(value);
      } catch {
        // A serializer that throws must not cost us the whole record.
        fields[key] = value;
      }
    }

    return fields;
  }
}

/** A message with `util.format` applied to the arguments pino allows after it. */
function renderMessage(message: unknown, formatArgs: unknown[]): string {
  if (typeof message === 'string') {
    return formatArgs.length === 0 ? message : format(message, ...formatArgs);
  }
  return message === undefined || message === null ? '' : String(message);
}

/** The record's fields as JSON, with errors, BigInts and cycles rendered rather than throwing. */
function stringifyFields(fields: Record<string, unknown>): string {
  return JSON.stringify(jsonSafe(fields, new WeakSet())) ?? '';
}

/**
 * One value as JSON-safe data. Only the objects on the path being walked count
 * as ancestors, so a reference used twice — beside itself or repeated in a list
 * — is rendered twice, and only a real cycle becomes `[Circular]`.
 */
function jsonSafe(value: unknown, ancestors: WeakSet<object>): unknown {
  if (value instanceof Error) {
    return { type: value.name, message: value.message, stack: value.stack };
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }

  // `JSON.stringify` gives a value's own `toJSON` the first word on rendering
  // it; dates and other well-behaved objects depend on that.
  const toJSON = (value as { toJSON?: unknown }).toJSON;
  if (typeof toJSON === 'function') {
    return jsonSafe((toJSON as () => unknown).call(value), ancestors);
  }

  if (ancestors.has(value)) return '[Circular]';

  ancestors.add(value);
  const safe = Array.isArray(value)
    ? value.map((item) => jsonSafe(item, ancestors))
    : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonSafe(item, ancestors)]));
  ancestors.delete(value);

  return safe;
}
