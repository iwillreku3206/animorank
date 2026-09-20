import { CodeEditorState } from '$lib/editor/code';
import { CodeExecutor } from '$lib/executor';
import { type IntoJsonValue } from '$lib/types/utils';
import { parseSlots } from '$lib/utils/parseSlots';
import { StdioTestCaseLanguage, type StdioRunOutcome } from '../../stdioTestCaseLanguage.server';

export class CStdioTestCase extends StdioTestCaseLanguage {
  protected async runProgram(executor: CodeExecutor, state: IntoJsonValue): Promise<StdioRunOutcome> {
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

    // Judge0 collapses a timeout into a single entry with no exit code, so the
    // run slot can be missing entirely; an absent exit code fails in grading.
    const compile = result.processOutputs[0];
    const run = result.processOutputs[1];

    return {
      stdout: run?.stdout?.toString('utf8') ?? '',
      runExitCode: run?.exitCode,
      compileExitCode: compile?.exitCode,
      compilerOutput: compile?.exitCode !== 0 ? compile?.stderr?.toString('utf8') : undefined
    };
  }
}
