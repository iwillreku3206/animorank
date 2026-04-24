import { TelemetryRegistry } from '$lib/telemetry/telemetryRegistry';
import { TelemetryService } from '$lib/telemetry/telemetryService';
import type { ServiceRegistry } from './registry';

type AbstractConstructor<T = any> = abstract new (...args: any[]) => T;

export class ClientServiceProvider {
  private static _instance: ClientServiceProvider | null;
  private _registries = new Map<AbstractConstructor<any>, ServiceRegistry<any, any[]>>();

  private constructor() {
    // Import any service registries here
    this._registries.set(TelemetryService, new TelemetryRegistry());
  }

  public static instance(): ClientServiceProvider {
    if (!ClientServiceProvider._instance) {
      ClientServiceProvider._instance = new ClientServiceProvider();
    }
    return ClientServiceProvider._instance;
  }

  public getService<T, C extends any[]>(service: AbstractConstructor<T>, ...args: C): T {
    const serviceRegistry = this._registries.get(service);
    if (!serviceRegistry) throw new Error(`ServiceRegistry not found for ${service.name}`);

    const serviceInstance = serviceRegistry.getDefault(...args);

    return serviceInstance;
  }
}
