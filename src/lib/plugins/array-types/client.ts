import type { ClientAnimoRankAPI } from '$lib/api/client';
import { ClientPlugin } from '$lib/plugin/clientPlugin';
import { TypeRegistry } from '$lib/testCase/builtin/functionTestCase/typeRegistry';
import { EqualOperatorTypeRegistry } from '$lib/testCase/builtin/functionTestCase/operators/equal/registry';
import { ArrayType, registerOnce } from './arrayTypes';
import { EqualArrayType } from './client/arrayOperators';
// Installs the type's value editor and display, which belong to the client build.
import './client/arrayType';

/**
 * The browser half of the array data types: the type itself (the editor offers
 * it wherever a type is chosen) and the operators that support it. The
 * comparison loop resolves an operator type by the compared type's id, so an
 * `equal` comparison on arrays needs the binding registered here too.
 */
export default class ArrayTypesClientPlugin extends ClientPlugin {
  public async init(api: ClientAnimoRankAPI): Promise<void> {
    // Empty namespace: the type is looked up by its plain id everywhere.
    registerOnce(() =>
      api.globalRegistryProviderRegistrar.getRegistrar(TypeRegistry, '').register(ArrayType.id(), ArrayType)
    );
    registerOnce(() =>
      api.globalRegistryProviderRegistrar
        .getRegistrar(EqualOperatorTypeRegistry, '')
        .register(ArrayType.id(), EqualArrayType)
    );
  }
}
