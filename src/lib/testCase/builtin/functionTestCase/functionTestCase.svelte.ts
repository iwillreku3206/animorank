import { TestCase } from '$lib/testCase/testCase.svelte';
import type { TestCaseEditor, TestCaseDisplay } from '$lib/testCase/types';
import z from 'zod';
import { Comparison, ComparisonSchema } from './comparison.svelte';
import { loadExtensionData, ParameterValueSchema, parseSymbol, type ParameterValue, type Symbol } from './types';
import { type ProblemTestCase as TestCaseModel } from '$lib/zenstack/models';
import { OperatorRegistry } from './operatorRegistry';
import { TypeValue } from './typeValue.svelte';
import type { Problem } from '$lib/problem';
import { ServerTestCase } from '$lib/testCase/testCase.server';

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
    const baseTestCase = await ServerTestCase.create(this.id(), problem, {
      comparisons: [],
      parameters: [],
      function: ''
    } satisfies FunctionTestCaseData);
    return new FunctionTestCase(baseTestCase, problem);
  }

  constructor(model: TestCaseModel, problem: Problem) {
    const parsed = FunctionTestCaseDataSchema.parse(model.data);
    const opRegistry = OperatorRegistry.instance();

    const problemData = loadExtensionData(problem);

    const data: FunctionTestCaseData = {
      function: parsed.function,
      comparisons: parsed.comparisons.map((comparison) =>
        Comparison.from({
          symbol: parseSymbol(comparison.symbol),
          operator: opRegistry.getInstance(comparison.operator.type, comparison.operator.options),
          value: comparison.value
        })
      ),
      parameters: parsed.parameters.map((parameter, i) => {
        const type = problemData.functions[this.data.function].parameters[i].type;

        return {
          name: parameter.name,
          value: new TypeValue(type, parameter.value)
        };
      })
    };
    super(model, problem, data);
  }

  get editor(): TestCaseEditor {
    throw new Error('Method not implemented.');
  }

  get display(): TestCaseDisplay<FunctionTestCaseRunInfo> {
    throw new Error('Method not implemented.');
  }
}
