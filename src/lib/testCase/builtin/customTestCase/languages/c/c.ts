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

// Pre-main execution attributes let submission code run before the test's
// main() — i.e. before the validator in main.c ever executes. A student can
// smuggle `__attribute__((constructor)) void cheat() { exit(0); }` past the
// main strip above, and the combined binary then exits 0 without the
// validator running, passing the test case. Strip constructor/destructor
// attributes (both spellings, optional priority) and .init_array/.fini_array
// section attributes so nothing in the submission can run before main. The
// functions themselves are left in place (they become plain, never-called
// code). NOTE: these are regexes, not a lexer — attribute text inside string
// literals/comments would also be removed; revisit when the main strip is
// replaced with the lexer-aware scanner.
const preMainAttrRegex =
  /__attribute__\s*\(\s*\(\s*(?:__)?(?:constructor|destructor)(?:__)?\s*(?:\(\s*\d+\s*\))?\s*\)\s*\)/g;
const preMainSectionRegex =
  /__attribute__\s*\(\s*\(\s*(?:__)?section(?:__)?\s*\(\s*["']\.(?:init|fini)_array["']\s*\)\s*\)\s*\)/g;

export class CCustomTestCase extends TestCaseLanguage<ServerCustomTestCase> {
  public async execute(executor: CodeExecutor, state: IntoJsonValue): Promise<TestCaseResult<CustomTestCaseRunInfo>> {
    const codeState = new CodeEditorState(state);
    const { problem, data } = this.testCase.testCase;
    const previousCode = problem.uses_slots
      ? parseSlots(problem.starter_code, codeState.sections).fullCode
      : (codeState.sections['body'] ?? '');

    const submission = previousCode
      .replaceAll('\r\n', '\n')
      .replaceAll(preMainAttrRegex, '')
      .replaceAll(preMainSectionRegex, '')
      .replaceAll(mainRegex, '');

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
      // Hidden results carry no details: not the model (which contains
      // `data` — the test_code), no runInfo, nothing but the success flag.
      return {
        success,
        testCaseInfo: { public: false }
      };
    }
  }
}
