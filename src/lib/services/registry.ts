export interface ISingleton<T> {
  instance(): T;
}

type Service<T, C extends any[]> = { classObject: new (...args: C) => T, singleton: false }
  | { classObject: ISingleton<T>, singleton: true }


export abstract class ServiceRegistry<T, C extends any[]> {
  protected _registry = new Map<string, Service<T, C>>();

  private _register(key: string, service: Service<T, C>) {
    if (this._registry.has(key)) throw new Error(`Service with key '${key}' already exists.`);
    this._registry.set(key, service);
  }

  public register(key: string, value: new (...args: any[]) => T) {
    this._register(key, { classObject: value, singleton: false })
  }

  public registerSingleton(key: string, value: ISingleton<T>) {
    this._register(key, { classObject: value, singleton: true })
  }

  public abstract getInstance(key: string, ...args: C): T;
  public abstract getDefault(...args: C): T;
}
