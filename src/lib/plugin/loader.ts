import { Logger } from '$lib/logging/logger';
import { ServerRegistryProvider } from '$lib/registry/server';
import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import { PluginManifestSchema } from './manifest';
import { LoadedPlugin, type PluginServerModule } from './loadedPlugin';

/**
 * One prebuilt plugin, resolved at compile time via Vite glob imports (so it
 * is HMR-capable in the dev server):
 * - `manifest`: the manifest.json contents (validated on load)
 * - `files`: web-facing file contents (client entry plus static assets), keyed
 *   by the path relative to the plugin root
 * - `server`: the eagerly imported module namespace of the server entry
 *
 * The loader assembles the default set itself from the prebuilt plugin
 * directories (see {@link PluginLoader.loadPrebuiltPlugins}); descriptors are
 * only injected directly for tests or bespoke wiring.
 */
export interface PrebuiltPluginDescriptor {
  manifest: unknown;
  files: Map<string, Buffer>;
  server: PluginServerModule;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Roots that hold prebuilt plugin packages. `prefix` is the root as seen from
 * this file and MUST stay in sync with the literal glob patterns below (Vite
 * only accepts literal `import.meta.glob` patterns, so they cannot reference
 * these entries directly).
 */
const PREBUILT_PLUGIN_ROOTS: ReadonlyArray<{ prefix: string; label: string }> = [
  { prefix: '../../plugins/', label: 'src/plugins' },
  { prefix: '../../../plugins/', label: 'plugins' }
];

/**
 * Compile-time sources of every prebuilt plugin, gathered by Vite at dev
 * server startup / build time rather than read from disk at runtime. Each
 * plugin is a subdirectory of one of the roots above containing
 * `manifest.json`, `server.ts`, `client.ts` and an optional `static/` folder.
 * Plugin web files are imported as raw text so their bytes can be served
 * through the LoadedPlugin `files` map; `server.ts` is imported as a module.
 * Note that files added after startup are only picked up on the next server
 * restart, as the glob import list is static.
 */
const prebuiltManifestSources = import.meta.glob<string>(
  ['../../plugins/*/manifest.json', '../../../plugins/*/manifest.json'],
  { eager: true, import: 'default', query: '?raw' }
);

const prebuiltWebSources = import.meta.glob<string>(
  ['../../plugins/*/{client.ts,static/**/*}', '../../../plugins/*/{client.ts,static/**/*}'],
  { eager: true, import: 'default', query: '?raw' }
);

const prebuiltServerModules = import.meta.glob<PluginServerModule>(
  ['../../plugins/*/server.ts', '../../../plugins/*/server.ts'],
  { eager: true }
);

/** The plugin package a glob key belongs to: display label, root key and directory name. */
function prebuiltPluginPackageOf(key: string): { label: string; rootKey: string; dir: string } | null {
  for (const { prefix, label } of PREBUILT_PLUGIN_ROOTS) {
    if (!key.startsWith(prefix)) continue;
    const dir = key.slice(prefix.length, key.indexOf('/', prefix.length));
    return { label, rootKey: `${prefix}${dir}`, dir };
  }
  return null;
}

function collectPrebuiltPluginDescriptors(): PrebuiltPluginDescriptor[] {
  const packages = new Map<string, { label: string; dir: string }>();
  for (const key of [
    ...Object.keys(prebuiltManifestSources),
    ...Object.keys(prebuiltWebSources),
    ...Object.keys(prebuiltServerModules)
  ]) {
    const pkg = prebuiltPluginPackageOf(key);
    if (pkg) packages.set(pkg.rootKey, { label: pkg.label, dir: pkg.dir });
  }

  const descriptors: PrebuiltPluginDescriptor[] = [];
  for (const [rootKey, { label, dir }] of [...packages].sort(([a], [b]) => a.localeCompare(b))) {
    const location = `${label}/${dir}`;
    const at = (pathInPlugin: string) => `${rootKey}/${pathInPlugin}`;

    const manifestSource = prebuiltManifestSources[at('manifest.json')];
    if (manifestSource === undefined) {
      throw new Error(`manifest.json is missing in prebuilt plugin at ${location}`);
    }

    const server = prebuiltServerModules[at('server.ts')];
    if (server === undefined) {
      throw new Error(`server.ts is missing in prebuilt plugin at ${location}`);
    }

    const client = prebuiltWebSources[at('client.ts')];
    if (client === undefined) {
      throw new Error(`client.ts is missing in prebuilt plugin at ${location}`);
    }

    let manifest: unknown;
    try {
      manifest = JSON.parse(manifestSource);
    } catch (error) {
      throw new Error(`invalid manifest.json in prebuilt plugin at ${location}: ${errorMessage(error)}`, {
        cause: error
      });
    }

    const files = new Map<string, Buffer>([['client.ts', Buffer.from(client)]]);
    const staticPrefix = at('static/');
    for (const key of Object.keys(prebuiltWebSources)
      .filter((key) => key.startsWith(staticPrefix))
      .sort()) {
      files.set(key.slice(rootKey.length + 1), Buffer.from(prebuiltWebSources[key]));
    }

    descriptors.push({ manifest, files, server });
  }

  return descriptors;
}

const prebuiltPluginDescriptors = collectPrebuiltPluginDescriptors();

export class PluginLoader {
  private plugins: Map<string, LoadedPlugin> = new Map();
  private loggerPromise: Promise<Logger> | null = null;

