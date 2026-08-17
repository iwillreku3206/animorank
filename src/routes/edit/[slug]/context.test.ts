import { describe, expect, it } from 'vitest';
import { ProblemEditorWindowContext } from './context.svelte';
import type { Problem as ProblemModel } from '$lib/zenstack/models';

const makeContext = () =>
  new ProblemEditorWindowContext({
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
  it('adds a blank function keyed by uuid', () => {
    const context = makeContext();
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
