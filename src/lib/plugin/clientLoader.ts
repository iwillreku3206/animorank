import { ClientAnimoRankAPI } from '$lib/api/client';
import { PLUGIN_ROUTE_PREFIX, type PluginClientDescriptor } from './catalog';
import type { ClientPlugin } from './clientPlugin';
import { PluginManifestSchema } from './manifest';

/** A plugin client module: its default export is the {@link ClientPlugin} class to instantiate. */
export interface PluginClientModule {
  default?: new () => ClientPlugin;
}

/**
 * Imports a plugin client module. Dynamic plugins are imported from the plugin
 * route URL; prebuilt ones are imported through their module path, so Vite
 * bundles and resolves them like any other module of the app.
 */
export type PluginModuleImporter = (_path: string) => Promise<PluginClientModule>;

export interface ClientPluginLoaderOptions {
  /** URL of the dynamic-plugin catalog; defaults to the {@link PLUGIN_ROUTE_PREFIX} route. */
  catalogUrl?: string;
  /** Module importer override; see {@link PluginModuleImporter}. */
  importModule?: PluginModuleImporter;
  /** Prebuilt plugin descriptors; defaults to {@link prebuiltPluginDescriptors}. */
  prebuilt?: PluginClientDescriptor[];
}

async function importModule(path: string): Promise<PluginClientModule> {
  return (await import(/* @vite-ignore */ path)) as PluginClientModule;
}

/**
 * Manifests of the plugins that ship with the app, read at build time. Their
 * code is imported through Vite rather than the plugin route, and only when a
 * plugin is actually requested — the code glob below stays lazy on purpose.
 *
 * `import.meta.glob` needs literal patterns, so the two prebuilt roots
 * (`src/lib/plugins/` and the repository-root `plugins/`) are spelled out;
 * see the loader for the server-side equivalent.
 */
const prebuiltManifestSources = import.meta.glob<unknown>(
  ['../plugins/*/manifest.json', '../../../plugins/*/manifest.json'],
  { eager: true, import: 'default' }
);

const prebuiltModulePaths = import.meta.glob<PluginClientModule>([
  '../plugins/*/client.ts',
  '../../../plugins/*/client.ts'
]);

const prebuiltGlobalPaths = import.meta.glob<Record<string, unknown>>([
  '../plugins/*/global.ts',
  '../../../plugins/*/global.ts'
]);

/** Imports the shared entry of a prebuilt plugin, when it ships one. */
function globalLoaderOf(modulePath: string): (() => Promise<unknown>) | undefined {
  const dir = modulePath.slice(0, modulePath.lastIndexOf('/'));
  return prebuiltGlobalPaths[`${dir}/global.ts`];
}

/** The plugin directory a glob key names: the segment right after `plugins/`. */
function pluginDirOf(key: string): string | undefined {
  const match = /(?:^|\/)plugins\/([^/]+)\//.exec(key);
  return match?.[1];
}

/** Descriptors of the app's prebuilt plugins; code paths are Vite module paths, not route URLs. */
export function prebuiltPluginDescriptors(): PluginClientDescriptor[] {
  const modulesByDir = new Map<string, string>();
  for (const key of Object.keys(prebuiltModulePaths)) {
    const dir = pluginDirOf(key);
    if (dir) modulesByDir.set(dir, key);
  }

  const descriptors: PluginClientDescriptor[] = [];
  for (const [dir, modulePath] of modulesByDir) {
    const source = prebuiltManifestSources[`${modulePath.slice(0, modulePath.lastIndexOf('/'))}/manifest.json`];
    if (source === undefined) continue;

    const manifest = PluginManifestSchema.safeParse(source);
    if (!manifest.success || manifest.data.id !== dir) {
      // A manifest that does not match its directory is not a plugin package.
      continue;
    }
    descriptors.push({ ...manifest.data, modulePath, loadGlobal: globalLoaderOf(modulePath) });
  }
  return descriptors.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Loads plugin client entries on demand.
 *
 * Two sources feed one catalog: the app's prebuilt plugins (known at build
 * time, imported through Vite) and the dynamic plugins the server offers
 * (discovered from {@link PLUGIN_ROUTE_PREFIX}, then fetched from it). Only the
 * discovery request happens up front — a plugin's code, its `init`, and with
 * them the registries it contributes to, run the first time the plugin is
 * actually requested through {@link getPlugin}.
 * Resolution is memoized, so a plugin initializes at most once even under
 * concurrent requests; a failed load is not memoized and can be retried.
 */
