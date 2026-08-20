import { describe, expect, it } from 'vitest';
import { stringify } from 'devalue';
import { ServerTestCaseRegistry } from '$lib/testCase/testCaseRegistry.server';
import { Problem } from '$lib/problem';
import { toJsonValue } from '$lib/types/utils';
import type { Problem as ProblemModel, ProblemTestCase } from '$lib/zenstack/models';
import { FunctionTestCase, type FunctionTestCaseRunInfo } from './functionTestCase.svelte';
import { stripMain } from './languages/c/c';
import { TypeValue } from './typeValue.svelte';
import { parseExtensionData } from './types';
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

  it('strips a student-defined main from the submission', async () => {
    captured = undefined;
    const serverTestCase = ServerTestCaseRegistry.instance().from(makeModel(), new Problem(problem));
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
      starter_code: ['%slot code%', '%endslot code%'].join('\n')
    } as unknown as ProblemModel;
    const serverTestCase = ServerTestCaseRegistry.instance().from(makeModel(), new Problem(slotsProblem));
    await serverTestCase.run(new CLanguage(), stub, { sections: { code: 'int square(int x) { return x * x; }' } });

    const submission = captured!.files.find((f) => f.path === 'submission.c')!;
    // the slot code is preserved and no template main is present to strip
    expect(submission.content.toString('utf8')).toBe('int square(int x) { return x * x; }');
  });

  it('fails with compilerOutput when execution produces no export files', async () => {
    class CompileFailExecutor extends CodeExecutor {
      public async execute(): Promise<ExecutionResult> {
        return {
          processOutputs: [{ exitCode: 1, stderr: Buffer.from('error: undeclared identifier') }],
          fileOutputs: []
        };
      }
    }

    const serverTestCase = ServerTestCaseRegistry.instance().from(makeModel(), new Problem(problem));
    const result = await serverTestCase.run(new CLanguage(), new CompileFailExecutor(), {
      sections: { body: '' }
    });

    expect(result).toMatchObject({
      success: false,
      runInfo: { comparisons: [] },
      compilerOutput: 'error: undeclared identifier'
    });
  });

  it('fails gracefully when the function definition is missing', async () => {
    const missingModel = makeModel({
      data: { function: 'missing', parameters: [], comparisons: [] }
    });
    const serverTestCase = ServerTestCaseRegistry.instance().from(missingModel, new Problem(problem));
    const result = await serverTestCase.run(new CLanguage(), stub, { sections: { body: '' } });

    expect(result).toMatchObject({ success: false, runInfo: { comparisons: [] } });
    if ('compilerOutput' in result) {
      expect(result.compilerOutput).toContain('Missing function definition');
    }
  });

  it('fails gracefully when the executor throws', async () => {
    class ThrowingExecutor extends CodeExecutor {
      public async execute(): Promise<ExecutionResult> {
        throw new Error('Judge0 is not configured');
      }
    }

    const serverTestCase = ServerTestCaseRegistry.instance().from(makeModel(), new Problem(problem));
    const result = await serverTestCase.run(new CLanguage(), new ThrowingExecutor(), {
      sections: { body: '' }
    });

    expect(result).toMatchObject({
      success: false,
      runInfo: { comparisons: [] },
      compilerOutput: 'Judge0 is not configured'
    });
  });

  it('omits failure details for hidden test cases when execution cannot proceed', async () => {
    class ThrowingExecutor extends CodeExecutor {
      public async execute(): Promise<ExecutionResult> {
        throw new Error('Judge0 is not configured');
      }
    }

    const serverTestCase = ServerTestCaseRegistry.instance().from(makeModel({ public: false }), new Problem(problem));
    const result = await serverTestCase.run(new CLanguage(), new ThrowingExecutor(), {
      sections: { body: '' }
    });

    expect(result).toEqual({ success: false, testCaseInfo: { public: false } });
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

  it('updates the value type when the symbol changes to a parameter', () => {
    const serverTestCase = ServerTestCaseRegistry.instance().from(makeComparisonModel(), new Problem(problem));
    const testCase = serverTestCase.testCase as FunctionTestCase;

    testCase.setComparisonSymbol(0, 'param2');

    expect(testCase.data.comparisons[0].symbol).toBe('param2');
    expect(testCase.data.comparisons[0].value.type.id).toBe('string');
    // the value resets to the new type's default
    expect(testCase.data.comparisons[0].value.value).toEqual({ value: '' });
  });

  it('keeps the value when switching between same-type symbols', () => {
    const serverTestCase = ServerTestCaseRegistry.instance().from(makeComparisonModel(), new Problem(problem));
    const testCase = serverTestCase.testCase as FunctionTestCase;
    const intType = TypeRegistry.instance().getStatic('int').create();

    testCase.setComparisonSymbol(0, 'param0');
    testCase.setComparisonValue(0, new TypeValue(intType, { value: '7' }));
    testCase.setComparisonSymbol(0, 'param1');

    expect(testCase.data.comparisons[0].symbol).toBe('param1');
    expect(testCase.data.comparisons[0].value.type.id).toBe('int');
    expect(testCase.data.comparisons[0].value.value).toEqual({ value: '7' });
  });

  it('re-syncs comparison value types when the function signature updates', () => {
    const serverTestCase = ServerTestCaseRegistry.instance().from(makeComparisonModel(), new Problem(problem));
    const testCase = serverTestCase.testCase as FunctionTestCase;

    testCase.setComparisonSymbol(0, 'param0');
    expect(testCase.data.comparisons[0].value.type.id).toBe('int');

    // The function signature changes: param0 becomes a string.
    const updated = parseExtensionData(
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

    testCase.syncParameters(updated);

    expect(testCase.data.comparisons[0].value.type.id).toBe('string');
    expect(testCase.data.comparisons[0].value.value).toEqual({ value: '' });
  });

  it('keeps the value when the symbol type is unchanged', () => {
    const serverTestCase = ServerTestCaseRegistry.instance().from(makeComparisonModel(), new Problem(problem));
    const testCase = serverTestCase.testCase as FunctionTestCase;

    testCase.setComparisonSymbol(0, 'return');
    expect(testCase.data.comparisons[0].value.type.id).toBe('float');
    // switching to the same symbol is a no-op
    expect(testCase.data.comparisons[0].value.value).toEqual({ value: '1.5' });
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
