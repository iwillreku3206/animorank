import { describe, expect, it } from 'vitest';
import { stringify } from 'devalue';
import { ServerTestCaseRegistry } from '$lib/testCase/testCaseRegistry.server';
import { Problem } from '$lib/problem';
import { toJsonValue } from '$lib/types/utils';
import type { Problem as ProblemModel, ProblemTestCase } from '$lib/zenstack/models';
import { FunctionTestCase } from './functionTestCase.svelte';

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
