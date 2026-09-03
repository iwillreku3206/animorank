type Service<T, C extends unknown[], S> =
  | { classObject: (new (..._args: C) => T) & S; singleton: false }
  | { instance: T; singleton: true }
  | { loader: () => Promise<Service<T, C, S>>; singleton: 'lazy' };

export interface ServiceRegistryOptions {
  keyNotFoundMessage?: (_serviceName: string) => string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ServiceOf<SR extends ServiceRegistry<any, any, any>> =
  SR extends ServiceRegistry<infer T, infer C, infer S> ? Service<T, C, S> : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ClassServiceOf<SR extends ServiceRegistry<any, any, any>> = Extract<
  ServiceOf<SR>,
  { singleton: false }
>['classObject'];

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

  private _register(key: string, service: Service<T, C, S>) {
    if (this._registry.has(key)) {
      throw new Error(`Service with key '${key}' already exists.`);
    }
    this._registry.set(key, service);
  }

  public register(key: string, value: (new (..._args: C) => T) & S) {
    this._register(key, { classObject: value, singleton: false });
  }

  public registerSingleton(key: string, instance: T) {
    this._register(key, { instance, singleton: true });
  }

  /** Lazily load a service class on first access; behaves like `register` once resolved. */
  public registerLazy(key: string, loader: () => Promise<(new (..._args: C) => T) & S>) {
    this._register(key, {
      loader: async () => ({ classObject: await loader(), singleton: false }),
      singleton: 'lazy'
    });
  }

  /** Lazily load a service instance on first access; behaves like `registerSingleton` once resolved. */
  public registerSingletonLazy(key: string, loader: () => Promise<T>) {
    this._register(key, {
      loader: async () => ({ instance: await loader(), singleton: true }),
      singleton: 'lazy'
    });
  }

  private _resolveLazy(key: string): Promise<Exclude<Service<T, C, S>, { singleton: 'lazy' }>> {
    const service = this._registry.get(key);
    if (!service || service.singleton !== 'lazy') {
      return Promise.resolve(service! as Exclude<Service<T, C, S>, { singleton: 'lazy' }>);
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

  public keys(): string[] {
    return [...this._registry.keys()];
  }

  public async getStatic(key: string): Promise<S> {
    const service = await this._resolveLazy(key);
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
    const service = await this._resolveLazy(key);

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
