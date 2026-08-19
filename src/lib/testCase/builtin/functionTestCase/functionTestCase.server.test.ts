import { describe, expect, it } from 'vitest';
import { stringify } from 'devalue';
import { ServerTestCaseRegistry } from '$lib/testCase/testCaseRegistry.server';
import { Problem } from '$lib/problem';
import { toJsonValue } from '$lib/types/utils';
import type { Problem as ProblemModel, ProblemTestCase } from '$lib/zenstack/models';
import { FunctionTestCase, type FunctionTestCaseRunInfo } from './functionTestCase.svelte';
import { TypeValue } from './typeValue.svelte';
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
  extension_data: {
    builtin_testCase_function: {
      functions: {
        fn1: {
          name: 'square',

          parameters: [{ name: 'x', type: { type: 'int', options: { size: 32, signed: null } } }],
          returnType: [{ type: 'int', options: { size: 32, signed: null } }]
        }
      }
    }
  }
} as unknown as ProblemModel;

const makeTestCaseModel = () =>
  ({
    id: 'test-case-1',
    type: 'function',
    problem_id: 'problem-1',
    data: {
      function: 'fn1',

      parameters: [{ name: 'x', value: { type: 'int', options: { size: 32, signed: null }, data: { value: '0' } } }],
      comparisons: []
    }
  }) as unknown as ProblemTestCase;

describe('ServerFunctionTestCase', () => {
  it('keeps the hydrated data class-backed in the model', () => {
    const testCaseModel = makeTestCaseModel();
    const serverTestCase = ServerTestCaseRegistry.instance().from(testCaseModel, new Problem(problemModel));

    const testCase = serverTestCase.testCase as FunctionTestCase;
    expect(testCase.data.parameters[0].value.type.id).toBe('int');
  });

  it('converts to a plain JSON value at the serialization boundary', () => {
    const testCaseModel = makeTestCaseModel();
    const serverTestCase = ServerTestCaseRegistry.instance().from(testCaseModel, new Problem(problemModel));

    const converted = toJsonValue(serverTestCase.testCase.data) as {
      parameters: { value: unknown }[];
    };
    expect(converted.parameters[0].value).toEqual({
      type: 'int',
      options: { size: 32, signed: null },
      data: { value: '0' }
    });

    // The SvelteKit load serializer must accept the converted model.
    expect(() => stringify({ ...testCaseModel, data: converted })).not.toThrow();
  });
});

describe('CFunctionTestCase codegen with new types', () => {
  const problem = {
    id: 'problem-2',
    name: 'New types problem',
    description: '',
    starter_code: '',
    visible: false,
    uses_slots: false,
    language: 'c',
    difficulty_id: null,
    subject_id: null,
    extension_data: {
      builtin_testCase_function: {
        functions: {
          fn1: {
            name: 'work',
            parameters: [
              { name: 'p', type: { type: 'pointer', options: { target: 'int' } } },
              { name: 'f', type: { type: 'float', options: { size: 32 } } },
              { name: 's', type: { type: 'string', options: {} } }
            ],
            returnType: [{ type: 'void', options: {} }]
          }
        }
      }
    }
  } as unknown as ProblemModel;

  const model = {
    id: 'test-case-2',
    type: 'function',
    problem_id: 'problem-2',
    data: {
      function: 'fn1',
      parameters: [
        { name: 'p', value: { type: 'pointer', options: { target: 'int' }, data: { value: '5' } } },
        { name: 'f', value: { type: 'float', options: { size: 32 }, data: { value: '1.5' } } },
        { name: 's', value: { type: 'string', options: {}, data: { value: 'hi' } } }
      ],
      comparisons: []
    }
  } as unknown as ProblemTestCase;

  it('emits pointer, float, string code and a plain void call', () => {
    const serverTestCase = ServerTestCaseRegistry.instance().from(model, new Problem(problem));

    // generateCode is private; reach it the way the load debug block does.
    const [code] = (
      serverTestCase.languageRegistry.getInstance('c', serverTestCase) as never as {
        generateCode(): [string, string[]];
      }
    ).generateCode();

    expect(code).toContain('void work(int*');
    expect(code).toContain('float');
    expect(code).toContain('char*');
    expect(code).toContain('= 5;');
    expect(code).toContain('= 1.5f;');
    expect(code).toContain('"hi"');
    expect(code).toContain('&');
    // void return: no result symbol, direct call without assignment
    expect(code).not.toContain('= work(');
  });
});

