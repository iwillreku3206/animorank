import { CodeEditorState } from '$lib/editor/code';
import { type ProblemTestCase as TestCaseModel } from '$lib/zenstack/models';
import { CodeExecutor } from '$lib/executor';
import { TestCaseLanguage } from '$lib/testCase/testCaseLanguage.server';
import type { TestCaseResult } from '$lib/testCase/types';
import { type IntoJsonValue } from '$lib/types/utils';
import { parseSlots } from '$lib/utils/parseSlots';
import type { ServerStdioTestCase } from '../../stdioTestCase.server';
import type { StdioTestCaseRunInfo } from '../../stdioTestCase.svelte';

export class CStdioTestCase extends TestCaseLanguage<ServerStdioTestCase> {
  public async execute(executor: CodeExecutor, state: IntoJsonValue): Promise<TestCaseResult<StdioTestCaseRunInfo>> {
    const codeState = new CodeEditorState(state);
    const { problem, data } = this.testCase.testCase;
    const previousCode = problem.uses_slots
      ? parseSlots(problem.starter_code, codeState.sections).fullCode
      : (codeState.sections['body'] ?? '');

    const result = await executor.execute({
      files: [{ path: 'main.c', content: Buffer.from(previousCode, 'utf8') }],
      processes: [
        // Same flags as the legacy programIOTestCase compile.sh
        { command: 'gcc', args: ['-Werror', '-Wall', '-o', 'program', 'main.c', '-lm', '-lpthread'] },
        { command: './program', args: [], stdin: Buffer.from(data.input, 'utf8') }
      ]
    });

    const compile = result.processOutputs[0];
    const run = result.processOutputs[1];
    const actual = run?.stdout?.toString('utf8') ?? '';
    const success = compile?.exitCode === 0 && run?.exitCode === 0 && actual === data.output;
    const compilerOutput = compile?.exitCode !== 0 ? compile?.stderr?.toString('utf8') : undefined;

    if (this.testCase.testCase.model.public === true) {
      return {
        success,
        runInfo: { expected: data.output, actual },
        testCaseInfo: this.testCase.testCase.model as TestCaseModel & { public: true },
        compilerOutput
      };
    } else {
      // Hidden results carry no details: not the model (which contains
      // `data` — the expected output), no runInfo, nothing but the flag.
      return {
        success,
        testCaseInfo: { public: false }
      };
    }
  }
}
