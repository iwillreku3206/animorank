import FunctionTestCaseEditor from './FunctionTestCaseEditor.svelte';
import FunctionTestCaseDisplay from './FunctionTestCaseDisplay.svelte';
import { TestCase } from '$lib/testCase/testCase.svelte';
import type { TestCaseEditor, TestCaseDisplay } from '$lib/testCase/types';
import z from 'zod';
import { Comparison, getComparisonSchema } from './comparison.svelte';
import {
  ParameterValueSchema,
  parseSymbol,
  type FunctionTestCaseProblemData,
  type ParameterValue,
  type Symbol
} from './types';
import { type ProblemTestCase as TestCaseModel } from '$lib/zenstack/models';
import type { JsonValue } from '@zenstackhq/orm';
import { GlobalRegistryProvider } from '$lib/registry/global';
import { OperatorRegistry } from './operatorRegistry';
import { TypeRegistry } from './typeRegistry';
import { TypeValue } from './typeValue.svelte';
import type { Type } from './type.svelte';
import type { Problem } from '$lib/problem';
import deepEqual from 'deep-equal';

export type FunctionTestCaseData = {
  function: string;
  parameters: ParameterValue[];
  comparisons: Comparison[];
};

export type FunctionTestCaseRunInfo =
  | {
      comparisons: {
        symbol: Symbol;
        expected: TypeValue;
        actual: TypeValue;
        result: boolean;
      }[];
    }
  | {
      /**
       * Why the run produced no comparison results:
       * - `compile_error`: compilation failed (stderr in the result's
       *   `compilerOutput`).
       * - `output_not_generated`: compilation succeeded but the export files
       *   never appeared.
       * - `run_error`: the run process crashed/exited non-zero (was
       *   `output_not_generated`).
       * - `timeout`: the executor killed the run (Judge0 status 5).
       */
      failure: 'compile_error' | 'output_not_generated' | 'run_error' | 'timeout';
      exitCode?: number;
      stderr?: string;
    };

let functionTestCaseDataSchema: ReturnType<typeof buildFunctionTestCaseDataSchema> | undefined;

function buildFunctionTestCaseDataSchema() {
  return z.object({
    function: z.string(),
    parameters: z.array(ParameterValueSchema),
    comparisons: z.array(getComparisonSchema())
  });
}

/**
 * Lazily built: the provider import graph (types → registry/global →
 * testCaseRegistry → functionTestCase) is cyclic at module-eval, so schemas
 * must not reference cross-module bindings until first use.
 */
export function getFunctionTestCaseDataSchema() {
  return (functionTestCaseDataSchema ??= buildFunctionTestCaseDataSchema());
}

export class FunctionTestCase extends TestCase<FunctionTestCaseData, FunctionTestCaseRunInfo> {
  static id() {
    return 'function';
  }

  static async create(problem: Problem) {
    const res = await fetch('/api/test-case', {
      method: 'POST',
      body: JSON.stringify({ problem: problem.id, type: this.id() }),
      headers: { 'content-type': 'application/json' }
    });
    const model = await res.json();
    return FunctionTestCase.from(model, problem);
  }

  /**
   * Hydrate a persisted test case, resolving every serialized type/operator
   * through the registries. Canonical construction path for stored rows; the
   * sync constructor only builds an empty shell (the registries cannot be
   * awaited there).
   */
  public static async from(model: TestCaseModel, problem: Problem): Promise<FunctionTestCase> {
    const parsed = getFunctionTestCaseDataSchema().parse(model.data);
    const opRegistry = GlobalRegistryProvider.instance().getRegistry(OperatorRegistry);
    const typeRegistry = GlobalRegistryProvider.instance().getRegistry(TypeRegistry);
    const problemData = await problem.functionData();

    const comparisons = await Promise.all(
      parsed.comparisons.map(async (comparison) =>
        Comparison.from({
          symbol: parseSymbol(comparison.symbol),
          operator: await opRegistry.from(comparison.operator),
          value: new TypeValue(await typeRegistry.from(comparison.value), comparison.value.data)
        })
      )
    );
    const parameters = await Promise.all(
      parsed.parameters.map(async (parameter, i) => {
        // The definition's parameter type is authoritative; fall back to the
        // stored value's own type so a row referencing a deleted function,
        // an out-of-range parameter, or a not-yet-typed definition parameter
        // still loads (degrading to a visible row instead of being silently
        // dropped, or 500ing the run endpoint). syncParameters re-types
        // values against the definition once it is complete again.
        const definitionType = problemData.functions[parsed.function]?.parameters[i]?.type;
        const type = definitionType ?? (await typeRegistry.from(parameter.value));

        return {
          id: parameter.id,
          name: parameter.name,
          value: new TypeValue(type, parameter.value.data)
        };
      })
    );

    return new FunctionTestCase(model, problem, { function: parsed.function, comparisons, parameters });
  }

