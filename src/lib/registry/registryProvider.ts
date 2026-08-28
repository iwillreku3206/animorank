/* eslint-disable @typescript-eslint/no-explicit-any */
import { ServiceRegistry } from '.';

type AbstractConstructor<T = any> = abstract new (..._args: any[]) => T;

export class RegistryProvider {
  protected _registries = new Map<AbstractConstructor<any>, ServiceRegistry<any, any[]>>();

  public async getService<T, C extends any[]>(service: AbstractConstructor<T>, ...args: C): Promise<T> {
    const serviceRegistry = this._registries.get(service);
    if (!serviceRegistry) throw new Error(`ServiceRegistry not found for ${service.name}`);

    const serviceInstance = await serviceRegistry.getDefault(...args);

    return serviceInstance;
  }

  public getRegistry<T extends ServiceRegistry<any, any[]>>(registry: new () => T): T {
    const serviceRegistry = this._registries.get(registry);
    if (!serviceRegistry) throw new Error(`ServiceRegistry not found for ${registry.name}`);

    return serviceRegistry as T;
  }

  /** Register a service instance; `getService` resolves it forever after. */
  public registerSingleton<T>(service: AbstractConstructor<T>, instance: T) {
    this._registries.set(service, ServiceRegistry.createSingleSingletonServiceRegistry(instance));
  }
}
