import type { ClientRegistryDomain } from '$lib/registry/registryProvider';
import { ApiQueryHandler } from '$lib/util/apiQueryHandler';
import { ClientPluginLoader } from './clientLoader';

/** Base URL of the app's plugin API; see `src/routes/api/plugin`. */
const PLUGIN_API = '/api/plugin';

export interface ClientPluginFinderOptions {
  /** Question handler override; defaults to a handler over the plugin API. */
  api?: ApiQueryHandler;
  /** Plugin loader override; defaults to the app's {@link ClientPluginLoader.instance}. */
  loader?: ClientPluginLoader;
}

/**
 * Finds the plugins that provide what a registry lookup missed: the server is
 * asked which plugin registered the registry, one of its items, or writes into
 * it, and the plugin ids it names are handed to the plugin loader, which loads
 * those plugins and no others.
 *
 * A qualified registry id (`plugin:registry-id`) names its plugin outright and
 * is not asked about. What no answer names is not loaded, so a lookup nothing
 * can be attributed to ends in its own error. The registry providers call this
 * from the browser, where a lookup can still be satisfied; the plugin ids are
 * the only thing that ever crosses that boundary (see
 * `$lib/registry/clientPlugins`).
 */
export class ClientPluginFinder {
  private static _instance: ClientPluginFinder | null = null;

  private readonly api: ApiQueryHandler;
  private readonly loader: ClientPluginLoader;

  public static instance(): ClientPluginFinder {
    ClientPluginFinder._instance ??= new ClientPluginFinder();
    return ClientPluginFinder._instance;
  }

  public constructor(options: ClientPluginFinderOptions = {}) {
    this.api = options.api ?? new ApiQueryHandler(PLUGIN_API);
    this.loader = options.loader ?? ClientPluginLoader.instance();
  }

  /** Loads the plugin that provides registry `id` in `domain`, when one can still provide it. */
  public async findRegistryPlugin(domain: ClientRegistryDomain, id: string): Promise<void> {
    const named = pluginNamespaceOf(id) ?? (await this.pluginOf('registry', { domain, id }));
    await this.loadPlugin(named);
  }

  /** Loads the plugin that registered item `key` of registry `registryId` in `domain`, when the server names one. */
  public async findItemPlugin(domain: ClientRegistryDomain, registryId: string, key: string): Promise<void> {
    await this.loadPlugin(await this.pluginOf('registryItem', { domain, registry: registryId, id: key }));
  }

  /** Loads every plugin that writes into registry `registryId` in `domain`. */
  public async findRegistryWriters(domain: ClientRegistryDomain, registryId: string): Promise<void> {
    // Enumerating a registry wants everything in it, including what no key
    // lookup would ever ask for, so every plugin the server names as a writer
    // loads here. The server only knows the contributions of its own runtime;
    // a plugin that writes only from its client entry is not named and shows up
    // once something else names the plugin.
    const body = await this.api.query('registryWriters', { domain, registry: registryId });
    const writers = Array.isArray(body?.plugins) ? (body.plugins as string[]) : [];
    await Promise.all(writers.map((pluginId) => this.loadPlugin(pluginId)));
  }

  /**
   * Gets the plugin ID of an item
   */
  private async pluginOf(route: string, params: Record<string, string>): Promise<string | undefined> {
    const body = await this.api.query(route, params);
    return typeof body?.plugin === 'string' ? body.plugin : undefined;
  }

  /**
   * Loads one plugin by id. A plugin with no id (`undefined`) loads nothing,
   * and one that cannot be loaded is skipped: the lookup's own error is the one
   * that surfaces.
   */
  private async loadPlugin(id: string | undefined): Promise<void> {
    if (!id) return;
    await this.loader.getPlugin(id).catch(() => undefined);
  }
}

/** The plugin id a qualified registry id (`plugin:registry-id`) names. */
function pluginNamespaceOf(registryId: string): string | undefined {
  const separator = registryId.indexOf(':');
  return separator > 0 ? registryId.slice(0, separator) : undefined;
}