  constructor(model: TestCaseModel, problem: Problem, data?: FunctionTestCaseData) {
    super(model, problem, data ?? { function: '', parameters: [], comparisons: [] });
  }

  /**
   * Select the function under test, resetting the parameter list to default values.
   */
  public async selectFunction(fnName: string): Promise<void> {
    const def = (await this.problem.functionData()).functions[fnName];
    this.data = {
      function: fnName,
      // Parameters without a type cannot get a value yet; they are omitted
      // from the reset and backfilled by syncParameters once the author
      // types them in the Functions window.
      parameters: def
        ? def.parameters
            .filter((p) => p.type !== null)
            .map((p) => ({ id: p.id, name: p.name, value: p.type!.defaultValue() }))
        : [],
      comparisons: []
    };
  }

  /**
   * Keep the stored parameter list in sync with the function definition,
   * filling in default values for parameters that were added since the test
   * case was created.
   *
   * Stored values are matched to definition parameters by stable id, so a
   * removed or reordered parameter keeps its value attached (M8). Legacy
   * id-less entries fall back to name, then to position; every matched value
   * is backfilled with the definition parameter's id so the next sync can
   * match exactly.
   */
  public async syncParameters(functions: FunctionTestCaseProblemData): Promise<void> {
    const fn = functions.functions[this.data.function];
    if (!fn) return;

    if (!fn.parameters.some((p) => !p.type)) {
      const original = this.data.parameters;
      const remaining = [...original];
      const params = fn.parameters.map((p, i) => {
        // Match by id, then name (legacy), then position. Matches are
        // consumed so an ambiguous name is never reused for a later
        // parameter.
        const existing =
          (p.id ? remaining.find((s) => s.id && s.id === p.id) : undefined) ??
          (!p.id && p.name ? remaining.find((s) => !s.id && s.name === p.name) : undefined) ??
          remaining[i];
        if (existing) remaining.splice(remaining.indexOf(existing), 1);

        if (!existing) return { id: p.id, name: p.name, value: p.type!.defaultValue() };

        const sameType =
          existing.value.type.id === p.type!.id &&
          deepEqual(existing.value.type.options, p.type!.options, { strict: true });

        const id = p.id ?? existing.id;
        if (existing.name === p.name && sameType && existing.id === id) return existing;
        return {
          id,
          name: p.name,
          value: sameType ? existing.value : new TypeValue(p.type!, existing.value.value)
        };
      });

      if (params.length !== original.length || params.some((p, i) => p !== original[i])) {
        this.data = { ...this.data, parameters: params };
      }
    }

    // The function signature changed: comparisons referencing a symbol whose
    // type changed (return type or a parameter type) follow along.
    for (const comparison of this.data.comparisons) {
      await this.syncComparisonValue(comparison, functions);
    }
  }

  public setParameterValue(i: number, value: TypeValue): void {
    this.data.parameters[i].value = value;
  }

  public async setComparisonSymbol(i: number, symbol: Symbol): Promise<void> {
    this.data.comparisons[i].symbol = symbol;
    await this.syncComparisonValue(this.data.comparisons[i]);
  }

