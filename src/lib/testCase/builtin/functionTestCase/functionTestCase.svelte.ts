import FunctionTestCaseEditor from './FunctionTestCaseEditor.svelte';
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
import { OperatorRegistry } from './operatorRegistry';
import { TypeRegistry } from './typeRegistry';
import { TypeValue } from './typeValue.svelte';
import type { Problem } from '$lib/problem';
import deepEqual from 'deep-equal';

export type FunctionTestCaseData = {
  function: string;
  parameters: ParameterValue[];
  comparisons: Comparison[];
};

export type FunctionTestCaseRunInfo = {
  comparisons: {
    symbol: Symbol;
    expected: TypeValue;
    actual: TypeValue;
  }[];
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
      parameters: def ? def.parameters.map((p) => ({ name: p.name, value: p.type!.defaultValue() })) : [],
      comparisons: []
    };
  }

  /**
   * Keep the stored parameter list in sync with the function definition, filling in
   * default values for parameters that were added since the test case was created.
   */
  public syncParameters(functions: FunctionTestCaseProblemData): void {
    const fn = functions.functions[this.data.function];
    if (!fn || fn.parameters.some((p) => !p.type)) return;

    const stored = this.data.parameters;
    const params = fn.parameters.map((p, i) => {
      const existing = stored[i];
      if (!existing) return { name: p.name, value: p.type!.defaultValue() };

      const sameName = existing.name === p.name;
      const sameType =
        existing.value.type.id === p.type!.id &&
        deepEqual(existing.value.type.options, p.type!.options, { strict: true });

      if (sameName && sameType) return existing;
      return {
        name: p.name,
        value: sameType ? existing.value : new TypeValue(p.type!, existing.value.value)
      };
    });

    if (params.length !== stored.length || params.some((p, i) => p !== stored[i])) {
      this.data = { ...this.data, parameters: params };
    }
  }

  public setParameterValue(i: number, value: TypeValue): void {
    this.data.parameters[i].value = value;
  }

  public setComparisonSymbol(i: number, symbol: Symbol): void {
    this.data.comparisons[i].symbol = symbol;
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
    throw new Error('Method not implemented.');
  }
}