describe('CFunctionTestCase execute', () => {
  const problem = {
    ...problemModel,
    id: 'problem-3',
    uses_slots: false
  } as unknown as ProblemModel;

  const makeModel = (overrides: Partial<ProblemTestCase> = {}) =>
    ({
      ...makeTestCaseModel(),
      public: true,
      data: {
        function: 'fn1',
        parameters: [{ name: 'x', value: { type: 'int', options: { size: 32, signed: null }, data: { value: 3 } } }],
        comparisons: [
          {
            symbol: 'return',
            operator: { type: 'equal', options: {} },
            value: { type: 'int', options: { size: 32, signed: null }, data: { value: 5 } }
          }
        ]
      },
      ...overrides
    }) as unknown as ProblemTestCase;

  let captured: ExecutionRequest | undefined;

  class StubExecutor extends CodeExecutor {
    public async execute(req: ExecutionRequest): Promise<ExecutionResult> {
      captured = req;
      return {
        processOutputs: [{ exitCode: 0 }, { exitCode: 0 }],
        fileOutputs: [
          { path: '__ar_test_return', content: Buffer.from('5') },
          { path: '__ar_test_param0', content: Buffer.from('3') }
        ]
      };
    }
  }

  const stub = new StubExecutor();

  it('executes a public non-slots test case and assembles the submission', async () => {
    captured = undefined;
    const serverTestCase = ServerTestCaseRegistry.instance().from(makeModel(), new Problem(problem));
    const result = await serverTestCase.run(new CLanguage(), stub, {
      sections: { body: 'int square(int x) { return 5; }' }
    });

    expect(result.success).toBe(true);
    if ('runInfo' in result) {
      expect(result.runInfo.comparisons[0]).toMatchObject({
        symbol: 'return',
        result: true,
        expected: { value: { value: 5 } },
        actual: { value: { value: '5' } }
      });
    }

    const submission = captured!.files.find((f) => f.path === 'submission.c')!;
    expect(submission.content.toString('utf8')).toContain('int square(int x) { return 5; }');
    expect(captured!.processes).toHaveLength(2);
    expect(captured!.processes[1].command).toBe('./__ar_test_main');
  });

  it('returns no runInfo for hidden test cases', async () => {
    captured = undefined;
    const serverTestCase = ServerTestCaseRegistry.instance().from(makeModel({ public: false }), new Problem(problem));
    const result = await serverTestCase.run(new CLanguage(), stub, {
      sections: { body: 'int square(int x) { return 5; }' }
    });

    expect(result).toMatchObject({ success: true, testCaseInfo: { public: false } });
    expect(result).not.toHaveProperty('runInfo');
  });

  it('assembles slot code into the submission for slots problems', async () => {
    captured = undefined;
    const slotsProblem = {
      ...problem,
      uses_slots: true,
      starter_code: ['int main() {', '%slot code%', '%endslot code%', 'return 0;', '}'].join('\n')
    } as unknown as ProblemModel;
    const serverTestCase = ServerTestCaseRegistry.instance().from(makeModel(), new Problem(slotsProblem));
    await serverTestCase.run(new CLanguage(), stub, { sections: { code: 'int square(int x) { return x * x; }' } });

    const submission = captured!.files.find((f) => f.path === 'submission.c')!;
    expect(submission.content.toString('utf8')).toBe(
      ['int main() {', 'int square(int x) { return x * x; }', 'return 0;', '}'].join('\n')
    );
  });
});

describe('FunctionTestCase hydrateRunInfo', () => {
  it('re-hydrates wire JSON comparisons into TypeValue-backed values', () => {
    const serverTestCase = ServerTestCaseRegistry.instance().from(makeTestCaseModel(), new Problem(problemModel));
    const testCase = serverTestCase.testCase as FunctionTestCase;

    // runInfo as it arrives over the wire: plain JSON, not class instances
    const runInfo = {
      comparisons: [
        {
          symbol: 'return',
          result: true,
          expected: { type: 'int', options: { size: 32, signed: null }, data: { value: '5' } },
          actual: { type: 'int', options: { size: 32, signed: null }, data: { value: '5' } }
        }
      ]
    } as unknown as FunctionTestCaseRunInfo;

    const hydrated = testCase.hydrateRunInfo(runInfo);

    expect(hydrated.comparisons[0]).toMatchObject({ symbol: 'return', result: true });
    expect(hydrated.comparisons[0].expected).toBeInstanceOf(TypeValue);
    expect(hydrated.comparisons[0].expected.value).toEqual({ value: '5' });
    expect(hydrated.comparisons[0].actual).toBeInstanceOf(TypeValue);
    expect(hydrated.comparisons[0].actual.value).toEqual({ value: '5' });
  });
});
