import { Logger } from "$lib/logging/logger";
import { LoggerRegistry } from "./loggerRegistry";
import type { ServiceRegistry } from "./registry";

type AbstractConstructor<T = any> = abstract new (...args: any[]) => T;

export class ServiceProvider {
  private static _instance: ServiceProvider | null
  private _registries = new Map<AbstractConstructor<any>, ServiceRegistry<any, any[]>>();

  private constructor() {
    this._registries.set(Logger, new LoggerRegistry())
  }

  public static instance(): ServiceProvider {
    if (!ServiceProvider._instance) {
      ServiceProvider._instance = new ServiceProvider()
    }
    return ServiceProvider._instance
  }

  public getService<T, C extends any[]>(service: AbstractConstructor<T>, ...args: C): T {
    const serviceRegistry = this._registries.get(service);
    if (!serviceRegistry) throw new Error(`ServiceRegistry not found for ${service.name}`);

    const serviceInstance = serviceRegistry.getDefault(...args);

    return serviceInstance;
  }
}
