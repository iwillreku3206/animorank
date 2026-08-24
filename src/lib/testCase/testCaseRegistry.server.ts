import type { Problem } from '$lib/problem';
import { ServiceRegistry, type ClassServiceOf } from '$lib/services/registry';
import { ServerFunctionTestCase } from './builtin/functionTestCase/functionTestCase.server';
import { ServerStdioTestCase } from './builtin/stdioTestCase/stdioTestCase.server';
import { ServerCustomTestCase } from './builtin/customTestCase/customTestCase.server';
import type { ServerTestCase } from './testCase.server';
import type { TestCaseLanguageRegistry } from './testCaseLanguageRegistry.server';
import type { ProblemTestCase as TestCaseModel } from '$lib/zenstack/models';
import { FunctionTestCaseDataSchema } from './builtin/functionTestCase/functionTestCase.svelte';
import { StdioTestCaseDataSchema } from './builtin/stdioTestCase/stdioTestCase.svelte';
import { CustomTestCaseDataSchema } from './builtin/customTestCase/customTestCase.svelte';
import type z from 'zod';

/** Per-type zod schemas for validating test case `data` payloads before write. */
const dataSchemas: Record<string, z.ZodType> = {
  [ServerFunctionTestCase.id()]: FunctionTestCaseDataSchema,
  [ServerStdioTestCase.id()]: StdioTestCaseDataSchema,
  [ServerCustomTestCase.id()]: CustomTestCaseDataSchema
};

export class ServerTestCaseRegistry extends ServiceRegistry<
  ServerTestCase,
  [TestCaseModel, Problem],
  {
    id(): string;
    // eslint-disable-next-line no-unused-vars
    create(problem: Problem): Promise<ServerTestCase>;
    languageRegistry: TestCaseLanguageRegistry;
  }
> {
  private static _instance: ServerTestCaseRegistry | null;

  public static instance(): ServerTestCaseRegistry {
    if (!ServerTestCaseRegistry._instance) {
      ServerTestCaseRegistry._instance = new ServerTestCaseRegistry();
    }
    return ServerTestCaseRegistry._instance;
  }

  constructor() {
    super();
    this.registerTest(ServerFunctionTestCase);
    this.registerTest(ServerStdioTestCase);
    this.registerTest(ServerCustomTestCase);
  }

  public registerTest(value: ClassServiceOf<this>): void {
    super.register(value.id(), value);
  }

  public from(model: TestCaseModel, problem: Problem) {
    return this.getInstance(model.type, model, problem);
  }

  /**
   * Validate a test case update payload before it is written: `type` must be
   * a registered key, `public` must be a boolean, and — when `data` is
   * supplied and a schema is registered for the effective type (the new type
   * when given, otherwise the row's current type) — `data` must parse against
   * that schema. Throws a descriptive Error on the first violation so an
   * unparseable row is never written (it would become invisible in the editor
   * and permanently fail runs).
   */
  public validateUpdate(options: { type?: string; public?: unknown; data?: unknown }, existingType: string): void {
    if (options.type !== undefined && !this.keys().includes(options.type)) {
      throw new Error(`Unknown test case type "${options.type}"`);
    }
    if (options.public !== undefined && typeof options.public !== 'boolean') {
      throw new Error('public must be a boolean');
    }
    if (options.data !== undefined) {
      const schema = dataSchemas[options.type ?? existingType];
      if (!schema) return;
      const parsed = schema.safeParse(options.data);
      if (!parsed.success) {
        throw new Error(`Invalid data for test case type "${options.type ?? existingType}": ${parsed.error.message}`);
      }
    }
  }
}
