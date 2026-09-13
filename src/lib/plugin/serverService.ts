import path from 'path';
import { existsSync, readFileSync } from 'fs';
import { GlobalRegistryProvider } from '$lib/registry/global';
import { AppConfig } from '$lib/config/config';
import { PluginsConfigSection } from '$lib/config/sections/plugins';
import { PluginLoader } from './loader';
import type { LoadedPlugin } from './loadedPlugin';
import {
  PLUGIN_GLOBAL_ENTRY,
  clientEntryOf,
  isServablePluginFile,
  pluginFileUrl,
  type PluginClientDescriptor
} from './catalog';

/** Where the app keeps its global config, relative to the process root (see `AppConfig`). */
const CONFIG_FILE = 'config.json';

/** The plugin folder named by a config file, if the file exists and names one. */
function readConfigPluginDir(configPath: string): string | undefined {
  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf8')) as { plugins?: { pluginDir?: unknown } };
    const dir = raw.plugins?.pluginDir;
    return typeof dir === 'string' && dir.trim() ? dir : undefined;
  } catch {
    // No config file: nothing is configured.
    return undefined;
  }
}

/**
 * Descriptors for every dynamically loaded plugin that ships a client entry:
 * what the browser loads from the plugin route. Prebuilt plugins ship with the
 * app and are imported through Vite instead, so they have no URL here.
 */
export function dynamicClientCatalogOf(plugins: LoadedPlugin[]): PluginClientDescriptor[] {
  return plugins
    .filter((plugin) => plugin.type === 'dynamic')
    .flatMap((plugin) => {
      const entry = clientEntryOf(plugin.files);
      if (!entry) return [];
      // The shared entry, when the plugin ships one, runs before the client
      // entry on both sides; the browser fetches it from the same route.
      const globalUrl = plugin.files.has(PLUGIN_GLOBAL_ENTRY)
        ? pluginFileUrl(plugin.manifest.id, PLUGIN_GLOBAL_ENTRY)
        : undefined;
      return [{ ...plugin.manifest, clientUrl: pluginFileUrl(plugin.manifest.id, entry), globalUrl }];
    })
    .sort((a, b) => a.id.localeCompare(b.id));
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
 * to the rest of the app — the public plugin routes (catalog and files) and
 * any code that gates on a plugin being present.
 *
 * Loading is lazy: nothing is read from disk until the first call. A failed
 * load is not cached, so a plugin directory that is created or repaired later
 * is picked up on the next call.
 */
export class ServerPluginService {
  private static _instance: ServerPluginService | null;

  private loaderPromise: Promise<PluginLoader> | null = null;

  public constructor(private readonly _root: string) {}

  public static instance(): ServerPluginService {
    ServerPluginService._instance ??= new ServerPluginService(process.cwd());
    return ServerPluginService._instance;
  }

  /** The loaded plugin registry; plugins are read from disk and the prebuilt globs on first call. */
  public async getLoader(): Promise<PluginLoader> {
    this.loaderPromise ??= this.load().catch((error: unknown) => {
      this.loaderPromise = null;
      throw error;
    });
    return this.loaderPromise;
  }

  /** Descriptors for every loaded dynamic plugin that ships a client entry; see {@link dynamicClientCatalogOf}. */
  public async getClientCatalog(): Promise<PluginClientDescriptor[]> {
    return dynamicClientCatalogOf((await this.getLoader()).getPlugins());
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

  /** The configured plugin directory, from the loaded config when there is one, else from the config file. */
  private async configuredPluginDir(): Promise<string | undefined> {
    try {
      const config = (await GlobalRegistryProvider.instance().getService(AppConfig)) as AppConfig;
      const section = config.getSection(PluginsConfigSection);
      if (section) return section.data?.pluginDir;
    } catch {
      // No config is registered: fall back to reading the config file itself.
    }
    return readConfigPluginDir(path.join(this._root, CONFIG_FILE));
  }
}
