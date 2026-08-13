import FunctionTestCaseEditor from './FunctionTestCaseEditor.svelte';
import { TestCase } from '$lib/testCase/testCase.svelte';
import type { TestCaseEditor, TestCaseDisplay } from '$lib/testCase/types';
import z from 'zod';
import { Comparison, ComparisonSchema } from './comparison.svelte';
import { ParameterValueSchema, parseSymbol, type ParameterValue, type Symbol } from './types';
import { type ProblemTestCase as TestCaseModel } from '$lib/zenstack/models';
import { OperatorRegistry } from './operatorRegistry';
import { TypeRegistry } from './typeRegistry';
import { TypeValue } from './typeValue.svelte';
import type { Problem } from '$lib/problem';

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

  get editor(): TestCaseEditor {
    return FunctionTestCaseEditor as unknown as TestCaseEditor;
  }

  get display(): TestCaseDisplay<FunctionTestCaseRunInfo> {
    throw new Error('Method not implemented.');
  }
}
