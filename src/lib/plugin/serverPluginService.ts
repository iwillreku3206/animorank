import path from 'path';
import { existsSync } from 'fs';
import { GlobalRegistryProvider } from '$lib/registry/global';
import { AppConfig } from '$lib/config/config';
import { PluginsConfigSection } from '$lib/config/sections/plugins';
import { PluginLoader } from './loader';
import type { LoadedPlugin } from './loadedPlugin';
import { PLUGIN_CLIENT_ENTRY, PLUGIN_GLOBAL_ENTRY, isServablePluginFile, pluginFileUrl } from './catalog.server';
import type { PluginClientDescriptor } from './catalog';
import { prebuiltClientEntries } from './prebuiltClientEntries';

/**
 * The descriptor of one loaded plugin: the files the browser runs for it, and
 * where it fetches them. A dynamically loaded plugin's files are served by the
 * plugin route; a prebuilt plugin's code belongs to the app's client build,
 * where Vite resolved the URLs of its entries. Either way the client is told
 * about a plugin only when it asks for it by id — the plugins of this server
 * are never listed.
 */
export function clientDescriptorOf(plugins: LoadedPlugin[], id: string): PluginClientDescriptor | undefined {
  const plugin = plugins.find((candidate) => candidate.manifest.id === id);
  if (!plugin) return undefined;

  if (plugin.type === 'prebuilt') {
    const entries = prebuiltClientEntries(id);
    return entries ? { ...plugin.manifest, clientUrl: entries.client, globalUrl: entries.global } : undefined;
  }

  // The shared entry, when the plugin ships one, runs before the client
  // entry on both sides; the browser fetches it from the same route.
  const globalUrl = plugin.files.has(PLUGIN_GLOBAL_ENTRY) ? pluginFileUrl(id, PLUGIN_GLOBAL_ENTRY) : undefined;
  return { ...plugin.manifest, clientUrl: pluginFileUrl(id, PLUGIN_CLIENT_ENTRY), globalUrl };
}

/**
 * The bytes of one file shipped by a loaded plugin, or `undefined` when the
 * plugin does not exist or does not serve that file. This is the only lookup
 * the public plugin-file route performs, so a request cannot reach anything
 * else — the path is never resolved against the filesystem.
 */
export function pluginFileOf(plugins: LoadedPlugin[], id: string, file: string): Buffer | undefined {
  const plugin = plugins.find((candidate) => candidate.manifest.id === id);
  if (!plugin || !isServablePluginFile(plugin.type, file)) return undefined;
  return plugin.files.get(file);
}

/**
 * The server's plugin registry: loads the app's plugins once and serves them
 * to the rest of the app — the public plugin routes (one plugin's descriptor
 * and its files) and any code that gates on a plugin being present.
 *
 * Loading is lazy: nothing is read from disk until the first call. A failed
 * load is final — the failure is cached so every caller reports the same reason
 * (see {@link getLoader}).
 */
export class ServerPluginService {
  private static _instance: ServerPluginService | null;

  private loaderPromise: Promise<PluginLoader> | null = null;

  public constructor(private readonly _root: string) {}

  public static instance(): ServerPluginService {
    ServerPluginService._instance ??= new ServerPluginService(process.cwd());
    return ServerPluginService._instance;
  }

  /**
   * The loaded plugin registry; plugins are read from disk and the prebuilt
   * globs on first call.
   *
   * A failed load is cached and rethrown unchanged: plugins are essential — the
   * app's features are incomplete without the ones this server ships — so a
   * plugin set that cannot load must fail every caller with the reason it
   * failed, never be retried behind their back. A retry could not succeed
   * anyway: the plugins that loaded before the failure registered into
   * process-wide registries, so a second attempt collides with those
   * registrations instead of reporting the plugin that actually broke.
   */
  public async getLoader(): Promise<PluginLoader> {
    this.loaderPromise ??= this.load();
    return this.loaderPromise;
  }

  /** One loaded plugin's descriptor, or `undefined`; see {@link clientDescriptorOf}. */
  public async getClientDescriptor(id: string): Promise<PluginClientDescriptor | undefined> {
    return clientDescriptorOf((await this.getLoader()).getPlugins(), id);
  }

  /** One file shipped by a loaded plugin, or `undefined`; see {@link pluginFileOf}. */
  public async readPluginFile(id: string, file: string): Promise<Buffer | undefined> {
    return pluginFileOf((await this.getLoader()).getPlugins(), id, file);
  }

  private async load(): Promise<PluginLoader> {
    const loader = new PluginLoader();
    const pluginDir = await this.resolvePluginDir();
    if (pluginDir) {
      if (!existsSync(pluginDir)) {
        throw new Error(`The configured plugin directory does not exist: ${pluginDir}`);
      }
      await loader.loadDynamicPlugins(pluginDir);
    }
    await loader.loadPrebuiltPlugins();
    return loader;
  }

  /**
   * The folder the app's global config names for dynamically loaded plugins.
   * Only that folder is ever scanned; without a configured folder there is
   * nothing to scan, so no other directory is guessed at.
   */
  private async resolvePluginDir(): Promise<string | undefined> {
    const configured = (await this.configuredPluginDir())?.trim();
    return configured ? path.resolve(this._root, configured) : undefined;
  }

  /** The plugin folder the app config names, or `undefined` when it names none. */
  private async configuredPluginDir(): Promise<string | undefined> {
    const config = await GlobalRegistryProvider.instance().getService(AppConfig);
    const dir = config.getSection(PluginsConfigSection)?.data?.pluginDir;
    // The config file is operator-edited JSON, hydrated without validation:
    // anything but a string names no folder.
    return typeof dir === 'string' ? dir : undefined;
  }
}
