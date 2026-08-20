import { CodeEditorState } from '$lib/editor/code';
import { type ProblemTestCase as TestCaseModel } from '$lib/zenstack/models';
import { CodeExecutor } from '$lib/executor';
import { TestCaseLanguage } from '$lib/testCase/testCaseLanguage.server';
import type { TestCaseResult } from '$lib/testCase/types';
import { type IntoJsonValue } from '$lib/types/utils';
import { parseSlots } from '$lib/utils/parseSlots';
import type { ServerCustomTestCase } from '../../customTestCase.server';
import type { CustomTestCaseRunInfo } from '../../customTestCase.svelte';

// Strip the student's own main() so the test code (which provides the real
// main) can link against the submission. Same pattern as the legacy
// customTestCase: the regex removes every `int/void main(...) { ... }` block.
const mainRegex = /(int|void) main\s*\([A-Za-z0-9 ,\\*]*\)\s*\{(.|\s)*\}/g;

export class CCustomTestCase extends TestCaseLanguage<ServerCustomTestCase> {
  public async execute(executor: CodeExecutor, state: IntoJsonValue): Promise<TestCaseResult<CustomTestCaseRunInfo>> {
    const codeState = new CodeEditorState(state);
    const { problem, data } = this.testCase.testCase;
    const previousCode = problem.uses_slots
      ? parseSlots(problem.starter_code, codeState.sections).fullCode
      : (codeState.sections['body'] ?? '');

    const submission = previousCode.replaceAll('\r\n', '\n').replaceAll(mainRegex, '');

    const result = await executor.execute({
      files: [
        { path: 'submission.c', content: Buffer.from(submission, 'utf8') },
        { path: 'main.c', content: Buffer.from(data.test_code, 'utf8') }
      ],
      processes: [
        // Same flags as the legacy customTestCase compile.sh (which globbed
        // all .c files; the file list is explicit here).
        { command: 'gcc', args: ['-Werror', '-Wall', '-o', 'program', 'main.c', 'submission.c', '-lm', '-lpthread'] },
        { command: './program', args: [] }
      ]
    });

    const compile = result.processOutputs[0];
    const run = result.processOutputs[1];
    const success = compile?.exitCode === 0 && run?.exitCode === 0;
    const compilerOutput = compile?.exitCode !== 0 ? compile?.stderr?.toString('utf8') : undefined;

    if (this.testCase.testCase.model.public === true) {
      return {
        success,
        runInfo: { exitCode: run?.exitCode ?? 1, stderr: run?.stderr?.toString('utf8') ?? '' },
        testCaseInfo: this.testCase.testCase.model as TestCaseModel & { public: true },
        compilerOutput
      };
    } else {
      return {
        success,
        testCaseInfo: this.testCase.testCase.model as TestCaseModel & { public: false }
      };
    }
  }
}
