import { describe, expect, it } from 'vitest';
import { ServerTestCaseRegistry } from '$lib/testCase/testCaseRegistry.server';
import { Problem } from '$lib/problem';
import type { Problem as ProblemModel, ProblemTestCase } from '$lib/zenstack/models';
import { CLanguage } from '$lib/language/c';
import { CodeExecutor } from '$lib/executor';
import type { ExecutionRequest, ExecutionResult } from '$lib/executor/types';
import { outputMatches, type WhitespaceMode } from './stdioTestCase.svelte';
import { toJsonValue } from '$lib/types/utils';

const problemModel = {
  id: 'problem-1',
  name: 'Test problem',
  description: '',
  starter_code: '',
  visible: false,
  uses_slots: false,
  language: 'c',
  difficulty_id: null,
  subject_id: null,
  extension_data: {}
} as unknown as ProblemModel;

const makeTestCaseModel = (overrides: Partial<ProblemTestCase> = {}) =>
  ({
    id: 'test-case-1',
    type: 'stdio',
    problem_id: 'problem-1',
    public: true,
    data: {
      input: '5\n',
      output: '25\n'
    },
    ...overrides
  }) as unknown as ProblemTestCase;

let captured: ExecutionRequest | undefined;

class StubExecutor extends CodeExecutor {
  public async execute(req: ExecutionRequest): Promise<ExecutionResult> {
    captured = req;
    return {
      processOutputs: [{ exitCode: 0 }, { exitCode: 0, stdout: Buffer.from('25\n') }],
      fileOutputs: []
    };
  }
}

const stub = new StubExecutor();

