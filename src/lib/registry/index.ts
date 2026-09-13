/* eslint-disable @typescript-eslint/no-explicit-any */
type Service<T, C extends unknown[], S> =
  | { classObject: (new (..._args: C) => T) & S; singleton: false }
  | { instance: T; singleton: true }
  | { loader: () => Promise<Service<T, C, S>>; singleton: 'lazy' };

export interface ServiceRegistryOptions {
  keyNotFoundMessage?: (_serviceName: string) => string;
}

export type ServiceOf<SR extends ServiceRegistry<any, any, any>> =
  SR extends ServiceRegistry<infer T, infer C, infer S> ? Service<T, C, S> : never;

export type ClassServiceOf<SR extends ServiceRegistry<any, any, any>> = Extract<
  ServiceOf<SR>,
  { singleton: false }
>['classObject'];

export type ServiceInstanceOf<SR extends ServiceRegistry<any, any[], any>> =
  SR extends ServiceRegistry<infer T, any, any> ? T : never;

export type ServiceArgsOf<SR extends ServiceRegistry<any, any[], any>> =
  SR extends ServiceRegistry<any, infer C, any> ? C : never;

export type ServiceStaticOf<SR extends ServiceRegistry<any, any[], any>> =
  SR extends ServiceRegistry<any, any, infer S> ? S : never;

export type ServiceClassOf<SR extends ServiceRegistry<any, any[], any>> = (new (
  ..._args: ServiceArgsOf<SR>
) => ServiceInstanceOf<SR>) &
  ServiceStaticOf<SR>;

export abstract class ServiceRegistry<T, C extends unknown[], S = object> {
  /**
   * Stable registry identifier within its namespace (e.g. `test_case` for the
   * `animorank:test_case` key). Concrete registries must override it. The
   * namespace itself is supplied when the registry is registered with a
   * provider — registries do not choose their own namespace.
   */
  public id: string = '';

  protected _registry = new Map<string, Service<T, C, S>>();
  private _inflight = new Map<string, Promise<Service<T, C, S>>>();
  private options: ServiceRegistryOptions;
  /** The namespace (plugin id) each key was registered under; see {@link registeredBy}. */
  private _origins = new Map<string, string>();
  /** Namespace applied to keys registered without an explicit origin: the registry's own. */
  private _defaultOrigin: string | null = null;
  /** Loads whatever provides a key that is not registered yet; see {@link setMissResolver}. */
  private _missResolver: ((_registry: ServiceRegistry<any, any[], any>, _key: string) => Promise<void>) | null = null;
  /** Loads every plugin that writes to this registry; see {@link loadKeys}. */
  private _writersResolver: ((_registry: ServiceRegistry<any, any[], any>) => Promise<void>) | null = null;

  constructor(serviceRegistryOptions?: ServiceRegistryOptions) {
    this.options = serviceRegistryOptions || {};
  }

  private static _createSingleServiceRegistry<T, C extends unknown[], S>(
    service: Service<T, C, S>,
    serviceRegistryOptions?: ServiceRegistryOptions
  ): ServiceRegistry<T, C, S> {
    class SingleServiceRegistry extends ServiceRegistry<T, C, S> {
      public constructor() {
        super(serviceRegistryOptions);
        this._registry.set('default', service);
      }
    }
    return new SingleServiceRegistry();
  }

  public static createSingleServiceRegistry<T, C extends unknown[], S = object>(
    service: (new (..._args: C) => T) & S, // FIXED: Using 'C' instead of 'any[]'
    serviceRegistryOptions?: ServiceRegistryOptions
  ) {
    return ServiceRegistry._createSingleServiceRegistry<T, C, S>(
      { classObject: service, singleton: false },
      serviceRegistryOptions
    );
  }

  public static createSingleSingletonServiceRegistry<T, C extends unknown[], S = object>(
    instance: T,
    serviceRegistryOptions?: ServiceRegistryOptions
  ) {
    return ServiceRegistry._createSingleServiceRegistry<T, C, S>({ instance, singleton: true }, serviceRegistryOptions);
  }

  private _register(key: string, service: Service<T, C, S>, origin?: string) {
    if (this._registry.has(key)) {
      throw new Error(`Service with key '${key}' already exists.`);
    }
    this._registry.set(key, service);
    if (origin) this._origins.set(key, origin);
  }

  protected register(key: string, value: (new (..._args: C) => T) & S, origin?: string) {
    this._register(key, { classObject: value, singleton: false }, origin);
  }

  protected registerSingleton(key: string, instance: T, origin?: string) {
    this._register(key, { instance, singleton: true }, origin);
  }

  /** Lazily load a service class on first access; behaves like `register` once resolved. */
  protected registerLazy(key: string, loader: () => Promise<(new (..._args: C) => T) & S>, origin?: string) {
    this._register(
      key,
      {
        loader: async () => ({ classObject: await loader(), singleton: false }),
        singleton: 'lazy'
      },
      origin
    );
  }

