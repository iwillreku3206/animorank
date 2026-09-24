import { ServerAnimoRankAPI } from '$lib/api/server';
import { browser } from '$app/environment';
import { Logger } from '$lib/logging/logger';
import { ServerRegistryProvider } from '$lib/registry/server';
import { errorMessage } from '$lib/utils/errorMessage';
import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import { PluginManifestSchema } from './manifest';
import { LoadedPlugin, type PluginServerModule } from './loadedPlugin';

/**
 * One prebuilt plugin, resolved at compile time via Vite glob imports (so it
 * is HMR-capable in the dev server):
 * - `manifest`: the manifest.json contents (validated on load)
 * - `server`: the eagerly imported module namespace of the server entry
 *
 * The loader assembles the default set itself from the prebuilt plugin
 * directories (see {@link PluginLoader.loadPrebuiltPlugins}); descriptors are
 * only injected directly for tests or bespoke wiring.
 *
 * A descriptor carries no browser-facing files: a prebuilt plugin's code is
 * part of the app's own client build, so nothing of its package is served.
 */
export interface PrebuiltPluginDescriptor {
  manifest: unknown;
  server: PluginServerModule;
}

/**
 * A runtime plugin's server-side scripts, as read from its package.
 *
 * `global` is the plugin's shared entry; it runs before `server`, the same
 * order the browser uses. Only `global` is optional.
 */
async function readServerScripts(dir: string): Promise<{ global?: string; server: string }> {
  const server = await readScript(path.join(dir, 'server.js'));
  if (server === undefined) throw new Error(`server.js is missing in plugin at ${dir}`);
  return { global: await readScript(path.join(dir, 'global.js')), server };
}

/**
 * Import a plugin script from its source through a data URL rather than its
 * file path: the dev server owns module resolution for the paths it knows, and
 * resolving a plugin path through it would tie a runtime plugin to the build
 * tool. A data URL is resolved by the runtime itself, so a plugin directory
 * stays an ordinary part of the filesystem.
 */
async function importSource(source: string): Promise<UnknownModule> {
  const url = `data:text/javascript;base64,${Buffer.from(source, 'utf8').toString('base64')}`;
  return (await import(/* @vite-ignore */ url)) as UnknownModule;
}

/** A plugin script's module namespace, narrowed to what the loader needs. */
type UnknownModule = PluginServerModule & Record<string, unknown>;

