import { describe, expect, it } from 'vitest';
import { ServerTestCaseRegistry } from '$lib/testCase/testCaseRegistry.server';
import { Problem } from '$lib/problem';
import type { Problem as ProblemModel, ProblemTestCase } from '$lib/zenstack/models';
import { CLanguage } from '$lib/language/c';
import { CodeExecutor } from '$lib/executor';
import type { ExecutionRequest, ExecutionResult } from '$lib/executor/types';

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
  it('hydrates the old schema data from the model', async () => {
    const serverTestCase = await new ServerTestCaseRegistry().from(makeTestCaseModel(), new Problem(problemModel));
    expect(serverTestCase.testCase.data).toEqual({ input: '5\n', output: '25\n' });
  });

  it('compiles the submission and feeds the test input on stdin', async () => {
    captured = undefined;
    const serverTestCase = await new ServerTestCaseRegistry().from(makeTestCaseModel(), new Problem(problemModel));
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
    const serverTestCase = await new ServerTestCaseRegistry().from(makeTestCaseModel(), new Problem(problemModel));
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
    const serverTestCase = await new ServerTestCaseRegistry().from(makeTestCaseModel(), new Problem(problemModel));
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
    const serverTestCase = await new ServerTestCaseRegistry().from(makeTestCaseModel(), new Problem(problemModel));
    const result = await serverTestCase.run(new CLanguage(), new TimeoutExecutor(), { sections: { body: '' } });

    // Judge0 status 5 collapses to a single entry with no exit code; the
    // binding must fail cleanly instead of crashing on the missing run entry.
    expect(result).toMatchObject({ success: false, runInfo: { expected: '25\n', actual: '' } });
  });

  it('fails when stdout differs from the expected output', async () => {
    const model = makeTestCaseModel({ data: { input: '5\n', output: '26\n' } });
    const serverTestCase = await new ServerTestCaseRegistry().from(model, new Problem(problemModel));
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

    const serverTestCase = await new ServerTestCaseRegistry().from(makeTestCaseModel(), new Problem(problemModel));
    const result = await serverTestCase.run(new CLanguage(), new CompileFailExecutor(), {
      sections: { body: '' }
    });

    expect(result).toMatchObject({ success: false, compilerOutput: 'error: stray' });
  });

  it('omits runInfo for hidden test cases', async () => {
    const serverTestCase = await new ServerTestCaseRegistry().from(
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
    const serverTestCase = await new ServerTestCaseRegistry().from(makeTestCaseModel(), new Problem(slotsProblem));
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

    const serverTestCase = await new ServerTestCaseRegistry().from(makeTestCaseModel(), new Problem(problemModel));
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

    const serverTestCase = await new ServerTestCaseRegistry().from(
      makeTestCaseModel({ public: false }),
      new Problem(problemModel)
    );
    const result = await serverTestCase.run(new CLanguage(), new ThrowingExecutor(), {
      sections: { body: '' }
    });

    expect(result).toEqual({ success: false, testCaseInfo: { public: false } });
  });
});
