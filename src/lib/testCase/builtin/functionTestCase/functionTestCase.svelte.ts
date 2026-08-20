import FunctionTestCaseEditor from './FunctionTestCaseEditor.svelte';
import FunctionTestCaseDisplay from './FunctionTestCaseDisplay.svelte';
import { TestCase } from '$lib/testCase/testCase.svelte';
import type { TestCaseEditor, TestCaseDisplay } from '$lib/testCase/types';
import z from 'zod';
import { Comparison, ComparisonSchema } from './comparison.svelte';
import {
  ParameterValueSchema,
  parseSymbol,
  type FunctionTestCaseProblemData,
  type ParameterValue,
  type Symbol
} from './types';
import { type ProblemTestCase as TestCaseModel } from '$lib/zenstack/models';
import type { JsonValue } from '@zenstackhq/orm';
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
       * The run process exited abnormally (crash, signal, non-zero exit) so
       * the harness never wrote the export files. Distinct from a comparison
       * failure: the values were never produced.
       */
      failure: 'output_not_generated';
      exitCode?: number;
      stderr?: string;
    };

export const FunctionTestCaseDataSchema = z.object({
  function: z.string(),
  parameters: z.array(ParameterValueSchema),
  comparisons: z.array(ComparisonSchema)
});

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
    return new FunctionTestCase(model, problem);
  }

  constructor(model: TestCaseModel, problem: Problem) {
    const parsed = FunctionTestCaseDataSchema.parse(model.data);
    const opRegistry = OperatorRegistry.instance();
    const typeRegistry = TypeRegistry.instance();
    const problemData = problem.functionData;

    const data: FunctionTestCaseData = {
      function: parsed.function,
      comparisons: parsed.comparisons.map((comparison) =>
        Comparison.from({
          symbol: parseSymbol(comparison.symbol),
          operator: opRegistry.from(comparison.operator),
          value: new TypeValue(typeRegistry.from(comparison.value), comparison.value.data)
        })
      ),
      parameters: parsed.parameters.map((parameter, i) => {
        const type = problemData.functions[parsed.function].parameters[i].type!;

        return {
          id: parameter.id,
          name: parameter.name,
          value: new TypeValue(type, parameter.value.data)
        };
      })
    };
    super(model, problem, data);
  }

  /**
   * Select the function under test, resetting the parameter list to default values.
   */
  public selectFunction(fnName: string): void {
    const def = this.problem.functionData.functions[fnName];
    this.data = {
      function: fnName,
      parameters: def ? def.parameters.map((p) => ({ id: p.id, name: p.name, value: p.type!.defaultValue() })) : [],
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
  public syncParameters(functions: FunctionTestCaseProblemData): void {
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
      this.syncComparisonValue(comparison, functions);
    }
  }

  public setParameterValue(i: number, value: TypeValue): void {
    this.data.parameters[i].value = value;
  }

  public setComparisonSymbol(i: number, symbol: Symbol): void {
    this.data.comparisons[i].symbol = symbol;
    this.syncComparisonValue(this.data.comparisons[i]);
  }

  /**
   * The type a comparison symbol compares against: the function's return type
   * for `return`, or the Nth parameter's type for `paramN`.
   */
  private symbolType(symbol: Symbol, functions: FunctionTestCaseProblemData = this.problem.functionData): Type | null {
    const fn = functions.functions[this.data.function];
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
  private syncComparisonValue(comparison: Comparison, functions?: FunctionTestCaseProblemData): void {
    const type = this.symbolType(comparison.symbol, functions);
    if (!type) return;
    const { value } = comparison;
    if (value.type.id !== type.id || !deepEqual(value.type.options, type.options, { strict: true })) {
      comparison.value = type.defaultValue();
    }
  }

  public setComparisonOperator(i: number, key: string): void {
    const operator = OperatorRegistry.instance().getStatic(key).create();
    this.data.comparisons[i].operator = operator;
  }

  public setComparisonValue(i: number, value: TypeValue): void {
    this.data.comparisons[i].value = value;
  }

  public addComparison(): void {
    const fn = this.problem.functionData.functions[this.data.function];
    const returnType = fn?.returnType[0];
    const operators = [...OperatorRegistry.instance().keys()];
    if (!returnType || operators.length === 0) return;
    const operator = OperatorRegistry.instance().getStatic(operators[0]).create();
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
  public hydrateRunInfo(runInfo: FunctionTestCaseRunInfo): FunctionTestCaseRunInfo {
    if ('failure' in runInfo) return runInfo;
    type Serialized = { type: string; options: unknown; data: JsonValue };
    const typeRegistry = TypeRegistry.instance();
    const hydrate = (v: unknown): TypeValue =>
      new TypeValue(
        typeRegistry.from({ type: (v as Serialized).type, options: (v as Serialized).options }),
        (v as Serialized).data
      );
    return {
      comparisons: runInfo.comparisons.map((c) => ({
        ...c,
        expected: hydrate(c.expected),
        actual: hydrate(c.actual)
      }))
    };
  }
}