  /**
   * Load every plugin package in `pluginDir` at runtime. Each plugin is a
   * subdirectory containing manifest.json, client.js, server.js and an
   * optional static/ folder. Broken entries are logged and skipped so one bad
   * third-party plugin cannot prevent the rest from loading.
   *
   * @returns the newly loaded plugins, in no particular order
   */
  public async loadDynamicPlugins(pluginDir: string): Promise<LoadedPlugin[]> {
    const logger = await this.getLogger();
    const loaded: LoadedPlugin[] = [];

    await Promise.all(
      (await fs.readdir(pluginDir)).sort().map(async (dirname) => {
        const dir = path.join(pluginDir, dirname);
        try {
          if (!(await fs.stat(dir)).isDirectory()) {
            logger.warning(`Non-directory detected in plugin directory: ${dirname}`);
            return;
          }
          const plugin = await this.loadDynamicPlugin(dir);
          if (this.register(plugin, logger)) loaded.push(plugin);
        } catch (error) {
          logger.error(`Failed to load plugin "${dirname}": ${errorMessage(error)}`);
        }
      })
    );

    return loaded;
  }

  private async loadDynamicPlugin(dir: string): Promise<LoadedPlugin> {
    const [manifest, client, staticFiles, server] = await Promise.all([
      this.readManifest(dir),
      this.readPluginFile(dir, 'client.js'),
      this.readStaticFiles(dir),
      import(pathToFileURL(path.join(dir, 'server.js')).href) as Promise<PluginServerModule>
    ]);

    const files = new Map<string, Buffer>([['client.js', client]]);
    for (const [relPath, content] of staticFiles) {
      files.set(relPath, content);
    }

    return new LoadedPlugin('dynamic', manifest, files, server);
  }

  /**
   * Load the app's prebuilt plugins. Prebuilt plugins ship with the app:
   * each package lives in its own directory under `src/plugins/` or the
   * repository-root `plugins/`, containing `manifest.json`, `server.ts`,
   * `client.ts` and an optional `static/` folder. They are wired in at
   * compile time via Vite glob imports (HMR-capable in the dev server)
   * instead of being read from disk at runtime.
   *
   * Pass an explicit descriptor list to override the glob-discovered
   * defaults (tests, bespoke wiring). Every manifest is validated and the
   * plugin is registered under its manifest id; invalid packages are
   * programmer errors and fail the whole load.
   *
   * @returns the newly loaded plugins
   */
  public async loadPrebuiltPlugins(
    plugins: PrebuiltPluginDescriptor[] = prebuiltPluginDescriptors
  ): Promise<LoadedPlugin[]> {
    const logger = await this.getLogger();
    const loaded: LoadedPlugin[] = [];

    for (const { manifest, files, server } of plugins) {
      const plugin = new LoadedPlugin('prebuilt', PluginManifestSchema.parse(manifest), files, server);
      if (this.register(plugin, logger)) loaded.push(plugin);
    }

    return loaded;
  }

  /** The plugin registered under the manifest id, if one is loaded. */
  public getPlugin(id: string): LoadedPlugin | undefined {
    return this.plugins.get(id);
  }

  private register(plugin: LoadedPlugin, logger: Logger): boolean {
    const { id } = plugin.manifest;
    if (this.plugins.has(id)) {
      logger.warning(`Skipping plugin "${id}": a plugin with this id is already loaded`);
      return false;
    }
    this.plugins.set(id, plugin);
    return true;
  }

  private async readManifest(dir: string) {
    const raw = (await this.readPluginFile(dir, 'manifest.json')).toString('utf8');
    try {
      return PluginManifestSchema.parse(JSON.parse(raw));
    } catch (error) {
      throw new Error(`invalid manifest.json in plugin at ${dir}: ${errorMessage(error)}`, { cause: error });
    }
  }

  /** Optional static/ tree of a plugin, keyed by the path relative to its root. */
  private async readStaticFiles(dir: string): Promise<Map<string, Buffer>> {
    const files = new Map<string, Buffer>();
    await this.readTree(path.join(dir, 'static'), 'static', files);
    return files;
  }

  private async readTree(dir: string, relPath: string, out: Map<string, Buffer>): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
    await Promise.all(
      entries.map(async (entry) => {
        const entryRelPath = `${relPath}/${entry.name}`;
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await this.readTree(entryPath, entryRelPath, out);
        } else if (entry.isFile()) {
          out.set(entryRelPath, await fs.readFile(entryPath));
        }
      })
    );
  }

  private async readPluginFile(dir: string, name: string): Promise<Buffer> {
    try {
      return await fs.readFile(path.join(dir, name));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`${name} is missing in plugin at ${dir}`, { cause: error });
      }
      throw error;
    }
  }

  private getLogger(): Promise<Logger> {
    this.loggerPromise ??= ServerRegistryProvider.instance().getService(Logger, 'plugin');
    return this.loggerPromise;
  }
}
