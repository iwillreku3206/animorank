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
