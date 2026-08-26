import { describe, expect, it } from 'vitest';
import { ServerTestCaseRegistry } from './testCaseRegistry.server';

const registry = new ServerTestCaseRegistry();

describe('ServerTestCaseRegistry.validateUpdate', () => {
  it('accepts data matching the effective type schema', () => {
    expect(() =>
      registry.validateUpdate(
        { type: 'function', data: { function: 'fn1', parameters: [], comparisons: [] } },
        'function'
      )
    ).not.toThrow();
    expect(() =>
      registry.validateUpdate({ type: 'stdio', data: { input: '1', output: '2' } }, 'function')
    ).not.toThrow();
    expect(() =>
      registry.validateUpdate({ type: 'custom', data: { test_code: 'int main(){}' } }, 'function')
    ).not.toThrow();
  });

  it('rejects unknown type keys', () => {
    expect(() => registry.validateUpdate({ type: 'not-a-type' }, 'function')).toThrow(
      'Unknown test case type "not-a-type"'
    );
  });

  it('rejects non-boolean public', () => {
    expect(() => registry.validateUpdate({ public: 'false' }, 'function')).toThrow('public must be a boolean');
    expect(() => registry.validateUpdate({ public: 1 }, 'function')).toThrow('public must be a boolean');
  });

  it('rejects data that does not match the effective type schema', () => {
    // function requires function/parameters/comparisons; stdio-shaped data
    // does not satisfy it
    expect(() => registry.validateUpdate({ data: { input: '1', output: '2' } }, 'function')).toThrow(
      /Invalid data for test case type "function"/
    );
  });

  it('validates against the new type when type is being changed', () => {
    expect(() => registry.validateUpdate({ type: 'function', data: { input: '1' } }, 'stdio')).toThrow(
      /Invalid data for test case type "function"/
    );
  });

  it('accepts partial updates', () => {
    expect(() => registry.validateUpdate({ public: false }, 'function')).not.toThrow();
    expect(() => registry.validateUpdate({}, 'function')).not.toThrow();
    expect(() => registry.validateUpdate({ type: 'function' }, 'function')).not.toThrow();
  });

  it('requires data when changing the type of an existing row', () => {
    // A type-only update would write stdio-shaped data under the function
    // type (or vice versa) — an unparseable row that 500s every hydration.
    expect(() => registry.validateUpdate({ type: 'function' }, 'stdio')).toThrow(
      'Changing test case type to "function" requires data'
    );
    expect(() => registry.validateUpdate({ type: 'stdio' }, 'custom')).toThrow(
      'Changing test case type to "stdio" requires data'
    );
    // Changing type WITH data validates the data against the new type and passes.
    expect(() =>
      registry.validateUpdate({ type: 'stdio', data: { input: '1', output: '2' } }, 'function')
    ).not.toThrow();
  });
});
