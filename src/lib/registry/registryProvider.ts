/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ServiceRegistry } from '.';

type AbstractConstructor<T = any> = abstract new (..._args: any[]) => T;

export class RegistryProvider {
  protected _registries = new Map<AbstractConstructor<any>, ServiceRegistry<any, any[], any>>();
  private _registryIds = new Map<string, ServiceRegistry<any, any[], any>>();
  private _lazyRegistries = new Map<string, () => Promise<ServiceRegistry<any, any[], any>>>();
  private _inflightRegistries = new Map<string, Promise<ServiceRegistry<any, any[], any>>>();

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
   * single load). Throws when the key is unknown.
   */
  public async getRegistryById<T extends ServiceRegistry<any, any[], any>>(qualifiedId: string): Promise<T> {
    const eager = this._registryIds.get(qualifiedId);
    if (eager) {
      return eager as T;
    }

    const lazy = this._lazyRegistries.get(qualifiedId);
    if (!lazy) {
      throw new Error(`Registry with id '${qualifiedId}' not found`);
    }

    const inflight = this._inflightRegistries.get(qualifiedId);
    if (inflight) {
      return inflight as Promise<T>;
    }

    const loading = lazy()
      .then((registry) => {
        this._registryIds.set(qualifiedId, registry);
        this._lazyRegistries.delete(qualifiedId);
        this._inflightRegistries.delete(qualifiedId);
        return registry;
      })
      .catch((error) => {
        this._inflightRegistries.delete(qualifiedId);
        throw error;
      });
    this._inflightRegistries.set(qualifiedId, loading);
    return loading as Promise<T>;
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
  }
}
