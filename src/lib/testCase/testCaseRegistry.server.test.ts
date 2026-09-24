import { describe, expect, it } from 'vitest';
import { ServerTestCaseRegistry } from './testCaseRegistry.server';

const registry = new ServerTestCaseRegistry();

describe('ServerTestCaseRegistry.validateUpdate', () => {
  it('accepts data matching the effective type schema', async () => {
    await expect(
      registry.validateUpdate(
        { type: 'function', data: { function: 'fn1', parameters: [], comparisons: [] } },
        'function'
      )
    ).resolves.toBeUndefined();
    await expect(
      registry.validateUpdate({ type: 'stdio', data: { input: '1', output: '2' } }, 'function')
    ).resolves.toBeUndefined();
    await expect(
      registry.validateUpdate({ type: 'custom', data: { test_code: 'int main(){}' } }, 'function')
    ).resolves.toBeUndefined();
  });

  it('rejects unknown type keys', async () => {
    await expect(registry.validateUpdate({ type: 'not-a-type' }, 'function')).rejects.toThrow(
      'Unknown test case type "not-a-type"'
    );
  });

  it('rejects non-boolean public', async () => {
    await expect(registry.validateUpdate({ public: 'false' }, 'function')).rejects.toThrow('public must be a boolean');
    await expect(registry.validateUpdate({ public: 1 }, 'function')).rejects.toThrow('public must be a boolean');
  });

  it('rejects data that does not match the effective type schema', async () => {
    // function requires function/parameters/comparisons; stdio-shaped data
    // does not satisfy it
    await expect(registry.validateUpdate({ data: { input: '1', output: '2' } }, 'function')).rejects.toThrow(
      /Invalid data for test case type "function"/
    );
  });

  it('validates against the new type when type is being changed', async () => {
    await expect(registry.validateUpdate({ type: 'function', data: { input: '1' } }, 'stdio')).rejects.toThrow(
      /Invalid data for test case type "function"/
    );
  });

  it('accepts partial updates', async () => {
    await expect(registry.validateUpdate({ public: false }, 'function')).resolves.toBeUndefined();
    await expect(registry.validateUpdate({}, 'function')).resolves.toBeUndefined();
    await expect(registry.validateUpdate({ type: 'function' }, 'function')).resolves.toBeUndefined();
  });

  it('requires data when changing the type of an existing row', async () => {
    // A type-only update would write stdio-shaped data under the function
    // type (or vice versa) — an unparseable row that 500s every hydration.
    await expect(registry.validateUpdate({ type: 'function' }, 'stdio')).rejects.toThrow(
      'Changing test case type to "function" requires data'
    );
    await expect(registry.validateUpdate({ type: 'stdio' }, 'custom')).rejects.toThrow(
      'Changing test case type to "stdio" requires data'
    );
    // Changing type WITH data validates the data against the new type and passes.
    await expect(
      registry.validateUpdate({ type: 'stdio', data: { input: '1', output: '2' } }, 'function')
    ).resolves.toBeUndefined();
  });
});
