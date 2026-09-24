import type { ServerAnimoRankAPI } from '$lib/api/server';
import { ServerPlugin } from '$lib/plugin/serverPlugin';
import { TypeRegistry } from '$lib/testCase/builtin/functionTestCase/typeRegistry';
import { EqualOperatorTypeRegistry } from '$lib/testCase/builtin/functionTestCase/operators/equal/registry';
import { CTypeRegistry } from '$lib/testCase/builtin/functionTestCase/languages/c/typeRegistry';
import { ArrayType } from './arrayTypes';
import { EqualArrayType } from './client/arrayOperators';
import { CArrayType } from './arrayCType';

/**
 * The server half of the array data types: the type itself (the generated
 * harness resolves it while producing C), its C language binding, and the
 * equality a run's comparisons resolve by the compared type's id.
 *
 * All register without a namespace: a data type is looked up by its plain id
 * throughout the app — the type registry, the operator registries and the C
 * binding all key off `Type.id`.
 */
export default class ArrayTypesServerPlugin extends ServerPlugin {
  public async init(api: ServerAnimoRankAPI): Promise<void> {
    // Empty namespace: the type is looked up by its plain id everywhere.
    api.globalRegistryProviderRegistrar.getRegistrar(TypeRegistry, '').register(ArrayType.id(), ArrayType);
    api.globalRegistryProviderRegistrar
      .getRegistrar(EqualOperatorTypeRegistry, '')
      .register(ArrayType.id(), EqualArrayType);
    api.serverRegistryProviderRegistrar.getRegistrar(CTypeRegistry, '').register(ArrayType.id(), CArrayType);
  }
}
