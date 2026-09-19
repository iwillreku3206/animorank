import StdioTestCaseEditor from './StdioTestCaseEditor.svelte';
import StdioTestCaseDisplay from './StdioTestCaseDisplay.svelte';
import { TestCase } from '$lib/testCase/testCase.svelte';
import type { TestCaseEditor, TestCaseDisplay } from '$lib/testCase/types';
import z from 'zod';
import { type ProblemTestCase as TestCaseModel } from '$lib/zenstack/models';
import type { Problem } from '$lib/problem';

/**
 * How much whitespace slack the grader allows when comparing a run's stdout to
 * the expected output. The three form a ladder: any pair that matches at one
 * level also matches at every looser level, so an instructor moving down the
 * list never gets a stricter result.
 */
export const WhitespaceModeSchema = z.enum(['strict', 'trim_output', 'trim_lines']).default('strict');
export type WhitespaceMode = z.infer<typeof WhitespaceModeSchema>;

/**
 * The modes as the instructor meets them, in ladder order. Kept beside the
 * enum so a mode can never be added without wording to go with it, and so the
 * editor has no list of its own to drift out of step.
 */
export const WhitespaceModeOptions: ReadonlyArray<{ value: WhitespaceMode; label: string }> = [
  { value: 'strict', label: 'Match exactly' },
  { value: 'trim_output', label: 'Ignore whitespace at the end of the output' },
  { value: 'trim_lines', label: 'Ignore whitespace at the end of every line' }
];

export type StdioTestCaseData = {
  input: string;
  output: string;
  /**
   * Optional because `data` can be assigned directly, without going through
   * the schema that supplies the default. Absent reads as 'strict', which is
   * how every test case written before the mode existed was graded.
   */
  whitespace?: WhitespaceMode;
};

export type StdioTestCaseRunInfo = {
  expected: string;
  actual: string;
};

export const StdioTestCaseDataSchema = z.object({
  input: z.string().default(''),
  output: z.string().default(''),
  whitespace: WhitespaceModeSchema
});

/**
 * Reduce an output to the form its mode compares in.
 *
 * `strict` keeps every byte. `trim_output` forgives whitespace at the very end
 * of the output -- the common case of a program ending on a newline that the
 * expected output was typed without. `trim_lines` forgives whitespace at the
 * end of every line, and then drops the output's own trailing blank lines so
 * that it stays a superset of `trim_output` rather than accidentally being
 * stricter about the final newline.
 */
function normalize(output: string, mode: WhitespaceMode): string {
  switch (mode) {
    case 'strict':
      return output;
    case 'trim_output':
      return output.trimEnd();
    case 'trim_lines':
      return output
        .split('\n')
        .map((line) => line.trimEnd())
        .join('\n')
        .trimEnd();
  }
}

/** Whether a run's stdout counts as the expected output under `mode`. */
export function outputMatches(expected: string, actual: string, mode: WhitespaceMode): boolean {
  return normalize(expected, mode) === normalize(actual, mode);
}

export class StdioTestCase extends TestCase<StdioTestCaseData, StdioTestCaseRunInfo> {
  static id() {
    return 'stdio';
  }

  static displayName = 'stdio Tests';

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
    // Every field the schema parses has to be listed here. A field left out is
    // dropped on hydration, and the editor's autosave then writes the stripped
    // object straight back over the row.
    super(model, problem, { input: parsed.input, output: parsed.output, whitespace: parsed.whitespace });
  }

  get editor(): TestCaseEditor {
    return StdioTestCaseEditor as unknown as TestCaseEditor;
  }

  get display(): TestCaseDisplay<StdioTestCaseRunInfo> {
    return StdioTestCaseDisplay as unknown as TestCaseDisplay<StdioTestCaseRunInfo>;
  }
}
