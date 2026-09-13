/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ServiceRegistry } from '.';

export type AbstractConstructor<T = any> = abstract new (..._args: any[]) => T;

export class RegistryProvider {
  protected _registries = new Map<AbstractConstructor<any>, ServiceRegistry<any, any[], any>>();
  private _registryIds = new Map<string, ServiceRegistry<any, any[], any>>();
  private _lazyRegistries = new Map<string, () => Promise<ServiceRegistry<any, any[], any>>>();
  private _inflightRegistries = new Map<string, Promise<ServiceRegistry<any, any[], any>>>();
  /** The namespace (plugin id) each registry was registered under; see {@link registeredBy}. */
  private _registryOrigins = new Map<string, string>();
  /** Loads whatever provides a registry that is registered nowhere yet; see {@link setRegistryResolver}. */
  private _registryResolver: ((_registryId: string) => Promise<void>) | null = null;
  /** Miss resolver installed on every registry of this provider; see {@link setRegistryMissResolver}. */
  private _registryMissResolver: ((_registry: ServiceRegistry<any, any[], any>, _key: string) => Promise<void>) | null =
    null;
  /** Writers resolver installed on every registry of this provider; see {@link setRegistryWritersResolver}. */
  private _registryWritersResolver: ((_registry: ServiceRegistry<any, any[], any>) => Promise<void>) | null = null;

  public async getService<T, C extends any[]>(service: AbstractConstructor<T>, ...args: C): Promise<T> {
    const serviceRegistry = this._registries.get(service);
    if (!serviceRegistry) throw new Error(`ServiceRegistry not found for ${service.name}`);

    const serviceInstance = await serviceRegistry.getDefault(...args);

    return serviceInstance;
  }

  /**
   * Look up a registry by its class. Retains its original semantics: synchronous,
   * and throws when the registry was not registered under that class.
   */
  public getRegistry<T extends ServiceRegistry<any, any[], any>>(registry: new () => T): T {
    const serviceRegistry = this._registries.get(registry);
    if (!serviceRegistry) throw new Error(`ServiceRegistry not found for ${registry.name}`);

    return serviceRegistry as T;
  }

  /**
   * Look up a registry by its fully-qualified key of the form `namespace:id`
   * (e.g. `animorank:test_case`). Resolves eagerly registered registries and
   * lazily registered ones (loading at most once; concurrent lookups share a
   * single load). When the id is registered nowhere, the registry resolver
   * (see {@link setRegistryResolver}) gets a chance to load a provider — a
   * plugin — before the lookup is retried once. Throws when the key stays unknown.
   */
  public async getRegistryById<T extends ServiceRegistry<any, any[], any>>(qualifiedId: string): Promise<T> {
    const registry = await this._lookupRegistry(qualifiedId);
    if (registry) {
      return registry as T;
    }

    if (this._registryResolver) {
      await this._registryResolver(qualifiedId);
      const loaded = await this._lookupRegistry(qualifiedId);
      if (loaded) {
        return loaded as T;
      }
    }
    throw new Error(`Registry with id '${qualifiedId}' not found`);
  }

  /** The registry registered under an id, waiting for a lazy registration to load. */
  private async _lookupRegistry(qualifiedId: string): Promise<ServiceRegistry<any, any[], any> | undefined> {
    const eager = this._registryIds.get(qualifiedId);
    if (eager) {
      return eager;
    }

    const lazy = this._lazyRegistries.get(qualifiedId);
    if (!lazy) {
      return undefined;
    }

    const inflight = this._inflightRegistries.get(qualifiedId);
    if (inflight) {
      return inflight;
    }

    const loading = lazy()
      .then((registry) => {
        this._registryIds.set(qualifiedId, registry);
        this._lazyRegistries.delete(qualifiedId);
        this._inflightRegistries.delete(qualifiedId);
        const origin = this._registryOrigins.get(qualifiedId);
        if (origin) {
          this._prepareRegistry(registry, origin);
        }
        return registry;
      })
      .catch((error) => {
        this._inflightRegistries.delete(qualifiedId);
        throw error;
      });
    this._inflightRegistries.set(qualifiedId, loading);
    return loading;
  }

  /**
   * The namespace (plugin id) a registry was registered under, looked up by
   * its qualified id or, when unambiguous, by the registry's own id.
   */
  public registeredBy(id: string): string | undefined {
    const qualifiedId = this._qualifiedIdOf(id);
    return qualifiedId ? this._registryOrigins.get(qualifiedId) : undefined;
  }

  /**
   * The registry registered under an id — the qualified id or, when
   * unambiguous, the registry's own id. A registration that is lazily loaded
   * and not resolved yet is not returned.
   */
  public findRegistry(id: string): ServiceRegistry<any, any[], any> | undefined {
    const qualifiedId = this._qualifiedIdOf(id);
    return qualifiedId ? this._registryIds.get(qualifiedId) : undefined;
  }

