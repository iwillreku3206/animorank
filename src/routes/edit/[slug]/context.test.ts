import { describe, expect, it } from 'vitest';
import { ProblemEditorWindowContext } from './context.svelte';
import type { Problem as ProblemModel, ProblemTestCase } from '$lib/zenstack/models';

const makeContext = async () =>
  await ProblemEditorWindowContext.create({
    problem: {
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
    } as unknown as ProblemModel,
    testCases: [],
    tags: [],
    topics: []
  });

describe('ProblemEditorWindowContext.addFunction', () => {
  it('adds a blank function keyed by uuid', async () => {
    const context = await makeContext();
    context.addFunction();
    context.addFunction();

    const keys = Object.keys(context.functionData.functions);
    expect(keys).toHaveLength(2);
    for (const key of keys) {
      expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(context.functionData.functions[key]).toEqual({
        name: '',
        symbol: '',
        parameters: [],
        returnType: []
      });
    }

    context.cleanup();
  });
});

describe('ProblemEditorWindowContext.removeFunction', () => {
  it('refuses to remove a function referenced by a test case', async () => {
    const fnId = crypto.randomUUID();
    const context = await ProblemEditorWindowContext.create({
      problem: {
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
              [fnId]: {
                name: 'foo',
                symbol: 'foo',
                parameters: [],
                returnType: [{ type: 'int', options: { size: 32, signed: null } }]
              }
            }
          }
        }
      } as unknown as ProblemModel,
      testCases: [
        {
          id: 'tc-1',
          type: 'function',
          problem_id: 'problem-1',
          public: true,
          data: { function: fnId, parameters: [], comparisons: [] }
        } as unknown as ProblemTestCase
      ],
      tags: [],
      topics: []
    });

    // Deleting it would persist a dangling reference and brick the next load.
    expect(context.removeFunction(fnId)).toBe(false);
    expect(context.functionData.functions[fnId]).toBeDefined();

    context.cleanup();
  });

  it('removes a function no test case references', async () => {
    const context = await makeContext();
    context.addFunction();
    const fnId = Object.keys(context.functionData.functions)[0];

    expect(context.removeFunction(fnId)).toBe(true);
    expect(context.functionData.functions[fnId]).toBeUndefined();

    context.cleanup();
  });
});
