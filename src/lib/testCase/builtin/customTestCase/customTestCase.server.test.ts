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
    type: 'custom',
    problem_id: 'problem-1',
    public: true,
    data: {
      test_code: 'int main() { return 0; }'
    },
    ...overrides
  }) as unknown as ProblemTestCase;

let captured: ExecutionRequest | undefined;

class StubExecutor extends CodeExecutor {
  public async execute(req: ExecutionRequest): Promise<ExecutionResult> {
    captured = req;
    return {
      processOutputs: [{ exitCode: 0 }, { exitCode: 0, stderr: Buffer.from('') }],
      fileOutputs: []
    };
  }
}

const stub = new StubExecutor();

describe('ServerCustomTestCase', () => {
  it('hydrates the old schema data from the model', () => {
    const serverTestCase = ServerTestCaseRegistry.instance().from(makeTestCaseModel(), new Problem(problemModel));
    expect(serverTestCase.testCase.data).toEqual({ test_code: 'int main() { return 0; }' });
  });

  it('strips the submission main and links the test code as main.c', async () => {
    captured = undefined;
    const serverTestCase = ServerTestCaseRegistry.instance().from(makeTestCaseModel(), new Problem(problemModel));
    await serverTestCase.run(new CLanguage(), stub, {
      sections: {
        body: 'int square(int x) { return x * x; }\nint main() { printf("hi"); return 0; }'
      }
    });

    const submission = captured!.files.find((f) => f.path === 'submission.c')!;
    expect(submission.content.toString('utf8')).toContain('int square(int x)');
    expect(submission.content.toString('utf8')).not.toContain('main');

    const main = captured!.files.find((f) => f.path === 'main.c')!;
    expect(main.content.toString('utf8')).toBe('int main() { return 0; }');

    expect(captured!.processes).toHaveLength(2);
    expect(captured!.processes[0].command).toBe('gcc');
    expect(captured!.processes[1].command).toBe('./program');
  });

  it('removes constructor attributes that would bypass the validator', async () => {
    captured = undefined;
    const serverTestCase = ServerTestCaseRegistry.instance().from(makeTestCaseModel(), new Problem(problemModel));
    await serverTestCase.run(new CLanguage(), stub, {
      sections: {
        body: [
          '#include <stdlib.h>',
          '',
          '__attribute__((constructor)) void cheat() { exit(0); }',
          '',
          'int main() { printf("hi"); return 0; }'
        ].join('\n')
      }
    });

    const submission = captured!.files.find((f) => f.path === 'submission.c')!.content.toString('utf8');
    // The attribute is gone, so the function can no longer run before the
    // validator's main; the function itself is left behind as inert code.
    expect(submission).not.toContain('constructor');
    expect(submission).toContain('void cheat()');
    expect(submission).not.toContain('main');
  });

  it('removes destructor, priority, spelling, and init_array attribute variants', async () => {
    captured = undefined;
    const serverTestCase = ServerTestCaseRegistry.instance().from(makeTestCaseModel(), new Problem(problemModel));
    await serverTestCase.run(new CLanguage(), stub, {
      sections: {
        body: [
          '__attribute__((destructor)) void bye() {}',
          '__attribute__((constructor(101))) void prio() {}',
          '__attribute__((__constructor__)) void c2() {}',
          '__attribute__((section(".init_array"))) void (*init)() = 0;',
          'int main() { return 0; }'
        ].join('\n')
      }
    });

    const submission = captured!.files.find((f) => f.path === 'submission.c')!.content.toString('utf8');
    expect(submission).not.toContain('constructor');
    expect(submission).not.toContain('destructor');
    expect(submission).not.toContain('.init_array');
    expect(submission).not.toContain('main');
  });

  it('passes when the test program exits with code 0', async () => {
    const serverTestCase = ServerTestCaseRegistry.instance().from(makeTestCaseModel(), new Problem(problemModel));
    const result = await serverTestCase.run(new CLanguage(), stub, { sections: { body: '' } });

    expect(result).toMatchObject({ success: true, runInfo: { exitCode: 0 } });
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
    expect(result).toMatchObject({ success: false });
    if ('runInfo' in result) {
      expect(result.runInfo).toHaveProperty('exitCode');
    }
  });

  it('fails when the test program exits nonzero, surfacing stderr', async () => {
    class FailingExecutor extends CodeExecutor {
      public async execute(): Promise<ExecutionResult> {
        return {
          processOutputs: [{ exitCode: 0 }, { exitCode: 1, stderr: Buffer.from('assert failed: got 3, want 5') }],
          fileOutputs: []
        };
      }
    }

    const serverTestCase = ServerTestCaseRegistry.instance().from(makeTestCaseModel(), new Problem(problemModel));
    const result = await serverTestCase.run(new CLanguage(), new FailingExecutor(), {
      sections: { body: '' }
    });

    expect(result).toMatchObject({
      success: false,
      runInfo: { exitCode: 1, stderr: 'assert failed: got 3, want 5' }
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

    // Hidden results must not leak the model (its `data` holds test_code).
    expect(result).toMatchObject({ success: true, testCaseInfo: { public: false } });
    expect(result.testCaseInfo).toEqual({ public: false });
    expect(result).not.toHaveProperty('runInfo');
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
      runInfo: { exitCode: 1, stderr: '' },
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
