import { ClientRegistryProvider } from '$lib/registry/client';
import { GlobalRegistryProvider } from '$lib/registry/global';
import { ReadOnlyRegistryProvider } from '$lib/registry/readOnlyRegistryProvider';
import { RegistryProviderRegistrar } from '$lib/registry/registryProviderRegistrar';
import { AnimoRankAPI } from './animoRankAPI';

/** {@link AnimoRankAPI} for client-side plugins: the client registry provider's pair + the global pair. */
export class ClientAnimoRankAPI extends AnimoRankAPI {
  public readonly clientRegistryProvider: ReadOnlyRegistryProvider;
  public readonly clientRegistryProviderRegistrar: RegistryProviderRegistrar;

  public constructor(pluginId: string) {
    const provider = ClientRegistryProvider.instance();
    super(GlobalRegistryProvider.instance(), pluginId);
    this.clientRegistryProvider = new ReadOnlyRegistryProvider(provider);
    this.clientRegistryProviderRegistrar = new RegistryProviderRegistrar(provider, pluginId);
  }
}
