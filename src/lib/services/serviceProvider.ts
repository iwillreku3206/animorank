import type { ISingleton, ServiceRegistry } from './registry';

type AbstractConstructor<T = any> = (abstract new (...args: any[]) => T) | ISingleton<T>;

export class ServiceProvider {
  protected _registries = new Map<AbstractConstructor<any>, ServiceRegistry<any, any[]>>();

  public getService<T, C extends any[]>(service: AbstractConstructor<T>, ...args: C): T {
    const serviceRegistry = this._registries.get(service);
    if (!serviceRegistry) throw new Error(`ServiceRegistry not found for ${service.name}`);

    const serviceInstance = serviceRegistry.getDefault(...args);

    return serviceInstance;
  }
}
