import { describe, expect, it } from 'vitest';
import { stringify } from 'devalue';
import { ServerTestCaseRegistry } from '$lib/testCase/testCaseRegistry.server';
import { Problem } from '$lib/problem';
import { toJsonValue } from '$lib/types/utils';
import type { Problem as ProblemModel, ProblemTestCase } from '$lib/zenstack/models';
import { FunctionTestCase, type FunctionTestCaseRunInfo } from './functionTestCase.svelte';
import { ServerFunctionTestCase } from './functionTestCase.server';
import { stripMain, CFunctionTestCase } from './languages/c/c';
import { Pointer } from './types/pointer';
import { TypeValue } from './typeValue.svelte';
import { parseExtensionData } from './types';
import { validateFunctionTestCaseKeys } from './types.server';
import { TypeRegistry } from './typeRegistry';
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
  it('keeps the hydrated data class-backed in the model', async () => {
    const testCaseModel = makeTestCaseModel();
    const serverTestCase = await new ServerTestCaseRegistry().from(testCaseModel, new Problem(problemModel));

    const testCase = serverTestCase.testCase as FunctionTestCase;
    expect(testCase.data.parameters[0].value.type.id).toBe('int');
  });

  it('converts to a plain JSON value at the serialization boundary', async () => {
    const testCaseModel = makeTestCaseModel();
    const serverTestCase = await new ServerTestCaseRegistry().from(testCaseModel, new Problem(problemModel));

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

  it('hydrates parameters from stored types when the function definition is missing', async () => {
    const testCaseModel = {
      ...makeTestCaseModel(),
      data: {
        function: 'missing',
        parameters: [{ name: 'x', value: { type: 'int', options: { size: 32, signed: null }, data: { value: '3' } } }],
        comparisons: []
      }
    } as unknown as ProblemTestCase;
    const serverTestCase = await new ServerTestCaseRegistry().from(testCaseModel, new Problem(problemModel));
    const testCase = serverTestCase.testCase as FunctionTestCase;

    expect(testCase.data.parameters[0].value.type.id).toBe('int');
    expect(testCase.data.parameters[0].value.value).toEqual({ value: '3' });
  });

  it('hydrates parameters from stored types when a definition parameter is untyped', async () => {
    const untypedProblem = {
      ...problemModel,
      extension_data: {
        builtin_testCase_function: {
          functions: {
            fn1: {
              name: 'square',
              parameters: [{ name: 'x', type: null }],
              returnType: [{ type: 'int', options: { size: 32, signed: null } }]
            }
          }
        }
      }
    } as unknown as ProblemModel;
    const serverTestCase = await new ServerTestCaseRegistry().from(makeTestCaseModel(), new Problem(untypedProblem));
    const testCase = serverTestCase.testCase as FunctionTestCase;

    expect(testCase.data.parameters[0].value.type.id).toBe('int');
    expect(testCase.data.parameters[0].value.value).toEqual({ value: '0' });
  });

  it('selectFunction skips untyped definition parameters instead of crashing', async () => {
    const untypedProblem = {
      ...problemModel,
      extension_data: {
        builtin_testCase_function: {
          functions: {
            fn1: {
              name: 'square',
              parameters: [
                { name: 'typed', type: { type: 'int', options: { size: 32, signed: null } } },
                { name: 'untyped', type: null }
              ],
              returnType: [{ type: 'int', options: { size: 32, signed: null } }]
            }
          }
        }
      }
    } as unknown as ProblemModel;
    const testCaseModel = {
      ...makeTestCaseModel(),
      data: { function: 'fn1', parameters: [], comparisons: [] }
    } as unknown as ProblemTestCase;
    const testCase = await FunctionTestCase.from(testCaseModel, new Problem(untypedProblem));

    await expect(testCase.selectFunction('fn1')).resolves.toBeUndefined();
    expect(testCase.data.parameters.map((p) => p.name)).toEqual(['typed']);
  });

  it('addComparison defaults to the equal operator (int return)', async () => {
    const serverTestCase = await new ServerTestCaseRegistry().from(makeTestCaseModel(), new Problem(problemModel));
    const testCase = serverTestCase.testCase as FunctionTestCase;

    await testCase.addComparison();
    expect(testCase.data.comparisons).toHaveLength(1);
    expect(testCase.data.comparisons[0].operator.id).toBe('equal');
  });

  it('addComparison defaults to equal for string-returning functions', async () => {
    const stringProblem = {
      ...problemModel,
      extension_data: {
        builtin_testCase_function: {
          functions: {
            fn1: { name: 'greet', parameters: [], returnType: [{ type: 'string', options: {} }] }
          }
        }
      }
    } as unknown as ProblemModel;
    const testCaseModel = {
      ...makeTestCaseModel(),
      data: { function: 'fn1', parameters: [], comparisons: [] }
    } as unknown as ProblemTestCase;
    const testCase = await FunctionTestCase.from(testCaseModel, new Problem(stringProblem));

    // The previous default (less_than) is not registered for strings and made
    // every default comparison fail at run time.
    await testCase.addComparison();
    expect(testCase.data.comparisons).toHaveLength(1);
    expect(testCase.data.comparisons[0].operator.id).toBe('equal');
  });

  it('addComparison adds nothing for void-returning functions', async () => {
    const voidProblem = {
      ...problemModel,
      extension_data: {
        builtin_testCase_function: {
          functions: {
            fn1: { name: 'print_hi', parameters: [], returnType: [{ type: 'void', options: {} }] }
          }
        }
      }
    } as unknown as ProblemModel;
    const testCaseModel = {
      ...makeTestCaseModel(),
      data: { function: 'fn1', parameters: [], comparisons: [] }
    } as unknown as ProblemTestCase;
    const testCase = await FunctionTestCase.from(testCaseModel, new Problem(voidProblem));

    // The harness never emits a return file for void, so such a comparison
    // could never run; it must not be creatable.
    await testCase.addComparison();
    expect(testCase.data.comparisons).toHaveLength(0);
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

  it('emits pointer, float, string code and a plain void call', async () => {
    const serverTestCase = await new ServerTestCaseRegistry().from(model, new Problem(problem));

    // generateCode is private; reach it the way the load debug block does.
    const [code] = await (
      (await ServerFunctionTestCase.languageRegistry.getInstance(
        'c',
        serverTestCase as ServerFunctionTestCase
      )) as never as {
        generateCode(): Promise<[string, string[]]>;
      }
    ).generateCode();

    expect(code).toContain('void work(int*');
    expect(code).toContain('float sym_1;');
    expect(code).toContain('char* sym_2;');
    expect(code).toContain('int sym_0__target;');
    expect(code).toContain('sym_0__target = 5;');
    expect(code).toContain('sym_0 = &sym_0__target;');
    expect(code).toContain('sym_1 = 1.5f;');
    expect(code).toContain('sym_2 = "hi";');
    // void return: no result symbol, direct call without assignment
    expect(code).not.toContain('= work(');
  });

  it('emits a .0 suffix for whole-number float literals', async () => {
    const floatModel = {
      ...model,
      data: {
        function: 'fn1',
        comparisons: [],
        parameters: [
          { name: 'p', value: { type: 'pointer', options: { target: 'int' }, data: { value: '5' } } },
          { name: 'f', value: { type: 'float', options: { size: 32 }, data: { value: '5' } } },
          { name: 's', value: { type: 'string', options: {}, data: { value: 'hi' } } }
        ]
      }
    } as unknown as ProblemTestCase;
    const serverTestCase = await new ServerTestCaseRegistry().from(floatModel, new Problem(problem));

    const [code] = await (
      (await ServerFunctionTestCase.languageRegistry.getInstance(
        'c',
        serverTestCase as ServerFunctionTestCase
      )) as never as {
        generateCode(): Promise<[string, string[]]>;
      }
    ).generateCode();

    expect(code).toContain('= 5.0f;');
    expect(code).not.toContain('= 5f;');
  });

  it('escapes every C string-literal escape sequence and control characters', async () => {
    const stringModel = {
      ...model,
      data: {
        function: 'fn1',
        comparisons: [],
        parameters: [
          { name: 'p', value: { type: 'pointer', options: { target: 'int' }, data: { value: '5' } } },
          { name: 'f', value: { type: 'float', options: { size: 32 }, data: { value: '1.5' } } },
          { name: 's', value: { type: 'string', options: {}, data: { value: '\x07\x08\x0c\x0b\x09\x0a\x0d"\x01\\' } } }
        ]
      }
    } as unknown as ProblemTestCase;
    const serverTestCase = await new ServerTestCaseRegistry().from(stringModel, new Problem(problem));

    const [code] = await (
      (await ServerFunctionTestCase.languageRegistry.getInstance(
        'c',
        serverTestCase as ServerFunctionTestCase
      )) as never as {
        generateCode(): Promise<[string, string[]]>;
      }
    ).generateCode();

    expect(code).toContain('"\\a\\b\\f\\v\\t\\n\\r\\"\\001\\\\"');
  });

  it('generates valid pointer parameter definitions at any depth', async () => {
    // The shared `model` fixture is hydrated in place by the earlier tests, so
    // build a fresh one here.
    const freshModel = {
      ...model,
      data: { function: 'fn1', parameters: [], comparisons: [] }
    } as unknown as ProblemTestCase;
    const serverTestCase = await new ServerTestCaseRegistry().from(freshModel, new Problem(problem));
    const lang = (await ServerFunctionTestCase.languageRegistry.getInstance(
      'c',
      serverTestCase as ServerFunctionTestCase
    )) as CFunctionTestCase;

    const intPointer = await CFunctionTestCase.typeRegistry.getInstance(
      'pointer',
      lang,
      await Pointer.from({ target: 'int' })
    );
    expect(await intPointer.generateParameterDefinition('p')).toBe('int* p');

    const pointerPointer = await CFunctionTestCase.typeRegistry.getInstance(
      'pointer',
      lang,
      await Pointer.from({ target: { type: 'pointer', options: { target: 'int' } } })
    );
    expect(await pointerPointer.generateParameterDefinition('p')).toBe('int** p');
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
    const serverTestCase = await new ServerTestCaseRegistry().from(makeModel(), new Problem(problem));
    const result = await serverTestCase.run(new CLanguage(), stub, {
      sections: { body: 'int square(int x) { return 5; }' }
    });

    expect(result.success).toBe(true);
    if ('runInfo' in result && 'comparisons' in result.runInfo) {
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

  it('strips a student-defined main from the submission', async () => {
    captured = undefined;
    const serverTestCase = await new ServerTestCaseRegistry().from(makeModel(), new Problem(problem));
    await serverTestCase.run(new CLanguage(), stub, {
      sections: {
        body: ['int square(int x) { return 5; }', 'int main() { return 0; }'].join('\n')
      }
    });

    const submission = captured!.files.find((f) => f.path === 'submission.c')!;
    const submissionCode = submission.content.toString('utf8');
    expect(submissionCode).toContain('int square(int x) { return 5; }');
    expect(submissionCode).not.toContain('main');
  });

  it('stripMain leaves main-like text inside strings and comments untouched', () => {
    const code = [
      'char* s = "int main() { hello }";',
      '// int main() { commented out }',
      '/* int main() { blocked } */',
      'int real(void) { return 1; }'
    ].join('\n');
    expect(stripMain(code)).toBe(code);

    // A real top-level main is still removed.
    expect(stripMain('int main() { return 0; }')).toBe('');
  });

  it('returns no runInfo for hidden test cases', async () => {
    captured = undefined;
    const serverTestCase = await new ServerTestCaseRegistry().from(makeModel({ public: false }), new Problem(problem));
    const result = await serverTestCase.run(new CLanguage(), stub, {
      sections: { body: 'int square(int x) { return 5; }' }
    });

    // Hidden results must not leak the model (its `data` holds expected values).
    expect(result).toMatchObject({ success: true, testCaseInfo: { public: false } });
    expect(result.testCaseInfo).toEqual({ public: false });
    expect(result).not.toHaveProperty('runInfo');
  });

  it('assembles slot code into the submission for slots problems', async () => {
    captured = undefined;
    const slotsProblem = {
      ...problem,
      uses_slots: true,
      starter_code: ['%slot code%', '%endslot code%'].join('\n')
    } as unknown as ProblemModel;
    const serverTestCase = await new ServerTestCaseRegistry().from(makeModel(), new Problem(slotsProblem));
    await serverTestCase.run(new CLanguage(), stub, { sections: { code: 'int square(int x) { return x * x; }' } });

    const submission = captured!.files.find((f) => f.path === 'submission.c')!;
    // the slot code is preserved and no template main is present to strip
    expect(submission.content.toString('utf8')).toBe('int square(int x) { return x * x; }');
  });

  it('reports compile_error when execution produces no export files', async () => {
    class CompileFailExecutor extends CodeExecutor {
      public async execute(): Promise<ExecutionResult> {
        return {
          processOutputs: [{ exitCode: 1, stderr: Buffer.from('error: undeclared identifier') }],
          fileOutputs: []
        };
      }
    }

    const serverTestCase = await new ServerTestCaseRegistry().from(makeModel(), new Problem(problem));
    const result = await serverTestCase.run(new CLanguage(), new CompileFailExecutor(), {
      sections: { body: '' }
    });

    expect(result).toMatchObject({
      success: false,
      runInfo: { failure: 'compile_error' },
      compilerOutput: 'error: undeclared identifier'
    });
  });

  it('reports run_error when the run process is killed by a signal', async () => {
    // M3 regression: a segfaulted program still yields marker pairs with empty
    // content, so the export files are present but empty. The crash must be
    // reported as a distinct failure, not compared as empty values (which used
    // to throw BigInt('') and drop the real stderr).
    class CrashedRunExecutor extends CodeExecutor {
      public async execute(): Promise<ExecutionResult> {
        return {
          processOutputs: [{ exitCode: 0 }, { exitCode: undefined }],
          fileOutputs: [
            { path: '__ar_test_return', content: Buffer.from('') },
            { path: '__ar_test_param0', content: Buffer.from('') }
          ]
        };
      }
    }

    const serverTestCase = await new ServerTestCaseRegistry().from(makeModel(), new Problem(problem));
    const result = await serverTestCase.run(new CLanguage(), new CrashedRunExecutor(), {
      sections: { body: 'int square(int x) { return *(int*)0; }' }
    });

    expect(result).toMatchObject({
      success: false,
      testCaseInfo: { id: 'test-case-1', public: true }
    });
    if ('runInfo' in result) {
      expect(result.runInfo).toEqual({ failure: 'run_error', exitCode: undefined });
    }
    if ('compilerOutput' in result) {
      expect(result.compilerOutput).toBeUndefined();
    }
  });

  it('reports run_error with exit code and stderr on abnormal run exit', async () => {
    class AbortRunExecutor extends CodeExecutor {
      public async execute(): Promise<ExecutionResult> {
        return {
          processOutputs: [{ exitCode: 0 }, { exitCode: 134, stderr: Buffer.from('Aborted (core dumped)') }],
          fileOutputs: [
            { path: '__ar_test_return', content: Buffer.from('') },
            { path: '__ar_test_param0', content: Buffer.from('') }
          ]
        };
      }
    }

    const serverTestCase = await new ServerTestCaseRegistry().from(makeModel(), new Problem(problem));
    const result = await serverTestCase.run(new CLanguage(), new AbortRunExecutor(), {
      sections: { body: 'int square(int x) { abort(); }' }
    });

    expect(result).toMatchObject({ success: false });
    if ('runInfo' in result) {
      expect(result.runInfo).toEqual({
        failure: 'run_error',
        exitCode: 134,
        stderr: 'Aborted (core dumped)'
      });
    }
  });

  it('reports timeout when the executor kills the compile without an exit code', async () => {
    class TimeoutExecutor extends CodeExecutor {
      public async execute(): Promise<ExecutionResult> {
        return {
          processOutputs: [{ exitCode: undefined }],
          fileOutputs: []
        };
      }
    }

    const serverTestCase = await new ServerTestCaseRegistry().from(makeModel(), new Problem(problem));
    const result = await serverTestCase.run(new CLanguage(), new TimeoutExecutor(), {
      sections: { body: '' }
    });

    expect(result).toMatchObject({
      success: false,
      runInfo: { failure: 'timeout' }
    });
    if ('compilerOutput' in result) {
      expect(result.compilerOutput).toBeUndefined();
    }
  });

  it('reports output_not_generated when the compile succeeds but no export files appear', async () => {
    class NoExportFilesExecutor extends CodeExecutor {
      public async execute(): Promise<ExecutionResult> {
        return {
          processOutputs: [{ exitCode: 0 }],
          fileOutputs: []
        };
      }
    }

    const serverTestCase = await new ServerTestCaseRegistry().from(makeModel(), new Problem(problem));
    const result = await serverTestCase.run(new CLanguage(), new NoExportFilesExecutor(), {
      sections: { body: '' }
    });

    expect(result).toMatchObject({
      success: false,
      runInfo: { failure: 'output_not_generated' }
    });
    if ('compilerOutput' in result) {
      expect(result.compilerOutput).toBeUndefined();
    }
  });

  it('omits failure details for hidden test cases when the run crashes', async () => {
    class CrashedRunExecutor extends CodeExecutor {
      public async execute(): Promise<ExecutionResult> {
        return {
          processOutputs: [{ exitCode: 0 }, { exitCode: undefined }],
          fileOutputs: [
            { path: '__ar_test_return', content: Buffer.from('') },
            { path: '__ar_test_param0', content: Buffer.from('') }
          ]
        };
      }
    }

    const serverTestCase = await new ServerTestCaseRegistry().from(makeModel({ public: false }), new Problem(problem));
    const result = await serverTestCase.run(new CLanguage(), new CrashedRunExecutor(), {
      sections: { body: 'int square(int x) { return *(int*)0; }' }
    });

    expect(result).toEqual({ success: false, testCaseInfo: { public: false } });
  });

  it('fails gracefully when the function definition is missing', async () => {
    const missingModel = makeModel({
      data: { function: 'missing', parameters: [], comparisons: [] }
    });
    const serverTestCase = await new ServerTestCaseRegistry().from(missingModel, new Problem(problem));
    const result = await serverTestCase.run(new CLanguage(), stub, { sections: { body: '' } });

    expect(result).toMatchObject({ success: false, runInfo: { comparisons: [] } });
    if ('failureReason' in result) {
      expect(result.failureReason).toContain('Missing function definition');
    }
    expect(result).not.toHaveProperty('compilerOutput');
  });

  it('fails per test case, not with a hydration throw, when a stale function reference has parameters', async () => {
    // Previously the constructor dereferenced
    // `functions[parsed.function].parameters[i].type!` and threw for any row
    // with stored parameters referencing a deleted function — 500ing the
    // whole run endpoint. The constructor now falls back to the stored value
    // types, and the run degrades to a per-test-case failure.
    const staleModel = makeModel({
      data: {
        function: 'missing',
        parameters: [{ name: 'x', value: { type: 'int', options: { size: 32, signed: null }, data: { value: '3' } } }],
        comparisons: []
      }
    });
    const serverTestCase = await new ServerTestCaseRegistry().from(staleModel, new Problem(problem));
    const result = await serverTestCase.run(new CLanguage(), stub, { sections: { body: '' } });

    expect(result).toMatchObject({ success: false, runInfo: { comparisons: [] } });
    if ('failureReason' in result) {
      expect(result.failureReason).toContain('Missing function definition');
    }
  });

  it('fails gracefully when the executor throws', async () => {
    class ThrowingExecutor extends CodeExecutor {
      public async execute(): Promise<ExecutionResult> {
        throw new Error('Judge0 is not configured');
      }
    }

    const serverTestCase = await new ServerTestCaseRegistry().from(makeModel(), new Problem(problem));
    const result = await serverTestCase.run(new CLanguage(), new ThrowingExecutor(), {
      sections: { body: '' }
    });

    expect(result).toMatchObject({
      success: false,
      runInfo: { comparisons: [] },
      failureReason: 'Judge0 is not configured'
    });
  });

  it('omits failure details for hidden test cases when execution cannot proceed', async () => {
    class ThrowingExecutor extends CodeExecutor {
      public async execute(): Promise<ExecutionResult> {
        throw new Error('Judge0 is not configured');
      }
    }

    const serverTestCase = await new ServerTestCaseRegistry().from(makeModel({ public: false }), new Problem(problem));
    const result = await serverTestCase.run(new CLanguage(), new ThrowingExecutor(), {
      sections: { body: '' }
    });

    expect(result).toEqual({ success: false, testCaseInfo: { public: false } });
  });
});

describe('validateFunctionTestCaseKeys', () => {
  const problem = new Problem(problemModel);
  const makeModel = (overrides: Partial<ProblemTestCase> = {}) =>
    ({ ...makeTestCaseModel(), ...overrides }) as unknown as ProblemTestCase;

  it('accepts a test case whose function and parameters resolve', async () => {
    await expect(validateFunctionTestCaseKeys(makeModel(), problem)).resolves.toBeNull();
  });

  it('rejects a test case referencing a missing function', async () => {
    const result = await validateFunctionTestCaseKeys(
      makeModel({ data: { function: 'missing', parameters: [], comparisons: [] } }),
      problem
    );
    expect(result).toContain('references function "missing"');
    expect(result).toContain('not defined');
  });

  it('rejects a test case with more parameters than the function defines', async () => {
    const result = await validateFunctionTestCaseKeys(
      makeModel({
        data: {
          function: 'fn1',
          parameters: [
            { name: 'x', value: { type: 'int', options: { size: 32, signed: null }, data: { value: '0' } } },
            { name: 'y', value: { type: 'int', options: { size: 32, signed: null }, data: { value: '0' } } }
          ],
          comparisons: []
        }
      }),
      problem
    );
    expect(result).toContain('parameter 1');
    expect(result).toContain('only defines 1');
  });

  it('rejects a test case whose function has an untyped parameter', async () => {
    const untypedProblem = new Problem({
      ...problemModel,
      extension_data: {
        builtin_testCase_function: {
          functions: {
            fn1: {
              name: 'square',
              parameters: [{ name: 'x', type: null }],
              returnType: [{ type: 'int', options: { size: 32, signed: null } }]
            }
          }
        }
      }
    } as unknown as ProblemModel);
    await expect(validateFunctionTestCaseKeys(makeModel(), untypedProblem)).resolves.toContain('has no type');
  });

  it('ignores non-function test cases', async () => {
    await expect(validateFunctionTestCaseKeys(makeModel({ type: 'stdio' }), problem)).resolves.toBeNull();
  });

  it('rejects data that does not match the function schema', async () => {
    const result = await validateFunctionTestCaseKeys(makeModel({ data: { function: 42 } }), problem);
    expect(result).toContain('does not match the function schema');
  });
});

describe('FunctionTestCase hydrateRunInfo', () => {
  it('re-hydrates wire JSON comparisons into TypeValue-backed values', async () => {
    const serverTestCase = await new ServerTestCaseRegistry().from(makeTestCaseModel(), new Problem(problemModel));
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

    const hydrated = await testCase.hydrateRunInfo(runInfo);

    expect('comparisons' in hydrated).toBe(true);
    if ('comparisons' in hydrated) {
      expect(hydrated.comparisons[0]).toMatchObject({ symbol: 'return', result: true });
      expect(hydrated.comparisons[0].expected).toBeInstanceOf(TypeValue);
      expect(hydrated.comparisons[0].expected.value).toEqual({ value: '5' });
      expect(hydrated.comparisons[0].actual).toBeInstanceOf(TypeValue);
      expect(hydrated.comparisons[0].actual.value).toEqual({ value: '5' });
    }
  });

  it('passes failure runInfos through unchanged', async () => {
    const serverTestCase = await new ServerTestCaseRegistry().from(makeTestCaseModel(), new Problem(problemModel));
    const testCase = serverTestCase.testCase as FunctionTestCase;

    const runInfo = {
      failure: 'run_error',
      exitCode: undefined
    } as unknown as FunctionTestCaseRunInfo;

    await expect(testCase.hydrateRunInfo(runInfo)).resolves.toEqual(runInfo);
  });
});

describe('FunctionTestCase comparison symbol type sync', () => {
  // fn1: return float, param0 int, param1 int, param2 string
  const problem = {
    ...problemModel,
    id: 'problem-4',
    extension_data: {
      builtin_testCase_function: {
        functions: {
          fn1: {
            name: 'mix',
            parameters: [
              { name: 'x', type: { type: 'int', options: { size: 32, signed: null } } },
              { name: 'y', type: { type: 'int', options: { size: 32, signed: null } } },
              { name: 's', type: { type: 'string', options: {} } }
            ],
            returnType: [{ type: 'float', options: { size: 32 } }]
          }
        }
      }
    }
  } as unknown as ProblemModel;

  const makeComparisonModel = (overrides: Partial<ProblemTestCase> = {}) =>
    ({
      id: 'test-case-4',
      type: 'function',
      problem_id: 'problem-4',
      data: {
        function: 'fn1',
        parameters: [
          { name: 'x', value: { type: 'int', options: { size: 32, signed: null }, data: { value: '3' } } },
          { name: 'y', value: { type: 'int', options: { size: 32, signed: null }, data: { value: '4' } } },
          { name: 's', value: { type: 'string', options: {}, data: { value: 'hi' } } }
        ],
        comparisons: [
          {
            symbol: 'return',
            operator: { type: 'equal', options: null },
            value: { type: 'float', options: { size: 32 }, data: { value: '1.5' } }
          }
        ]
      },
      ...overrides
    }) as unknown as ProblemTestCase;

  it('updates the value type when the symbol changes to a parameter', async () => {
    const serverTestCase = await new ServerTestCaseRegistry().from(makeComparisonModel(), new Problem(problem));
    const testCase = serverTestCase.testCase as FunctionTestCase;

    await testCase.setComparisonSymbol(0, 'param2');

    expect(testCase.data.comparisons[0].symbol).toBe('param2');
    expect(testCase.data.comparisons[0].value.type.id).toBe('string');
    // the value resets to the new type's default
    expect(testCase.data.comparisons[0].value.value).toEqual({ value: '' });
  });

  it('keeps the value when switching between same-type symbols', async () => {
    const serverTestCase = await new ServerTestCaseRegistry().from(makeComparisonModel(), new Problem(problem));
    const testCase = serverTestCase.testCase as FunctionTestCase;
    const intType = (await new TypeRegistry().getStatic('int')).create();

    await testCase.setComparisonSymbol(0, 'param0');
    testCase.setComparisonValue(0, new TypeValue(intType, { value: '7' }));
    await testCase.setComparisonSymbol(0, 'param1');

    expect(testCase.data.comparisons[0].symbol).toBe('param1');
    expect(testCase.data.comparisons[0].value.type.id).toBe('int');
    expect(testCase.data.comparisons[0].value.value).toEqual({ value: '7' });
  });

  it('re-syncs comparison value types when the function signature updates', async () => {
    const serverTestCase = await new ServerTestCaseRegistry().from(makeComparisonModel(), new Problem(problem));
    const testCase = serverTestCase.testCase as FunctionTestCase;

    await testCase.setComparisonSymbol(0, 'param0');
    expect(testCase.data.comparisons[0].value.type.id).toBe('int');

    // The function signature changes: param0 becomes a string.
    const updated = await parseExtensionData(
      new Problem({
        ...problem,
        extension_data: {
          builtin_testCase_function: {
            functions: {
              fn1: {
                name: 'mix',
                parameters: [
                  { name: 'x', type: { type: 'string', options: {} } },
                  { name: 's', type: { type: 'string', options: {} } }
                ],
                returnType: [{ type: 'float', options: { size: 32 } }]
              }
            }
          }
        }
      } as unknown as ProblemModel)
    );

    await testCase.syncParameters(updated);

    expect(testCase.data.comparisons[0].value.type.id).toBe('string');
    expect(testCase.data.comparisons[0].value.value).toEqual({ value: '' });
  });

  it('keeps the value when the symbol type is unchanged', async () => {
    const serverTestCase = await new ServerTestCaseRegistry().from(makeComparisonModel(), new Problem(problem));
    const testCase = serverTestCase.testCase as FunctionTestCase;

    await testCase.setComparisonSymbol(0, 'return');
    expect(testCase.data.comparisons[0].value.type.id).toBe('float');
    // switching to the same symbol is a no-op
    expect(testCase.data.comparisons[0].value.value).toEqual({ value: '1.5' });
  });
});

describe('syncParameters matches stored values by stable id (M8)', () => {
  const intParam = (id: string) => ({ id, name: '', type: { type: 'int', options: { size: 32, signed: null } } });
  const intValue = (id: string, value: string) => ({
    id,
    name: '',
    value: { type: 'int', options: { size: 32, signed: null }, data: { value } }
  });

  const makeProblem = (parameters: unknown[]) =>
    new Problem({
      ...problemModel,
      id: 'problem-m8',
      extension_data: {
        builtin_testCase_function: {
          functions: {
            fn1: {
              name: 'sum',
              parameters,
              returnType: [{ type: 'int', options: { size: 32, signed: null } }]
            }
          }
        }
      }
    } as unknown as ProblemModel);

  const makeTestCase = async (parameters: unknown[]) =>
    (
      await new ServerTestCaseRegistry().from(
        {
          id: 'test-case-m8',
          type: 'function',
          problem_id: 'problem-m8',
          data: { function: 'fn1', parameters, comparisons: [] }
        } as unknown as ProblemTestCase,
        makeProblem([intParam('a'), intParam('b'), intParam('c')])
      )
    ).testCase as FunctionTestCase;

  const syncTo = async (testCase: FunctionTestCase, parameters: unknown[]) => {
    await testCase.syncParameters(await parseExtensionData(makeProblem(parameters)));
    return testCase.data.parameters;
  };

  it('keeps each value attached when a non-last parameter is removed', async () => {
    const testCase = await makeTestCase([intValue('a', '1'), intValue('b', '2'), intValue('c', '3')]);

    // b is removed: c's value must survive, b's must be dropped
    const params = await syncTo(testCase, [intParam('a'), intParam('c')]);

    expect(params.map((p) => p.id)).toEqual(['a', 'c']);
    expect(params.map((p) => p.value.value)).toEqual([{ value: '1' }, { value: '3' }]);
  });

  it('reorders values with their parameters', async () => {
    const testCase = await makeTestCase([intValue('a', '1'), intValue('b', '2'), intValue('c', '3')]);

    const params = await syncTo(testCase, [intParam('c'), intParam('a'), intParam('b')]);

    expect(params.map((p) => p.id)).toEqual(['c', 'a', 'b']);
    expect(params.map((p) => p.value.value)).toEqual([{ value: '3' }, { value: '1' }, { value: '2' }]);
  });

  it('keeps the value when a matched parameter changes type', async () => {
    const testCase = await makeTestCase([intValue('a', '1'), intValue('b', '2'), intValue('c', '3')]);

    const params = await syncTo(testCase, [
      { id: 'a', name: '', type: { type: 'string', options: {} } },
      intParam('b'),
      intParam('c')
    ]);

    expect(params[0].id).toBe('a');
    expect(params[0].value.type.id).toBe('string');
    expect(params[0].value.value).toEqual({ value: '1' });
  });

  it('fills defaults for added parameters and backfills their ids', async () => {
    const testCase = await makeTestCase([intValue('a', '1'), intValue('b', '2'), intValue('c', '3')]);

    const params = await syncTo(testCase, [intParam('a'), intParam('b'), intParam('c'), intParam('d')]);

    expect(params.map((p) => p.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(params[3].value.value).toEqual({ value: '0' });
  });

  it('matches legacy id-less values by name', async () => {
    const problem = new Problem({
      ...problemModel,
      id: 'problem-m8-name',
      extension_data: {
        builtin_testCase_function: {
          functions: {
            fn1: {
              name: 'sum',
              parameters: [{ name: 'x', type: { type: 'int', options: { size: 32, signed: null } } }],
              returnType: [{ type: 'int', options: { size: 32, signed: null } }]
            }
          }
        }
      }
    } as unknown as ProblemModel);

    const testCase = (
      await new ServerTestCaseRegistry().from(
        {
          id: 'test-case-m8-name',
          type: 'function',
          problem_id: 'problem-m8-name',
          data: {
            function: 'fn1',
            parameters: [
              { name: 'x', value: { type: 'int', options: { size: 32, signed: null }, data: { value: '7' } } }
            ],
            comparisons: []
          }
        } as unknown as ProblemTestCase,
        problem
      )
    ).testCase as FunctionTestCase;

    // the definition keeps x but renames nothing: name match preserves value
    await testCase.syncParameters(await parseExtensionData(problem));

    expect(testCase.data.parameters).toHaveLength(1);
    expect(testCase.data.parameters[0].name).toBe('x');
    expect(testCase.data.parameters[0].value.value).toEqual({ value: '7' });
  });

  it('is a no-op when nothing changed', async () => {
    const testCase = await makeTestCase([intValue('a', '1'), intValue('b', '2'), intValue('c', '3')]);
    const before = testCase.data.parameters;

    await testCase.syncParameters(await parseExtensionData(makeProblem([intParam('a'), intParam('b'), intParam('c')])));

    expect(testCase.data.parameters).toBe(before);
  });
});

describe('stripMain', () => {
  it('removes an int main declaration', () => {
    expect(stripMain('int main() { return 0; }')).toBe('');
  });

  it('removes a void main declaration', () => {
    expect(stripMain('void main() { }')).toBe('');
  });

  it('removes main with parameters', () => {
    expect(stripMain('int main(int argc, char** argv) { return 0; }')).toBe('');
  });

  it('keeps functions other than main intact', () => {
    const code = ['int square(int x) { return x * x; }', 'int main() { return 0; }'].join('\n');
    expect(stripMain(code)).toBe('int square(int x) { return x * x; }\n');
  });

  it('normalizes CRLF line endings before stripping', () => {
    expect(stripMain('int main() {\r\n    return 0;\r\n}\r\n')).toBe('\n');
  });

  it('leaves code without a main unchanged', () => {
    const code = 'int square(int x) { return x * x; }';
    expect(stripMain(code)).toBe(code);
  });
});

describe('stripMain balanced braces', () => {
  it('keeps code that follows a leading main', () => {
    const code = ['int main() { return 0; }', 'int square(int x) { return x * x; }'].join('\n');
    expect(stripMain(code)).toBe('\nint square(int x) { return x * x; }');
  });

  it('handles nested braces inside the main body', () => {
    expect(stripMain('int main() { if (1) { return 0; } return 1; }')).toBe('');
  });

  it('strips multiple main declarations', () => {
    expect(stripMain('int main() { return 0; } void main() { }')).toBe(' ');
  });
});

describe('stripMain parameter lists', () => {
  it('removes main with a char *argv[] parameter', () => {
    expect(stripMain('int main(int argc, char *argv[]) { return 0; }')).toBe('');
  });

  it('removes main with const and char** argv[] parameters', () => {
    expect(stripMain('int main(int argc, const char **argv[]) { return 0; }')).toBe('');
  });

  it('removes main with underscore parameters', () => {
    expect(stripMain('int main(int my_arg) { return my_arg; }')).toBe('');
  });

  it('removes main with whitespace before the parameter list', () => {
    expect(stripMain('int main (void) { return 0; }')).toBe('');
  });
});