describe('ServerStdioTestCase', () => {
  it('hydrates the old schema data from the model', () => {
    const serverTestCase = ServerTestCaseRegistry.instance().from(makeTestCaseModel(), new Problem(problemModel));
    // A row written before the mode existed hydrates with the default rather
    // than with the field missing, so nothing has to be backfilled.
    expect(serverTestCase.testCase.data).toEqual({ input: '5\n', output: '25\n', whitespace: 'trim_output' });
  });

  it('survives the round trip the editor autosave performs', () => {
    const model = makeTestCaseModel({ data: { input: '', output: '25', whitespace: 'trim_output' } });
    const serverTestCase = ServerTestCaseRegistry.instance().from(model, new Problem(problemModel));

    // This is literally what the editor writes back to the row on every
    // keystroke. `toJsonValue` throws on an undefined member, so a mode that
    // hydrated wrong would break saving outright rather than quietly.
    expect(toJsonValue(serverTestCase.testCase.data)).toEqual({
      input: '',
      output: '25',
      whitespace: 'trim_output'
    });
  });

  it('carries the whitespace mode through hydration', () => {
    const model = makeTestCaseModel({ data: { input: '', output: '25', whitespace: 'trim_lines' } });
    const serverTestCase = ServerTestCaseRegistry.instance().from(model, new Problem(problemModel));
    // The editor autosaves whatever hydration produced. A field dropped here
    // is silently deleted from the row on the instructor's next keystroke.
    expect(serverTestCase.testCase.data).toEqual({ input: '', output: '25', whitespace: 'trim_lines' });
  });

  it('compiles the submission and feeds the test input on stdin', async () => {
    captured = undefined;
    const serverTestCase = ServerTestCaseRegistry.instance().from(makeTestCaseModel(), new Problem(problemModel));
    await serverTestCase.run(new CLanguage(), stub, {
      sections: { body: 'int main() { int x; scanf("%d", &x); printf("%d\\n", x * x); }' }
    });

    const submission = captured!.files.find((f) => f.path === 'main.c')!;
    expect(submission.content.toString('utf8')).toContain('scanf');
    expect(captured!.processes).toHaveLength(2);
    expect(captured!.processes[0].command).toBe('gcc');
    expect(captured!.processes[1].command).toBe('./program');
    expect(captured!.processes[1].stdin?.toString('utf8')).toBe('5\n');
  });

  it('passes when stdout matches the expected output', async () => {
    const serverTestCase = ServerTestCaseRegistry.instance().from(makeTestCaseModel(), new Problem(problemModel));
    const result = await serverTestCase.run(new CLanguage(), stub, { sections: { body: '' } });

    expect(result).toMatchObject({
      success: true,
      runInfo: { expected: '25\n', actual: '25\n' }
    });
  });

  it('fails on a nonzero exit even when stdout matches the expected output', async () => {
    class NonZeroExitExecutor extends CodeExecutor {
      public async execute(): Promise<ExecutionResult> {
        return {
          processOutputs: [{ exitCode: 0 }, { exitCode: 1, stdout: Buffer.from('25\n') }],
          fileOutputs: []
        };
      }
    }
    const serverTestCase = ServerTestCaseRegistry.instance().from(makeTestCaseModel(), new Problem(problemModel));
    const result = await serverTestCase.run(new CLanguage(), new NonZeroExitExecutor(), { sections: { body: '' } });

    // A crashing/exiting program must fail even if its partial stdout matches.
    expect(result).toMatchObject({ success: false, runInfo: { expected: '25\n', actual: '25\n' } });
  });

  it('fails without crashing on the judge0 timeout shape (single processOutput entry)', async () => {
    class TimeoutExecutor extends CodeExecutor {
      public async execute(): Promise<ExecutionResult> {
        return {
          processOutputs: [{ exitCode: undefined }],
          fileOutputs: []
        };
      }
    }
    const serverTestCase = ServerTestCaseRegistry.instance().from(makeTestCaseModel(), new Problem(problemModel));
    const result = await serverTestCase.run(new CLanguage(), new TimeoutExecutor(), { sections: { body: '' } });

    // Judge0 status 5 collapses to a single entry with no exit code; the
    // binding must fail cleanly instead of crashing on the missing run entry.
    expect(result).toMatchObject({ success: false, runInfo: { expected: '25\n', actual: '' } });
  });

  it('fails when stdout differs from the expected output', async () => {
    const model = makeTestCaseModel({ data: { input: '5\n', output: '26\n' } });
    const serverTestCase = ServerTestCaseRegistry.instance().from(model, new Problem(problemModel));
    const result = await serverTestCase.run(new CLanguage(), stub, { sections: { body: '' } });

    expect(result).toMatchObject({
      success: false,
      runInfo: { expected: '26\n', actual: '25\n' }
    });
  });

  it('reports compile errors in compilerOutput', async () => {
    class CompileFailExecutor extends CodeExecutor {
      public async execute(): Promise<ExecutionResult> {
        return {
          processOutputs: [{ exitCode: 1, stderr: Buffer.from('error: stray') }],
          fileOutputs: []
        };
      }
    }

    const serverTestCase = ServerTestCaseRegistry.instance().from(makeTestCaseModel(), new Problem(problemModel));
    const result = await serverTestCase.run(new CLanguage(), new CompileFailExecutor(), {
      sections: { body: '' }
    });

    expect(result).toMatchObject({ success: false, compilerOutput: 'error: stray' });
  });

  it('omits runInfo for hidden test cases', async () => {
    const serverTestCase = ServerTestCaseRegistry.instance().from(
      makeTestCaseModel({ public: false }),
      new Problem(problemModel)
    );
    const result = await serverTestCase.run(new CLanguage(), stub, { sections: { body: '' } });

    // Hidden results must not leak the model (its `data` holds expected output).
    expect(result).toMatchObject({ success: true, testCaseInfo: { public: false } });
    expect(result.testCaseInfo).toEqual({ public: false });
    expect(result).not.toHaveProperty('runInfo');
  });

  it('assembles slot code into the submission for slots problems', async () => {
    captured = undefined;
    const slotsProblem = {
      ...problemModel,
      uses_slots: true,
      starter_code: ['int main() {', '%slot code%', '%endslot code%', 'return 0;', '}'].join('\n')
    } as unknown as ProblemModel;
    const serverTestCase = ServerTestCaseRegistry.instance().from(makeTestCaseModel(), new Problem(slotsProblem));
    await serverTestCase.run(new CLanguage(), stub, { sections: { code: 'printf("hello\\n");' } });

    const submission = captured!.files.find((f) => f.path === 'main.c')!;
    expect(submission.content.toString('utf8')).toBe(
      ['int main() {', 'printf("hello\\n");', 'return 0;', '}'].join('\n')
    );
  });

  it('returns a valid failed result when the executor throws', async () => {
    class ThrowingExecutor extends CodeExecutor {
      public async execute(): Promise<ExecutionResult> {
        throw new Error('Judge0 is not configured');
      }
    }

    const serverTestCase = ServerTestCaseRegistry.instance().from(makeTestCaseModel(), new Problem(problemModel));
    const result = await serverTestCase.run(new CLanguage(), new ThrowingExecutor(), {
      sections: { body: '' }
    });

    expect(result).toMatchObject({
      success: false,
      runInfo: { expected: '25\n', actual: '' },
      failureReason: 'Judge0 is not configured'
    });
  });

  it('omits failure details for hidden test cases when the executor throws', async () => {
    class ThrowingExecutor extends CodeExecutor {
      public async execute(): Promise<ExecutionResult> {
        throw new Error('Judge0 is not configured');
      }
    }

    const serverTestCase = ServerTestCaseRegistry.instance().from(
      makeTestCaseModel({ public: false }),
      new Problem(problemModel)
    );
    const result = await serverTestCase.run(new CLanguage(), new ThrowingExecutor(), {
      sections: { body: '' }
    });

    expect(result).toEqual({ success: false, testCaseInfo: { public: false } });
  });
});

const MODES = ['strict', 'trim_output', 'trim_lines'] as const satisfies readonly WhitespaceMode[];

