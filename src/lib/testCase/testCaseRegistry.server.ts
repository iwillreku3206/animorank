import type { Problem } from '$lib/problem';
import { ServiceRegistry, type ClassServiceOf } from '$lib/services/registry';
import { ServerFunctionTestCase } from './builtin/functionTestCase/functionTestCase.server';
import { ServerStdioTestCase } from './builtin/stdioTestCase/stdioTestCase.server';
import { ServerCustomTestCase } from './builtin/customTestCase/customTestCase.server';
import type { ServerTestCase, TestCaseUpdateOptions } from './testCase.server';
import type { TestCaseLanguageRegistry } from './testCaseLanguageRegistry.server';
import type { ProblemTestCase as TestCaseModel } from '$lib/zenstack/models';

export class ServerTestCaseRegistry extends ServiceRegistry<
  ServerTestCase,
  [TestCaseModel, Problem],
  {
    id(): string;
    // eslint-disable-next-line no-unused-vars
    create(problem: Problem): Promise<ServerTestCase>;
    languageRegistry: TestCaseLanguageRegistry;
    validateUpdate(options: TestCaseUpdateOptions, existingType: string): void;
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
   * a registered key; the rest is delegated to the effective type's class
   * static `validateUpdate` (public flag, data against the class's own
   * schema, and type-change-requires-data). No test case type is hard-coded
   * here — every kind validates itself. Throws a descriptive Error on the
   * first violation so an unparseable row is never written (it would become
   * invisible in the editor and permanently fail runs).
   */
  public validateUpdate(options: TestCaseUpdateOptions, existingType: string): void {
    if (options.type !== undefined && !this.keys().includes(options.type)) {
      throw new Error(`Unknown test case type "${options.type}"`);
    }
    this.getStatic(options.type ?? existingType).validateUpdate(options, existingType);
  }
}
