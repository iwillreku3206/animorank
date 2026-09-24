import { ServerRegistryProvider } from '$lib/registry/server';
import { GlobalRegistryProvider } from '$lib/registry/global';
import { ReadOnlyRegistryProvider } from '$lib/registry/readOnlyRegistryProvider';
import { RegistryProviderRegistrar } from '$lib/registry/registryProviderRegistrar';
import { AnimoRankAPI } from './animoRankAPI';

/** {@link AnimoRankAPI} for server-side plugins: the server registry provider's pair + the global pair. */
export class ServerAnimoRankAPI extends AnimoRankAPI {
  public readonly serverRegistryProvider: ReadOnlyRegistryProvider;
  public readonly serverRegistryProviderRegistrar: RegistryProviderRegistrar;

  /**
   * @param pluginFilesUrl the URL the plugin's files live under, ending in `/`,
   * for a plugin whose files are read from one (a dynamic plugin's directory);
   * `undefined` for a prebuilt plugin, which is compiled into the app. See
   * {@link AnimoRankAPI.import}
   */
  public constructor(pluginId: string, pluginFilesUrl?: string) {
    const provider = ServerRegistryProvider.instance();
    super(GlobalRegistryProvider.instance(), pluginId, pluginFilesUrl);
    this.serverRegistryProvider = new ReadOnlyRegistryProvider(provider);
    this.serverRegistryProviderRegistrar = new RegistryProviderRegistrar(provider, pluginId);
  }
}
