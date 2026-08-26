type Service<T, C extends unknown[], S> =
  | { classObject: (new (..._args: C) => T) & S; singleton: false }
  | { instance: T; singleton: true };

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
  protected _registry = new Map<string, Service<T, C, S>>();
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

  public keys(): string[] {
    return [...this._registry.keys()];
  }

  public getStatic(key: string): S {
    const service = this._registry.get(key);
    if (!service) {
      throw new Error(
        this.options.keyNotFoundMessage ? this.options.keyNotFoundMessage(key) : `Service ${key} not found`
      );
    }
    if (service.singleton) {
      // Instance registrations carry no class statics; expose the instance.
      return service.instance as unknown as S;
    }
    return service.classObject;
  }

  public getInstance(key: string, ...args: C): T {
    const service = this._registry.get(key);

    if (!service) {
      throw new Error(
        this.options.keyNotFoundMessage ? this.options.keyNotFoundMessage(key) : `Service ${key} not found`
      );
    }

    if (service.singleton) {
      return service.instance;
    }

    return new service.classObject(...args);
  }

  public getDefault(...args: C): T {
    return this.getInstance('default', ...args);
  }
}
