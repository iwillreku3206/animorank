import { describe, expect, it } from 'vitest';
import { ClientAnimoRankAPI } from '$lib/api/client';
import { GlobalRegistryProvider } from '$lib/registry/global';
import { TypeRegistry } from '$lib/testCase/builtin/functionTestCase/typeRegistry';
import { EqualOperatorTypeRegistry } from '$lib/testCase/builtin/functionTestCase/operators/equal/registry';
import ClientEntry from './client';
import { ArrayType } from './arrayTypes';

/**
 * The browser half of the array plugin, installed the way the client loader
 * runs it. A file of its own: registrations are process-wide and a process
 * runs one runtime's half of a plugin, so the browser half cannot be installed
 * beside the server half that `arrayTypesPlugin.test.ts` covers.
 */
describe('array client plugin entry', () => {
  it('registers the type, its equality and the components that render it', async () => {
    await new ClientEntry().init(new ClientAnimoRankAPI('array-types', '/plugins/array-types/'));

    // Both keyed by the type's plain id: the browser resolves the type wherever
    // a value is read, and its comparison loop resolves the equality.
    const globals = GlobalRegistryProvider.instance();
    expect(globals.getRegistry(TypeRegistry).keys()).toContain('array');
    expect(globals.getRegistry(EqualOperatorTypeRegistry).keys()).toContain('array');

    // The components belong to the client build; without them a value cannot render.
    const type = ArrayType.create();
    expect(type.valueForm).toBeDefined();
    expect(type.valueDisplay).toBeDefined();
  });
});
