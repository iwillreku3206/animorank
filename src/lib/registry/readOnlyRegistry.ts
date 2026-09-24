/* eslint-disable @typescript-eslint/no-explicit-any */
import { ServiceRegistry, type ServiceArgsOf, type ServiceInstanceOf, type ServiceStaticOf } from '.';

/**
 * Read-only adapter over one registry: it privately holds the registry and
 * exposes only its read surface, so callers (plugins) cannot register.
 */
export class ReadOnlyRegistry<R extends ServiceRegistry<any, any[], any>> {
  private readonly registry: R;

  public constructor(registry: R) {
    this.registry = registry;
  }

  /** Keys visible in the wrapped registry, including other namespaces'. */
  public keys(): string[] {
    return this.registry.keys();
  }

  /** The wrapped registry's keys after loading every plugin that writes to it; see `ServiceRegistry.loadKeys`. */
  public loadKeys(): Promise<string[]> {
    return this.registry.loadKeys();
  }

  public getStatic(key: string): Promise<ServiceStaticOf<R>> {
    return this.registry.getStatic(key);
  }

  public getInstance(key: string, ...args: ServiceArgsOf<R>): Promise<ServiceInstanceOf<R>> {
    return this.registry.getInstance(key, ...args);
  }

  public getDefault(...args: ServiceArgsOf<R>): Promise<ServiceInstanceOf<R>> {
    return this.registry.getDefault(...args);
  }
}