  /** Lazily load a service instance on first access; behaves like `registerSingleton` once resolved. */
  protected registerSingletonLazy(key: string, loader: () => Promise<T>, origin?: string) {
    this._register(
      key,
      {
        loader: async () => ({ instance: await loader(), singleton: true }),
        singleton: 'lazy'
      },
      origin
    );
  }

  private async _resolveLazy(key: string): Promise<Exclude<Service<T, C, S>, { singleton: 'lazy' }> | undefined> {
    const service = this._registry.get(key);
    if (!service || service.singleton !== 'lazy') {
      return service as Exclude<Service<T, C, S>, { singleton: 'lazy' }> | undefined;
    }

    const inflight = this._inflight.get(key);
    if (inflight) {
      return inflight as Promise<Exclude<Service<T, C, S>, { singleton: 'lazy' }>>;
    }

    const loading = service
      .loader()
      .then((loaded) => {
        this._registry.set(key, loaded);
        this._inflight.delete(key);
        return loaded;
      })
      .catch((error) => {
        this._inflight.delete(key);
        throw error;
      });
    this._inflight.set(key, loading);
    return loading as Promise<Exclude<Service<T, C, S>, { singleton: 'lazy' }>>;
  }

  /**
   * The service registered under a key. When there is none, the miss resolver
   * (see {@link setMissResolver}) gets a chance to load a provider — a plugin —
   * before the lookup is retried once.
   */
  private async _resolve(key: string): Promise<Exclude<Service<T, C, S>, { singleton: 'lazy' }> | undefined> {
    const service = await this._resolveLazy(key);
    if (service !== undefined || !this._missResolver) {
      return service;
    }
    await this._missResolver(this, key);
    return this._resolveLazy(key);
  }

  public keys(): string[] {
    return [...this._registry.keys()];
  }

  /**
   * The keys of this registry after loading every plugin that writes to it
   * (see {@link setWritersResolver}). Asking for "everything in the registry"
   * is the one request a single-key lookup cannot express, so it gets its own
   * async entry point: {@link keys} cannot wait for a plugin.
   */
  public async loadKeys(): Promise<string[]> {
    await this._writersResolver?.(this);
    return this.keys();
  }

  /**
   * The namespaces (plugin ids) that have written into this registry. The
   * app's own registrations are attributed to `animorank`; a plugin that
   * registers without a namespace is still attributed to the plugin.
   */
  public writers(): string[] {
    const writers = new Set(this._origins.values());
    if (this._defaultOrigin) {
      writers.add(this._defaultOrigin);
    }
    return [...writers];
  }

  /**
   * The namespace (plugin id) that registered `key`, or `undefined` when the
   * key is not registered at all. A key registered without a namespace of its
   * own belongs to the namespace its registry was registered under.
   */
  public registeredBy(key: string): string | undefined {
    if (!this._registry.has(key)) {
      return undefined;
    }
    return this._origins.get(key) ?? this._defaultOrigin ?? undefined;
  }

  /** Namespace applied to keys registered without one; set by the provider holding the registry. */
  public setDefaultOrigin(origin: string): void {
    this._defaultOrigin = origin;
  }

  /**
   * Resolver called with a key that is not registered (e.g. one a plugin
   * provides); after it resolves, the lookup is retried once. Set by a
   * provider that can load plugins on demand.
   */
  public setMissResolver(resolver: (_registry: ServiceRegistry<T, C, S>, _key: string) => Promise<void>): void {
    this._missResolver = resolver;
  }

  /**
   * Resolver called by {@link loadKeys}: it should load every plugin that can
   * write into this registry, so an enumeration sees all of them. Set by a
   * provider that can load plugins on demand.
   */
  public setWritersResolver(resolver: (_registry: ServiceRegistry<T, C, S>) => Promise<void>): void {
    this._writersResolver = resolver;
  }

  public async getStatic(key: string): Promise<S> {
    const service = await this._resolve(key);
    if (!service) {
      throw new Error(
        this.options.keyNotFoundMessage ? this.options.keyNotFoundMessage(key) : `Service ${key} not found`
      );
    }
    if (service.singleton === true) {
      // Instance registrations carry no class statics; expose the instance.
      return service.instance as unknown as S;
    }
    return service.classObject;
  }

  public async getInstance(key: string, ...args: C): Promise<T> {
    const service = await this._resolve(key);

    if (!service) {
      throw new Error(
        this.options.keyNotFoundMessage ? this.options.keyNotFoundMessage(key) : `Service ${key} not found`
      );
    }

    if (service.singleton === true) {
      return service.instance;
    }

    return new service.classObject(...args);
  }

  public async getDefault(...args: C): Promise<T> {
    return this.getInstance('default', ...args);
  }
}