  /**
   * The type a comparison symbol compares against: the function's return type
   * for `return`, or the Nth parameter's type for `paramN`.
   */
  private async symbolType(symbol: Symbol, functions?: FunctionTestCaseProblemData): Promise<Type | null> {
    const fn = (functions ?? (await this.problem.functionData())).functions[this.data.function];
    if (!fn) return null;
    if (symbol === 'return') return fn.returnType[0] ?? null;
    const param = symbol.match(/^param(\d+)$/);
    if (!param) return null;
    return fn.parameters[parseInt(param[1], 10)]?.type ?? null;
  }

  /**
   * Keep a comparison's value type in sync with its symbol's type. When they
   * differ the value resets to the new type's default so the value editor and
   * the comparator always work against the symbol's actual type.
   */
  private async syncComparisonValue(comparison: Comparison, functions?: FunctionTestCaseProblemData): Promise<void> {
    const type = await this.symbolType(comparison.symbol, functions);
    if (!type) return;
    const { value } = comparison;
    if (value.type.id !== type.id || !deepEqual(value.type.options, type.options, { strict: true })) {
      comparison.value = type.defaultValue();
    }
  }

  public async setComparisonOperator(i: number, key: string): Promise<void> {
    const operator = (await GlobalRegistryProvider.instance().getRegistry(OperatorRegistry).getStatic(key)).create();
    this.data.comparisons[i].operator = operator;
  }

  public setComparisonValue(i: number, value: TypeValue): void {
    this.data.comparisons[i].value = value;
  }

  public async addComparison(): Promise<void> {
    const fn = (await this.problem.functionData()).functions[this.data.function];
    const returnType = fn?.returnType[0];
    // Void returns (and missing/untyped return slots) cannot be compared:
    // the harness never emits a return export file for them, so the
    // comparison could never run.
    if (!returnType || returnType.isVoid) return;

    // Default to `equal`: it is the only operator registered for every value
    // type (int/float/string/pointer), so a comparison created for a
    // string/pointer-returning function actually runs. The previous default —
    // the first registered operator, less_than — only supports int/float and
    // made every default comparison on such functions fail at run time with
    // "Service string not found".
    const registry = GlobalRegistryProvider.instance().getRegistry(OperatorRegistry);
    const keys = registry.keys();
    const defaultKey = keys.includes('equal') ? 'equal' : keys[0];
    if (!defaultKey) return;

    const operator = (await registry.getStatic(defaultKey)).create();
    const comparison = Comparison.create(returnType, operator);
    this.data = { ...this.data, comparisons: [...this.data.comparisons, comparison] };
  }

  public removeComparison(i: number): void {
    this.data = { ...this.data, comparisons: this.data.comparisons.filter((_, j) => j !== i) };
  }

  get editor(): TestCaseEditor {
    return FunctionTestCaseEditor as unknown as TestCaseEditor;
  }

  get display(): TestCaseDisplay<FunctionTestCaseRunInfo> {
    return FunctionTestCaseDisplay as unknown as TestCaseDisplay<FunctionTestCaseRunInfo>;
  }

  /**
   * The runInfo arrives over the wire as plain JSON; re-hydrate the comparison
   * values into TypeValue instances for the display components.
   */
  public async hydrateRunInfo(runInfo: FunctionTestCaseRunInfo): Promise<FunctionTestCaseRunInfo> {
    if ('failure' in runInfo) return runInfo;
    // The run endpoint's catch branch sends `runInfo: []` for public tests
    // whose execution threw — not a comparisons shape, nothing to hydrate.
    if (!('comparisons' in runInfo)) return runInfo;
    type Serialized = { type: string; options: unknown; data: JsonValue };
    const typeRegistry = GlobalRegistryProvider.instance().getRegistry(TypeRegistry);
    const hydrate = async (v: unknown): Promise<TypeValue> =>
      new TypeValue(
        await typeRegistry.from({ type: (v as Serialized).type, options: (v as Serialized).options }),
        (v as Serialized).data
      );
    return {
      comparisons: await Promise.all(
        runInfo.comparisons.map(async (c) => ({
          ...c,
          expected: await hydrate(c.expected),
          actual: await hydrate(c.actual)
        }))
      )
    };
  }
}
