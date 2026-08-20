import StdioTestCaseEditor from './StdioTestCaseEditor.svelte';
import StdioTestCaseDisplay from './StdioTestCaseDisplay.svelte';
import { TestCase } from '$lib/testCase/testCase.svelte';
import type { TestCaseEditor, TestCaseDisplay } from '$lib/testCase/types';
import z from 'zod';
import { type ProblemTestCase as TestCaseModel } from '$lib/zenstack/models';
import type { Problem } from '$lib/problem';

export type StdioTestCaseData = {
  input: string;
  output: string;
};

export type StdioTestCaseRunInfo = {
  expected: string;
  actual: string;
};

export const StdioTestCaseDataSchema = z.object({
  input: z.string().default(''),
  output: z.string().default('')
});

export class StdioTestCase extends TestCase<StdioTestCaseData, StdioTestCaseRunInfo> {
  static id() {
    return 'stdio';
  }

  static async create(problem: Problem) {
    const res = await fetch('/api/test-case', {
      method: 'POST',
      body: JSON.stringify({ problem: problem.id, type: this.id() }),
      headers: { 'content-type': 'application/json' }
    });
    const model = await res.json();
    return new StdioTestCase(model, problem);
  }

  constructor(model: TestCaseModel, problem: Problem) {
    const parsed = StdioTestCaseDataSchema.parse(model.data);
    super(model, problem, { input: parsed.input, output: parsed.output });
  }

  get editor(): TestCaseEditor {
    return StdioTestCaseEditor as unknown as TestCaseEditor;
  }

  get display(): TestCaseDisplay<StdioTestCaseRunInfo> {
    return StdioTestCaseDisplay as unknown as TestCaseDisplay<StdioTestCaseRunInfo>;
  }
}
