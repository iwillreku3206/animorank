import type { RegistryProvider } from '$lib/registry/registryProvider';
import { ClientPluginLoader } from './clientLoader';

/** The registry providers a plugin registers into from the browser. */
export type RegistryDomain = 'client' | 'global';

/** One client registry provider and the domain its registrations are attributed to. */
export interface DomainProvider {
  provider: RegistryProvider;
  domain: RegistryDomain;
}

/** Which plugin the server attributes a registry or one of its items to. */
export interface AttributionSource {
  /** The plugin that registered the registry `_id` in `_domain`, if any. */
  pluginForRegistry(_domain: RegistryDomain, _id: string): Promise<string | undefined>;
  /** The plugin that registered item `_key` of registry `_registryId` in `_domain`, if any. */
  pluginForItem(_domain: RegistryDomain, _registryId: string, _key: string): Promise<string | undefined>;
  /** Every plugin that writes into registry `_registryId` in `_domain`. */
  writersForRegistry(_domain: RegistryDomain, _registryId: string): Promise<string[]>;
}

/**
 * Client for the app's attribution routes (see `src/routes/api/plugin`): which
 * plugin registered a registry, or one of its items, as the server saw it.
 * Answers are memoized — including "no plugin registered it" — so a request
 * that keeps missing does not keep asking.
 */
export class RegistryAttribution implements AttributionSource {
  private readonly base: string;
  private readonly pending = new Map<string, Promise<Record<string, unknown> | undefined>>();

  /** @param base URL of the attribution API; same-origin by default. */
  public constructor(base = '/api/plugin') {
    this.base = base;
  }

  public async pluginForRegistry(domain: RegistryDomain, id: string): Promise<string | undefined> {
    const body = await this.query('registry', { domain, id });
    return typeof body?.plugin === 'string' ? body.plugin : undefined;
  }

  public async pluginForItem(domain: RegistryDomain, registryId: string, key: string): Promise<string | undefined> {
    const body = await this.query('registryItem', { domain, registry: registryId, id: key });
    return typeof body?.plugin === 'string' ? body.plugin : undefined;
  }

  /** The plugins the API reports as writing into the registry; empty when it knows of none. */
  public async writersForRegistry(domain: RegistryDomain, registryId: string): Promise<string[]> {
    const body = await this.query('registryWriters', { domain, registry: registryId });
    return Array.isArray(body?.plugins) ? (body.plugins as string[]) : [];
  }

  private query(route: string, params: Record<string, string>): Promise<Record<string, unknown> | undefined> {
    const url = `${this.base}/${route}?${new URLSearchParams(params)}`;
    const known = this.pending.get(url);
    if (known) {
      return known;
    }
    const query = this.fetchBody(url);
    this.pending.set(url, query);
    return query;
  }

  /**
   * The API's JSON body; `undefined` when it knows of nothing (a 404) or the
   * request fails. A failure counts as unknown too: the caller still sweeps
   * the catalog, and a request that cannot be satisfied ends in the lookup's
   * own error.
   */
  private async fetchBody(url: string): Promise<Record<string, unknown> | undefined> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return undefined;
      }
      return (await response.json()) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }
}

export interface ClientLazyLoadingOptions {
  /** Plugin loader to drive; defaults to the shared {@link ClientPluginLoader.instance}. */
  loader?: ClientPluginLoader;
  /** Where attribution is read from; defaults to the app's attribution API. */
  attribution?: AttributionSource;
}

/**
 * Makes the client's registry providers load plugins on demand: requesting a
 * registry or an item that is not registered yet calls the client plugin
 * loader for the plugin that provides it, after which the lookup is retried.
 *
 * The providing plugin is resolved in this order:
 * 1. a qualified registry id (`plugin:registry-id`) names its plugin directly;
 * 2. otherwise the server is asked which plugin registered the registry or the
 *    item — what the `/api/plugin` routes report;
 * 3. when the server cannot attribute it, catalog plugins load one at a time
 *    until the request resolves. The server only knows what its own runtime
 *    registered, so a plugin that registers from its client entry alone (a
 *    window registry, a client-side operator) is found this way.
 */
export function enableClientLazyPluginLoading(
  domains: readonly DomainProvider[],
  options: ClientLazyLoadingOptions = {}
): void {
  const loader = options.loader ?? ClientPluginLoader.instance();
  const attribution = options.attribution ?? new RegistryAttribution();

  for (const { provider, domain } of domains) {
    provider.setRegistryResolver(async (id) => {
      const found = () => provider.findRegistry(id) !== undefined;
      const candidates = [pluginNamespaceOf(id), await attribution.pluginForRegistry(domain, id)];
      for (const pluginId of candidates) {
        if (!pluginId) continue;
        // A plugin the catalog does not offer — or one that fails to load —
        // is skipped; the sweep below is the safety net.
        await loader.getPlugin(pluginId).catch(() => undefined);
        if (found()) return;
      }
      await loadUntil(loader, found);
    });

    provider.setRegistryMissResolver(async (registry, key) => {
      const found = () => registry.keys().includes(key);
      const plugin = await attribution.pluginForItem(domain, registry.id, key);
      if (plugin) {
        await loader.getPlugin(plugin).catch(() => undefined);
        if (found()) return;
      }
      await loadUntil(loader, found);
    });

    provider.setRegistryWritersResolver(async (registry) => {
      // Enumerating a registry wants everything in it, including what no key
      // lookup would ever ask for, so every plugin that writes to the registry
      // loads here. The server only knows the contributions of its own runtime;
      // a plugin that writes only from its client entry is not named and stays
      // unloaded until something requests one of its keys.
      const writers = await attribution.writersForRegistry(domain, registry.id);
      await Promise.all(writers.map((pluginId) => loader.getPlugin(pluginId).catch(() => undefined)));
    });
  }
}

/** Loads catalog plugins one at a time until the request is satisfied. */
async function loadUntil(loader: ClientPluginLoader, found: () => boolean): Promise<void> {
  if (found()) return;
  for (const descriptor of await loader.catalog()) {
    if (found()) return;
    // A broken plugin must not stop the sweep; the lookup's own error surfaces.
    await loader.getPlugin(descriptor.id).catch(() => undefined);
  }
}

/** The plugin id a qualified registry id (`plugin:registry-id`) names. */
function pluginNamespaceOf(registryId: string): string | undefined {
  const separator = registryId.indexOf(':');
  return separator > 0 ? registryId.slice(0, separator) : undefined;
}
