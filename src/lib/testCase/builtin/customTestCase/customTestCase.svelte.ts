import CustomTestCaseEditor from './CustomTestCaseEditor.svelte';
import CustomTestCaseDisplay from './CustomTestCaseDisplay.svelte';
import { TestCase } from '$lib/testCase/testCase.svelte';
import type { TestCaseEditor, TestCaseDisplay } from '$lib/testCase/types';
import z from 'zod';
import { type ProblemTestCase as TestCaseModel } from '$lib/zenstack/models';
import type { Problem } from '$lib/problem';

export type CustomTestCaseData = {
  test_code: string;
};

export type CustomTestCaseRunInfo = {
  exitCode: number;
  stderr: string;
};

export const CustomTestCaseDataSchema = z.object({
  test_code: z.string().default('')
});

export class CustomTestCase extends TestCase<CustomTestCaseData, CustomTestCaseRunInfo> {
  static id() {
    return 'custom';
  }

  static async create(problem: Problem) {
    const res = await fetch('/api/test-case', {
      method: 'POST',
      body: JSON.stringify({ problem: problem.id, type: this.id() }),
      headers: { 'content-type': 'application/json' }
    });
    const model = await res.json();
    return new CustomTestCase(model, problem);
  }

  constructor(model: TestCaseModel, problem: Problem) {
    const parsed = CustomTestCaseDataSchema.parse(model.data);
    super(model, problem, { test_code: parsed.test_code });
  }

  get editor(): TestCaseEditor {
    return CustomTestCaseEditor as unknown as TestCaseEditor;
  }

  get display(): TestCaseDisplay<CustomTestCaseRunInfo> {
    return CustomTestCaseDisplay as unknown as TestCaseDisplay<CustomTestCaseRunInfo>;
  }
}
