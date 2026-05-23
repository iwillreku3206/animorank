export interface ISingleton<T> {
  name: string;
  instance(): T;
}

type Service<T, C extends unknown[], S> =
  | { classObject: (new (..._args: C) => T) & S; singleton: false }
  | { classObject: ISingleton<T> & S; singleton: true };

export interface ServiceRegistryOptions {
  keyNotFoundMessage?: (_serviceName: string) => string;
}

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
    service: ISingleton<T> & S,
    serviceRegistryOptions?: ServiceRegistryOptions
  ) {
    return ServiceRegistry._createSingleServiceRegistry<T, C, S>(
      { classObject: service, singleton: true },
      serviceRegistryOptions
    );
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

  public registerSingleton(key: string, value: ISingleton<T> & S) {
    this._register(key, { classObject: value, singleton: true });
  }

  public getStatic(key: string): S {
    const service = this._registry.get(key);
    if (!service) {
      throw new Error(
        this.options.keyNotFoundMessage
          ? this.options.keyNotFoundMessage(key)
          : `Service ${key} not found`
      );
    }
    return service.classObject as S;
  }

  public getInstance(key: string, ...args: C): T {
    const service = this._registry.get(key);

    if (!service) {
      throw new Error(
        this.options.keyNotFoundMessage
          ? this.options.keyNotFoundMessage(key)
          : `Service ${key} not found`
      );
    }

    if (service.singleton) {
      return service.classObject.instance();
    }

    return new service.classObject(...args);
  }

  public getDefault(...args: C): T {
    return this.getInstance('default', ...args);
  }
}
