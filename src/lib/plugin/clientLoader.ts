import { ClientAnimoRankAPI } from '$lib/api/client';
import { PLUGIN_ROUTE_PREFIX, type PluginClientDescriptor } from './catalog';
import { ClientPlugin, type PluginPageHook, type PluginPageHookContexts } from './clientPlugin';
import { prebuiltPluginIds } from './prebuiltClientEntries';

/** A plugin client module: its default export is the {@link ClientPlugin} class to instantiate. */
export interface PluginClientModule {
  default?: new () => ClientPlugin;
}

/**
 * Imports a plugin client module from the URL a descriptor names: a file the
 * plugin route serves, or a chunk of the app's client build for a prebuilt
 * plugin (see `prebuiltClientEntries`).
 */
export type PluginModuleImporter = (_path: string) => Promise<PluginClientModule>;

export interface ClientPluginLoaderOptions {
  /** Base URL of the plugin route the loader asks for a plugin's descriptor; defaults to {@link PLUGIN_ROUTE_PREFIX} (same-origin). */
  routeBase?: string;
  /** Module importer override; see {@link PluginModuleImporter}. */
  importModule?: PluginModuleImporter;
  /**
   * The plugins the client knows without asking, by id — the app's own prebuilt
   * set by default. Each one's class can be checked for a page hook without
   * loading it; see {@link ClientPluginLoader.notifyPageHook}.
   */
  prebuiltPlugins?: () => string[];
}

async function importModule(path: string): Promise<PluginClientModule> {
  return (await import(/* @vite-ignore */ path)) as PluginClientModule;
}

/**
 * Loads plugin client entries on demand, one plugin at a time.
 *
 * Nothing is enumerated up front: the plugin to load is named by whatever asks
 * for it — the client asks the server which plugin provides the registry being
 * requested (see `clientPluginFinder`) and hands the loader that plugin id.
 * The id resolves to the descriptor the plugin route serves, which names the
 * files to run: a dynamically loaded plugin's `client.js`, or a prebuilt
 * plugin's entries as the app's build emitted them. The client knows no plugin
 * paths of its own. Only the plugin that was asked for runs — its code, its
 * `init`, and with them the registries it contributes to.
 * Resolution is memoized, so a plugin initializes at most once even under
 * concurrent requests; a failed load is not memoized and can be retried.
 *
 * A page load is the one ask that is not a single plugin id: the loader checks
 * the app's prebuilt plugins for the page's hook and loads those that answer
 * it (see {@link notifyPageHook}).
 */
export class ClientPluginLoader {
  private static _instance: ClientPluginLoader | null = null;

  private readonly instances = new Map<string, Promise<ClientPlugin>>();
  /** Descriptors the plugin route served, by plugin id; see {@link servedDescriptor}. */
  private readonly descriptors = new Map<string, Promise<PluginClientDescriptor | undefined>>();
  private readonly routeBase: string;
  private readonly importPlugin: PluginModuleImporter;
  private readonly prebuiltPlugins: () => string[];

  /** The app's loader: one instance, so a plugin initializes at most once per page. */
  public static instance(): ClientPluginLoader {
    ClientPluginLoader._instance ??= new ClientPluginLoader();
    return ClientPluginLoader._instance;
  }

  public constructor(options: ClientPluginLoaderOptions = {}) {
    this.routeBase = options.routeBase ?? PLUGIN_ROUTE_PREFIX;
    this.importPlugin = options.importModule ?? importModule;
    this.prebuiltPlugins = options.prebuiltPlugins ?? prebuiltPluginIds;
  }

  /**
   * The plugin's initialized instance, loading and initializing it on first
   * request. `undefined` when the server serves no client entry for that id:
   * a plugin the app does not have, or one without a client side.
   */
  public async getPlugin(id: string): Promise<ClientPlugin | undefined> {
    const known = this.instances.get(id);
    if (known) return known;

    const descriptor = await this.servedDescriptor(id);
    if (!descriptor) return undefined;

    // Re-check before starting: concurrent callers may have started the load
    // while this one awaited the descriptor, and they must share that instance.
    const started = this.instances.get(id);
    if (started) return started;

    const loading = this.load(descriptor);
    this.instances.set(id, loading);
    try {
      return await loading;
    } catch (error) {
      // Keep a failed plugin retryable rather than pinned to a rejected promise.
      this.instances.delete(id);
      throw error;
    }
  }

