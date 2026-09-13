import type { RegistryProvider } from '$lib/registry/registryProvider';
import { ReadOnlyRegistryProvider } from '$lib/registry/readOnlyRegistryProvider';
import { RegistryProviderRegistrar } from '$lib/registry/registryProviderRegistrar';

/**
 * Plugin-facing access to the app's registries. Every member is one adapter over
 * one provider: `…RegistryProvider` is the read path (read-only views of that
 * provider's registries), `…RegistryProviderRegistrar` the write path (it stamps
 * the plugin id onto every registry id and key it writes). This base carries the
 * global-provider pair; runtime subclasses add their own provider's pair.
 */
export abstract class AnimoRankAPI {
  public readonly globalRegistryProvider: ReadOnlyRegistryProvider;
  public readonly globalRegistryProviderRegistrar: RegistryProviderRegistrar;

  protected constructor(globalProvider: RegistryProvider, pluginId: string) {
    this.globalRegistryProvider = new ReadOnlyRegistryProvider(globalProvider);
    this.globalRegistryProviderRegistrar = new RegistryProviderRegistrar(globalProvider, pluginId);
  }
}
