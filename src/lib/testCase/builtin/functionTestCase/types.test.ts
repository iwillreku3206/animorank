import { describe, expect, it } from 'vitest';
import { Problem } from '$lib/problem';
import type { Problem as ProblemModel } from '$lib/zenstack/models';
import { parseExtensionData, parseSymbol, serializeExtensionData } from './types';

describe('parseSymbol', () => {
  it('accepts valid symbols', () => {
    expect(parseSymbol('return')).toBe('return');
    expect(parseSymbol('return0')).toBe('return0');
    expect(parseSymbol('return12')).toBe('return12');
    expect(parseSymbol('param2')).toBe('param2');
  });

  it('rejects invalid symbols', () => {
    expect(() => parseSymbol('1')).toThrow('Invalid symbol');
    expect(() => parseSymbol('garbage')).toThrow('Invalid symbol');
  });
});

describe('extension data', () => {
  // Legacy data uses generated ids as keys; the system now keys by function name.
  const makeProblem = (key: string) =>
    new Problem({
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
            [key]: {
              name: 'add',
              parameters: [{ name: 'a', type: { type: 'int', options: { size: 32, signed: null } } }],
              returnType: [{ type: 'int', options: { size: 32, signed: null } }]
            }
          }
        }
      }
    } as unknown as ProblemModel);

  it('preserves stored keys when parsing', () => {
    const data = parseExtensionData(makeProblem('legacy-id'));
    expect(Object.keys(data.functions)).toEqual(['legacy-id']);
    expect(data.functions['legacy-id'].name).toBe('add');
    expect(data.functions['legacy-id'].parameters[0].type!.id).toBe('int');
  });

  it('preserves keys when serializing', () => {
    const serialized = serializeExtensionData(parseExtensionData(makeProblem('legacy-id')));
    expect(Object.keys(serialized.functions as Record<string, unknown>)).toEqual(['legacy-id']);
    expect((serialized.functions as Record<string, { name: string }>)['legacy-id'].name).toBe('add');
  });
});