/** The source of an optional plugin script; `undefined` when the plugin does not ship it. */
async function readScript(file: string): Promise<string | undefined> {
  try {
    return await fs.readFile(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

/**
 * Roots that hold prebuilt plugin packages. `prefix` is the root as seen from
 * this file and MUST stay in sync with the literal glob patterns below (Vite
 * only accepts literal `import.meta.glob` patterns, so they cannot reference
 * these entries directly).
 */
const PREBUILT_PLUGIN_ROOTS: ReadonlyArray<{ prefix: string; label: string }> = [
  { prefix: '../plugins/', label: 'src/lib/plugins' },
  { prefix: '../../../plugins/', label: 'plugins' }
];

/**
 * Compile-time sources of every prebuilt plugin, gathered by Vite at dev
 * server startup / build time rather than read from disk at runtime. Each
 * plugin is a subdirectory of one of the roots above containing
 * `manifest.json`, `server.ts`, `client.ts` and an optional `client/` folder.
 * Plugin client files are imported as raw text so their bytes can be served
 * through the LoadedPlugin `files` map; `server.ts` is imported as a module.
 * Note that files added after startup are only picked up on the next server
 * restart, as the glob import list is static.
 */
const prebuiltManifestSources = import.meta.glob<string>(
  ['../plugins/*/manifest.json', '../../../plugins/*/manifest.json'],
  { eager: true, import: 'default', query: '?raw' }
);

const prebuiltWebSources = import.meta.glob<string>(
  [
    '../plugins/*/{client.ts,client/**/*}',
    '../../../plugins/*/{client.ts,client/**/*}',
    '../plugins/*/global.ts',
    '../../../plugins/*/global.ts'
  ],
  { eager: true, import: 'default', query: '?raw' }
);

const prebuiltServerModules = import.meta.glob<PluginServerModule>(
  ['../plugins/*/server.ts', '../../../plugins/*/server.ts'],
  {
    eager: true
  }
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
  // A package counts as prebuilt only when it compiles in with the app, i.e.
  // it ships the TypeScript entries. Directories holding runtime (.js)
  // plugins are deliberately ignored here — they are the dynamic loader's.
  const packages = new Map<string, { label: string; dir: string }>();
  for (const key of [
    ...Object.keys(prebuiltServerModules),
    ...Object.keys(prebuiltWebSources).filter((key) => key.endsWith('/client.ts'))
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

    descriptors.push({ manifest, server });
  }

  return descriptors;
}

const prebuiltPluginDescriptors = collectPrebuiltPluginDescriptors();

/**
 * The app's prebuilt plugins, initialized once per process: their descriptors
 * are fixed at compile time and their entries register into process-wide
 * registries, so a second initialization would collide with the first. Every
 * loader gets the plugins the first one initialized — including its failure, if
 * it failed: a plugin set that cannot be initialized is a broken deployment,
 * and re-running the initialization would collide with whatever registered
 * before the failure.
 */
let appPrebuiltPlugins: Promise<LoadedPlugin[]> | null = null;

export class PluginLoader {
  private plugins: Map<string, LoadedPlugin> = new Map();
  private loggerPromise: Promise<Logger> | null = null;

  public constructor() {
    // Loading reads the filesystem and executes plugin scripts, so it belongs
    // to the server; the browser loads plugins through `ClientPluginLoader`.
    if (browser) {
      throw new Error('Plugins can only be loaded on the server');
    }
  }

  /**
   * Load every plugin package in `pluginDir` at runtime. Each plugin is a
   * subdirectory containing manifest.json, client.js, server.js and an
   * optional client/ folder whose files are served to the browser. Broken
   * entries are logged and skipped so one bad third-party plugin cannot
   * prevent the rest from loading; a plugin whose `init` throws, however,
   * aborts the load.
   *
   * That abort is deliberate: a plugin is assumed to be as essential as the
   * features it adds, so a plugin set that cannot be initialized is a broken
   * deployment and is meant to fail loudly — a server missing half its plugins
   * would look fine while behaving wrongly. Whoever catches the failure reports
   * it (see `ServerPluginService.getLoader`, which caches it so the same reason
   * reaches every caller).
   *
   * @returns the newly loaded plugins, in no particular order
   */
  public async loadDynamicPlugins(pluginDir: string): Promise<LoadedPlugin[]> {
    const logger = await this.getLogger();
    const loaded: LoadedPlugin[] = [];

    await Promise.all(
      (await fs.readdir(pluginDir)).sort().map(async (dirname) => {
        const dir = path.join(pluginDir, dirname);
        let plugin: LoadedPlugin;
        try {
          if (!(await fs.stat(dir)).isDirectory()) {
            logger.warning(`Non-directory detected in plugin directory: ${dirname}`);
            return;
          }
          plugin = await this.loadDynamicPlugin(dir);
        } catch (error) {
          logger.error(`Failed to load plugin "${dirname}": ${errorMessage(error)}`);
          return;
        }
        await this.initialize(plugin);
        if (this.register(plugin, logger)) loaded.push(plugin);
      })
    );

    return loaded;
  }

  private async loadDynamicPlugin(dir: string): Promise<LoadedPlugin> {
    // A prebuilt package ships `server.ts` and is compiled in with the app;
    // the dynamic loader owns only the runtime (.js) packages.
    if (await this.isPrebuiltPackage(dir)) {
      throw new Error(`${dir} is a prebuilt plugin package and is loaded by the app`);
    }

    const [manifest, client, clientFiles, scripts] = await Promise.all([
      this.readManifest(dir),
      this.readPluginFile(dir, 'client.js'),
      this.readClientFiles(dir),
      readServerScripts(dir)
    ]);

    // The shared entry runs before the per-side one, exactly as on the client.
    if (scripts.global !== undefined) await importSource(scripts.global);
    const server = await importSource(scripts.server);

    const files = new Map<string, Buffer>([['client.js', client]]);
    if (scripts.global !== undefined) {
      files.set('global.js', Buffer.from(scripts.global, 'utf8'));
    }
    for (const [relPath, content] of clientFiles) {
      files.set(relPath, content);
    }

    // A dynamic plugin's own files sit next to its entries: the URL its
    // scripts load the rest of the plugin from (see `AnimoRankAPI.import`).
    const filesUrl = pathToFileURL(dir).href + '/';
    return new LoadedPlugin('dynamic', manifest, files, server, filesUrl);
  }

  /**
   * Load the app's prebuilt plugins. Builtin plugins ship with the app: each
   * package lives in its own directory under `src/lib/plugins/` or the
   * repository-root `plugins/`, containing `manifest.json`, `server.ts`,
   * `client.ts` and an optional `client/` folder. This side of the plugin —
   * what runs on the server — is wired in at compile time via Vite glob
   * imports (HMR-capable in the dev server) instead of being read from disk at
   * runtime; the package's client entries are compiled by the app's build and
   * served by the plugin route (see `scripts/prebuiltPluginEntries.ts`).
   *
   * Pass an explicit descriptor list to load those instead (tests, bespoke
   * wiring), which leaves the app's own set untouched. The app's set
   * initializes once per process — its entries register into process-wide
   * registries — and a loader asking for it later gets the plugins the first
   * one initialized. Every manifest is validated and the plugin is registered
   * under its manifest id; invalid packages are programmer errors and fail the
   * whole load.
   *
   * @returns the plugins this loader holds
   */
  public async loadPrebuiltPlugins(plugins?: PrebuiltPluginDescriptor[]): Promise<LoadedPlugin[]> {
    const logger = await this.getLogger();
    const loaded: LoadedPlugin[] = [];

    const prebuilt =
      plugins === undefined
        ? await (appPrebuiltPlugins ??= this.initializePrebuilt(prebuiltPluginDescriptors))
        : await this.initializePrebuilt(plugins);

    for (const plugin of prebuilt) {
      if (this.register(plugin, logger)) loaded.push(plugin);
    }

    return loaded;
  }

  /** Initialize the given descriptors in order; a plugin that cannot initialize aborts the load. */
  private async initializePrebuilt(plugins: PrebuiltPluginDescriptor[]): Promise<LoadedPlugin[]> {
    const initialized: LoadedPlugin[] = [];

    for (const { manifest, server } of plugins) {
      const plugin = new LoadedPlugin('prebuilt', PluginManifestSchema.parse(manifest), new Map(), server);
      await this.initialize(plugin);
      initialized.push(plugin);
    }

    return initialized;
  }

  /** The plugin registered under the manifest id, if one is loaded. */
  public getPlugin(id: string): LoadedPlugin | undefined {
    return this.plugins.get(id);
  }

  /** Every loaded plugin, in registration order. */
  public getPlugins(): LoadedPlugin[] {
    return [...this.plugins.values()];
  }

  /**
   * Instantiate the plugin, hand it its API and run its server entry point.
   * A plugin that cannot initialize aborts the load.
   */
  private async initialize(plugin: LoadedPlugin): Promise<void> {
    const Plugin = plugin.server.default;
    if (!Plugin) return;
    if (typeof Plugin !== 'function') {
      throw new Error(`Plugin "${plugin.manifest.id}" does not default-export a ServerPlugin class`);
    }
    const instance = new Plugin();
    if (typeof instance.init !== 'function') {
      throw new Error(`Plugin "${plugin.manifest.id}" has no init() to run`);
    }
    await instance.init(new ServerAnimoRankAPI(plugin.manifest.id, plugin.filesUrl));
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

  /** The plugin's client/ folder, keyed by the path relative to the plugin root (e.g. `client/helper.js`). */
  private async readClientFiles(dir: string): Promise<Map<string, Buffer>> {
    const files = new Map<string, Buffer>();
    await this.readTree(path.join(dir, 'client'), 'client', files);
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

  /** Whether a directory is a prebuilt package (TypeScript entries) rather than a runtime plugin. */
  private async isPrebuiltPackage(dir: string): Promise<boolean> {
    return (await this.exists(path.join(dir, 'server.ts'))) && (await this.exists(path.join(dir, 'client.ts')));
  }

  private async exists(file: string): Promise<boolean> {
    try {
      await fs.stat(file);
      return true;
    } catch {
      return false;
    }
  }

  private getLogger(): Promise<Logger> {
    this.loggerPromise ??= ServerRegistryProvider.instance().getService(Logger, 'plugin');
    return this.loggerPromise;
  }
}