  /**
   * Tells the plugins that answer `hook` that the page has loaded, with the
   * page's context, loading them first if they are not loaded already.
   *
   * A plugin answers a page hook by overriding it (see {@link ClientPlugin}).
   * The plugins that can be checked for that without running them are the ones
   * the client knows: each prebuilt plugin's client module is imported and only
   * a class that overrides the hook is loaded for real. A dynamically loaded
   * plugin is named nowhere before it loads, so it answers a page hook only
   * once something else has loaded it.
   *
   * Nothing a plugin does here holds up the page: a plugin that cannot load is
   * reported and skipped, and so is one whose hook throws.
   */
  public async notifyPageHook<H extends PluginPageHook>(hook: H, context: PluginPageHookContexts[H]): Promise<void> {
    await Promise.all(this.prebuiltPlugins().map((id) => this.loadPageHookPlugin(id, hook)));

    for (const [id, plugin] of await this.loadedPlugins()) {
      if (!answersPageHook(Object.getPrototypeOf(plugin) as ClientPlugin, hook)) continue;
      try {
        await (plugin[hook] as (_context: PluginPageHookContexts[H]) => void | Promise<void>)(context);
      } catch (error) {
        console.error(`Plugin "${id}" failed its ${hook} hook`, error);
      }
    }
  }

  /** Loads one known plugin when its class overrides `hook`; a plugin that cannot be loaded is skipped. */
  private async loadPageHookPlugin(id: string, hook: PluginPageHook): Promise<void> {
    try {
      const Plugin = await this.pluginClass(id);
      if (Plugin && answersPageHook(Plugin.prototype, hook)) {
        await this.getPlugin(id);
      }
    } catch (error) {
      console.error(`Could not load plugin "${id}" for ${hook}`, error);
    }
  }

  /** Every plugin this loader has initialized, by id. */
  private async loadedPlugins(): Promise<[string, ClientPlugin][]> {
    return Promise.all([...this.instances].map(async ([id, plugin]) => [id, await plugin] as [string, ClientPlugin]));
  }

  /** The class a plugin's client module default-exports, imported but neither instantiated nor initialized. */
  private async pluginClass(id: string): Promise<(new () => ClientPlugin) | undefined> {
    const descriptor = await this.servedDescriptor(id);
    return descriptor ? await this.importPluginClass(descriptor) : undefined;
  }

  /** The descriptor the plugin route serves for one plugin, asked for once per id. */
  private servedDescriptor(id: string): Promise<PluginClientDescriptor | undefined> {
    const known = this.descriptors.get(id);
    if (known) return known;

    const request = this.fetchDescriptor(id).catch((error: unknown) => {
      // A failed request must not poison the loader; the next call retries.
      this.descriptors.delete(id);
      throw error;
    });
    this.descriptors.set(id, request);
    return request;
  }

  private async fetchDescriptor(id: string): Promise<PluginClientDescriptor | undefined> {
    const response = await fetch(`${this.routeBase}/${id}`);
    // A plugin the server serves no client entry for is nothing to load, which
    // is not an error: the route answers 404 for it.
    if (response.status === 404) return undefined;
    if (!response.ok) {
      throw new Error(`Failed to load plugin "${id}" (${response.status} ${response.statusText})`);
    }
    return (await response.json()) as PluginClientDescriptor;
  }

  private async load(descriptor: PluginClientDescriptor): Promise<ClientPlugin> {
    const Plugin = await this.importPluginClass(descriptor);

    // Everything the plugin ships is served under its own folder of the route;
    // the plugin reaches its files through the API (see `AnimoRankAPI.import`).
    const filesUrl = `${this.routeBase}/${descriptor.id}/`;
    const plugin = new Plugin();
    await plugin.init(new ClientAnimoRankAPI(descriptor.id, filesUrl));
    return plugin;
  }

  /** Imports the module the descriptor names and returns the plugin class it default-exports. */
  private async importPluginClass(descriptor: PluginClientDescriptor): Promise<new () => ClientPlugin> {
    // The shared entry runs before the per-side one, exactly as on the server.
    if (descriptor.globalUrl) {
      await this.importPlugin(descriptor.globalUrl);
    }

    const module = await this.importPlugin(descriptor.clientUrl);
    if (!module.default) {
      throw new Error(`Plugin "${descriptor.id}" has no default export in ${descriptor.clientUrl}`);
    }
    return module.default;
  }
}

/**
 * Whether a plugin class replaces `hook` with an implementation of its own:
 * what decides whether a page is the plugin's business at all. A plugin that
 * leaves the base method alone is not loaded for the page and never called.
 */
function answersPageHook(prototype: ClientPlugin, hook: PluginPageHook): boolean {
  const method: unknown = prototype[hook];
  return typeof method === 'function' && method !== ClientPlugin.prototype[hook];
}
