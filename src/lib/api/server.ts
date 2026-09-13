import { ServerRegistryProvider } from '$lib/registry/server';
import { GlobalRegistryProvider } from '$lib/registry/global';
import { ReadOnlyRegistryProvider } from '$lib/registry/readOnlyRegistryProvider';
import { RegistryProviderRegistrar } from '$lib/registry/registryProviderRegistrar';
import { AnimoRankAPI } from './animoRankAPI';

/** {@link AnimoRankAPI} for server-side plugins: the server registry provider's pair + the global pair. */
export class ServerAnimoRankAPI extends AnimoRankAPI {
  public readonly serverRegistryProvider: ReadOnlyRegistryProvider;
  public readonly serverRegistryProviderRegistrar: RegistryProviderRegistrar;

  public constructor(pluginId: string) {
    const provider = ServerRegistryProvider.instance();
    super(GlobalRegistryProvider.instance(), pluginId);
    this.serverRegistryProvider = new ReadOnlyRegistryProvider(provider);
    this.serverRegistryProviderRegistrar = new RegistryProviderRegistrar(provider, pluginId);
  }
}
