import type { RegistryProvider } from '$lib/registry/registryProvider';
import { ReadOnlyRegistryProvider } from '$lib/registry/readOnlyRegistryProvider';
import { RegistryProviderRegistrar } from '$lib/registry/registryProviderRegistrar';

/** A specifier that names its own location — a URL (`file:`, `data:`, …) or a path from the root — and needs no plugin URL to resolve. */
const ABSOLUTE_SPECIFIER = /^(?:[a-z][a-z0-9+.-]*:|\/)/i;

/**
 * Plugin-facing access to the app. The registry members are each one adapter
 * over one provider: `…RegistryProvider` is the read path (read-only views of
 * that provider's registries), `…RegistryProviderRegistrar` the write path (it
 * stamps the plugin id onto every registry id and key it writes). This base
 * carries the global-provider pair; runtime subclasses add their own
 * provider's pair. {@link import} loads a module for the plugin.
 */
export abstract class AnimoRankAPI {
  public readonly globalRegistryProvider: ReadOnlyRegistryProvider;
  public readonly globalRegistryProviderRegistrar: RegistryProviderRegistrar;
  /** URL the plugin's files live under, ending in `/`; see {@link import}. */
  private readonly filesUrl: string | undefined;

  protected constructor(globalProvider: RegistryProvider, pluginId: string, filesUrl?: string) {
    this.globalRegistryProvider = new ReadOnlyRegistryProvider(globalProvider);
    this.globalRegistryProviderRegistrar = new RegistryProviderRegistrar(globalProvider, pluginId);
    this.filesUrl = filesUrl;
  }

  /**
   * Imports a module for the plugin: one of its own files, named by its path
   * within the plugin (`lib/helper.js`), or one the plugin names outright.
   *
   * A path within the plugin is resolved against the URL the plugin's files
   * live under — a plugin names its files, never where they are served from.
   * This is how a plugin pulls in the rest of itself when the platform gives
   * its code no directory to resolve against: the server runs a dynamic
   * plugin's scripts from a `data:` URL, which has none, so a relative `import`
   * inside them cannot be resolved; in the browser, where a plugin's files are
   * served under its route, this reaches the same file a relative `import` of
   * the same path would.
   *
   * A path that names its own location — a URL (`file:///…`, `data:…`) or a
   * path starting with `/` — is imported as given, which is how a plugin loads
   * a file outside its own directory.
   *
   * @param path a path within the plugin, with or without a leading `./`, or a
   * path that names its own location
   * @throws when a path within the plugin is asked of a plugin whose files are
   * not served from a URL — a prebuilt plugin is compiled into the app, and
   * imports its files statically
   */
  public async import<T = unknown>(path: string): Promise<T> {
    // The specifier is chosen by the plugin at runtime — one of its files, or
    // one it names — so it cannot be a static import of this module.
    if (ABSOLUTE_SPECIFIER.test(path)) {
      return (await import(/* @vite-ignore */ path)) as T;
    }
    if (this.filesUrl === undefined) {
      throw new Error('This plugin ships with the app; import its files statically instead');
    }
    return (await import(/* @vite-ignore */ `${this.filesUrl}${path.replace(/^\.\//, '')}`)) as T;
  }
}
