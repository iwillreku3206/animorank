import type { ServerAnimoRankAPI } from '$lib/api/server';
import { ServerPlugin } from '$lib/plugin/serverPlugin';
import { TypeRegistry } from '$lib/testCase/builtin/functionTestCase/typeRegistry';
import { CTypeRegistry } from '$lib/testCase/builtin/functionTestCase/languages/c/typeRegistry';
import { ArrayType, registerOnce } from './arrayTypes';
import { CArrayType } from './arrayCType';

/**
 * The server half of the array data types: the type itself (the generated
 * harness resolves it while producing C) and its C language binding.
 *
 * Both register without a namespace: a data type is looked up by its plain id
 * throughout the app — the type registry, the operator registries and the C
 * binding all key off `Type.id`.
 */
export default class ArrayTypesServerPlugin extends ServerPlugin {
  public async init(api: ServerAnimoRankAPI): Promise<void> {
    // Empty namespace: the type is looked up by its plain id everywhere.
    registerOnce(() =>
      api.globalRegistryProviderRegistrar.getRegistrar(TypeRegistry, '').register(ArrayType.id(), ArrayType)
    );
    registerOnce(() =>
      api.serverRegistryProviderRegistrar.getRegistrar(CTypeRegistry, '').register(ArrayType.id(), CArrayType)
    );
  }
}