// Each row states what the pair should do under strict / trim_output /
// trim_lines, so reading across a row shows exactly what each mode forgives.
const comparisonCases: Array<{
  name: string;
  expected: string;
  actual: string;
  matches: [boolean, boolean, boolean];
}> = [
  { name: 'identical outputs', expected: '25\n', actual: '25\n', matches: [true, true, true] },
  { name: 'both empty', expected: '', actual: '', matches: [true, true, true] },

  // The case this whole feature exists for: the program prints a closing
  // newline, the expected output was typed into a textarea without one.
  { name: 'missing final newline', expected: '25', actual: '25\n', matches: [false, true, true] },
  { name: 'extra blank lines at the end', expected: '25', actual: '25\n\n\n', matches: [false, true, true] },
  { name: 'trailing spaces at the end', expected: '25', actual: '25   ', matches: [false, true, true] },
  { name: 'trailing CRLF', expected: '25', actual: '25\r\n', matches: [false, true, true] },
  { name: 'whitespace-only against empty', expected: '', actual: '\n  \n', matches: [false, true, true] },

  // Only per-line trimming reaches whitespace at the end of an interior line.
  { name: 'trailing space on an interior line', expected: '1\n2\n', actual: '1 \n2\n', matches: [false, false, true] },
  {
    name: 'trailing space and tab on every line',
    expected: 'a\nb\nc',
    actual: 'a \nb\t\nc ',
    matches: [false, false, true]
  },
  {
    name: 'interior trailing space plus missing final newline',
    expected: '1\n2',
    actual: '1 \n2\n',
    matches: [false, false, true]
  },

  // Nothing forgives whitespace that is not at the end of something.
  { name: 'leading whitespace', expected: '25', actual: ' 25', matches: [false, false, false] },
  { name: 'interior double space', expected: '1 2', actual: '1  2', matches: [false, false, false] },
  { name: 'extra interior blank line', expected: '1\n2', actual: '1\n\n2', matches: [false, false, false] },
  { name: 'genuinely different values', expected: '25', actual: '26', matches: [false, false, false] }
];

describe('outputMatches', () => {
  it.each(comparisonCases)('$name', ({ expected, actual, matches }) => {
    MODES.forEach((mode, i) => {
      expect({ mode, matches: outputMatches(expected, actual, mode) }).toEqual({ mode, matches: matches[i] });
    });
  });

  it('never gets stricter as the mode loosens', () => {
    // The ladder is the promise the editor makes to an instructor: moving down
    // the list only ever forgives more. A future edit that breaks it (say, a
    // per-line trim that stops dropping trailing blank lines) fails here
    // rather than quietly failing students.
    const violations = comparisonCases.flatMap(({ name, expected, actual }) => {
      const results = MODES.map((mode) => outputMatches(expected, actual, mode));
      return MODES.flatMap((mode, i) =>
        i > 0 && results[i - 1] && !results[i] ? [`${name}: ${MODES[i - 1]} accepted it but ${mode} rejected it`] : []
      );
    });

    expect(violations).toEqual([]);
  });
});

describe('the mode reaches the verdict', () => {
  const ranWith = async (stdout: string, expected: string, whitespace?: WhitespaceMode) => {
    class OutputExecutor extends CodeExecutor {
      public async execute(): Promise<ExecutionResult> {
        return {
          processOutputs: [{ exitCode: 0 }, { exitCode: 0, stdout: Buffer.from(stdout) }],
          fileOutputs: []
        };
      }
    }
    const model = makeTestCaseModel({ data: { input: '', output: expected, ...(whitespace && { whitespace }) } });
    const serverTestCase = ServerTestCaseRegistry.instance().from(model, new Problem(problemModel));
    return serverTestCase.run(new CLanguage(), new OutputExecutor(), { sections: { body: '' } });
  };

  it('grades as trim_output when the data carries no mode', async () => {
    // Every test case written before the mode existed lands here, and so does
    // any data assigned without going through the schema.
    expect(await ranWith('25\n', '25')).toMatchObject({ success: true });
    // Only the end of the output is forgiven: an interior line's trailing
    // space still fails, which is what separates the default from trim_lines.
    expect(await ranWith('1 \n2\n', '1\n2')).toMatchObject({ success: false });
  });

  it('honours trim_output from the test case data', async () => {
    expect(await ranWith('25\n', '25', 'trim_output')).toMatchObject({ success: true });
    expect(await ranWith('1 \n2\n', '1\n2', 'trim_output')).toMatchObject({ success: false });
  });

  it('honours trim_lines from the test case data', async () => {
    expect(await ranWith('1 \n2\n', '1\n2', 'trim_lines')).toMatchObject({ success: true });
  });

  it('reports the raw stdout whatever the mode forgives', async () => {
    // The display shows what the program actually printed; only the verdict
    // bends.
    expect(await ranWith('25\n\n', '25', 'trim_output')).toMatchObject({
      success: true,
      runInfo: { expected: '25', actual: '25\n\n' }
    });
  });
});