export class ClientPluginLoader {
  private static _instance: ClientPluginLoader | null = null;

  private readonly instances = new Map<string, Promise<ClientPlugin>>();
  private readonly catalogUrl: string;
  private readonly importPlugin: PluginModuleImporter;
  private readonly prebuilt: PluginClientDescriptor[];
  private dynamicCatalog: Promise<PluginClientDescriptor[]> | null = null;

  /** The app's loader: one instance, so a plugin initializes at most once per page. */
  public static instance(): ClientPluginLoader {
    ClientPluginLoader._instance ??= new ClientPluginLoader();
    return ClientPluginLoader._instance;
  }

  public constructor(options: ClientPluginLoaderOptions = {}) {
    this.catalogUrl = options.catalogUrl ?? PLUGIN_ROUTE_PREFIX;
    this.importPlugin = options.importModule ?? importModule;
    this.prebuilt = options.prebuilt ?? prebuiltPluginDescriptors();
  }

  /** Every plugin the client can load: the prebuilt ones plus what the server offers, without loading code. */
  public async catalog(): Promise<PluginClientDescriptor[]> {
    const dynamic = await this.dynamicPlugins();
    const prebuilt = new Set(this.prebuilt.map((plugin) => plugin.id));
    // A prebuilt plugin wins: its code ships with the app, so loading it never
    // has to cross the network.
    return [...this.prebuilt, ...dynamic.filter((plugin) => !prebuilt.has(plugin.id))];
  }

  /** The plugin's initialized instance, loading and initializing it on first request. */
  public async getPlugin(id: string): Promise<ClientPlugin | undefined> {
    const known = this.instances.get(id);
    if (known) return known;

    const descriptor = (await this.catalog()).find((plugin) => plugin.id === id);
    if (!descriptor) return undefined;

    // Re-check before starting: concurrent callers may have started the load
    // while this one awaited the catalog, and they must share that instance.
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

  /** Loads and initializes every plugin in the catalog (order-independent, each at most once). */
  public async loadAll(): Promise<ClientPlugin[]> {
    const descriptors = await this.catalog();
    const plugins = await Promise.all(descriptors.map((descriptor) => this.getPlugin(descriptor.id)));
    return plugins.filter((plugin): plugin is ClientPlugin => plugin !== undefined);
  }

  private async load(descriptor: PluginClientDescriptor): Promise<ClientPlugin> {
    const source = descriptor.modulePath ?? descriptor.clientUrl;
    if (!source) {
      throw new Error(`Plugin "${descriptor.id}" declares no client entry`);
    }

    // The shared entry runs before the per-side one, exactly as on the server.
    const globalUrl = descriptor.globalUrl;
    if (descriptor.loadGlobal) {
      await descriptor.loadGlobal();
    } else if (globalUrl) {
      await this.importPlugin(globalUrl);
    }

    const module = await this.importPlugin(source);
    if (!module.default) {
      throw new Error(`Plugin "${descriptor.id}" has no default export in ${source}`);
    }

    const plugin = new module.default();
    await plugin.init(new ClientAnimoRankAPI(descriptor.id));
    return plugin;
  }

  /** The server's dynamic plugins, fetched once and cached. */
  private async dynamicPlugins(): Promise<PluginClientDescriptor[]> {
    this.dynamicCatalog ??= this.fetchDynamicCatalog().catch((error: unknown) => {
      // A failed discovery must not poison the loader; the next call retries.
      this.dynamicCatalog = null;
      throw error;
    });
    return this.dynamicCatalog;
  }

  private async fetchDynamicCatalog(): Promise<PluginClientDescriptor[]> {
    const response = await fetch(this.catalogUrl);
    if (!response.ok) {
      throw new Error(`Failed to load the plugin catalog (${response.status} ${response.statusText})`);
    }
    return ((await response.json()) as { plugins: PluginClientDescriptor[] }).plugins;
  }
}