  /** The provider key an id names: the qualified id itself, or a unique registry's own id. */
  private _qualifiedIdOf(id: string): string | undefined {
    if (this._registryIds.has(id) || this._lazyRegistries.has(id)) {
      return id;
    }
    const matches = [...this._registryIds].filter(([, registry]) => registry.id === id);
    return matches.length === 1 ? matches[0][0] : undefined;
  }

  /**
   * Resolver called with an id `getRegistryById` cannot resolve; it should load
   * whatever provides that registry (e.g. a plugin), after which the lookup is
   * retried once. Set by the client, where plugins load on first use.
   */
  public setRegistryResolver(resolver: (registryId: string) => Promise<void>): void {
    this._registryResolver = resolver;
  }

  /** Installs a miss resolver on every registry of this provider, present and future. */
  public setRegistryMissResolver(
    resolver: (registry: ServiceRegistry<any, any[], any>, key: string) => Promise<void>
  ): void {
    this._registryMissResolver = resolver;
    for (const registry of this._registryIds.values()) {
      registry.setMissResolver(resolver);
    }
  }

  /**
   * Installs a writers resolver on every registry of this provider, present and
   * future: it loads the plugins that write to a registry when its full key
   * set is requested (see `ServiceRegistry.loadKeys`).
   */
  public setRegistryWritersResolver(resolver: (registry: ServiceRegistry<any, any[], any>) => Promise<void>): void {
    this._registryWritersResolver = resolver;
    for (const registry of this._registryIds.values()) {
      registry.setWritersResolver(resolver);
    }
  }

  /**
   * The lazy-loading hooks every registry of this provider carries: the
   * namespace it was registered under and the resolvers installed on the
   * provider. Registries added after the resolvers were set get them here.
   */
  private _prepareRegistry(registry: ServiceRegistry<any, any[], any>, origin: string): void {
    registry.setDefaultOrigin(origin);
    if (this._registryMissResolver) {
      registry.setMissResolver(this._registryMissResolver);
    }
    if (this._registryWritersResolver) {
      registry.setWritersResolver(this._registryWritersResolver);
    }
  }

  /** Register a service instance; `getService` resolves it forever after. */
  public registerSingleton<T>(service: AbstractConstructor<T>, instance: T) {
    this._registries.set(service, ServiceRegistry.createSingleSingletonServiceRegistry(instance));
  }

  /**
   * Register a registry instance under `namespace:${registry.id}` (via
   * `getRegistryById`) and its class (via `getRegistry`). Registries
   * self-register their built-in entries in their constructors; they never
   * choose their own namespace — the registering provider supplies it.
   */
  protected registerRegistry<T extends ServiceRegistry<any, any[], any>>(
    registry: T,
    namespace: string = 'animorank'
  ): T {
    if (!registry.id) {
      throw new Error(`Registry instance of ${registry.constructor.name} must declare an id`);
    }
    const qualifiedId = `${namespace}:${registry.id}`;
    if (this._registryIds.has(qualifiedId)) {
      throw new Error(`Registry with id '${qualifiedId}' already exists`);
    }
    this._registryIds.set(qualifiedId, registry);
    this._registryOrigins.set(qualifiedId, namespace);
    // Keys registered without a namespace of their own belong to the registry's:
    // the app registers its own registries under 'animorank', plugins under theirs.
    this._prepareRegistry(registry, namespace);
    this._registries.set(registry.constructor as new () => ServiceRegistry<any, any[], any>, registry);
    return registry;
  }

  /**
   * Register a registry instance that serves a service: keyed by the service
   * class (so `getService` resolves it) and by `namespace:${registry.id}`.
   */
  protected registerServiceRegistry<T, R extends ServiceRegistry<T, any[], any>>(
    service: AbstractConstructor<T>,
    registry: R,
    namespace: string = 'animorank'
  ): R {
    const instance = this.registerRegistry(registry, namespace);
    this._registries.set(service, instance);
    return instance;
  }

  /**
   * Lazily register a registry under `namespace:id`: the loader runs on first
   * `getRegistryById` and the result is memoized. A failed load can be
   * retried by a later call.
   */
  protected registerRegistryLazy<T extends ServiceRegistry<any, any[], any>>(
    namespace: string,
    id: string,
    loader: () => Promise<T>
  ): void {
    const qualifiedId = `${namespace}:${id}`;
    if (this._registryIds.has(qualifiedId) || this._lazyRegistries.has(qualifiedId)) {
      throw new Error(`Registry with id '${qualifiedId}' already exists`);
    }
    this._lazyRegistries.set(qualifiedId, loader);
    this._registryOrigins.set(qualifiedId, namespace);
  }
}
