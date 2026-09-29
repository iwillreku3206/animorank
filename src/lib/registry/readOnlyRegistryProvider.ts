/* eslint-disable @typescript-eslint/no-explicit-any */
import { ServiceRegistry } from '.';
import type { RegistryProvider } from './registryProvider';
import { ReadOnlyRegistry } from './readOnlyRegistry';

/**
 * Read-only adapter over one registry provider: exposes the provider's registry
 * lookups wrapped as {@link ReadOnlyRegistry}. The provider's registration
 * surface (registerRegistry / registerServiceRegistry / registerRegistryLazy)
 * is not reachable through it.
 */
export class ReadOnlyRegistryProvider {
  private readonly provider: RegistryProvider;

  public constructor(provider: RegistryProvider) {
    this.provider = provider;
  }

  public getRegistry<R extends ServiceRegistry<any, any[], any>>(registry: new () => R): ReadOnlyRegistry<R> {
    return new ReadOnlyRegistry(this.provider.getRegistry(registry));
  }

  public async getRegistryById<R extends ServiceRegistry<any, any[], any>>(
    qualifiedId: string
  ): Promise<ReadOnlyRegistry<R>> {
    return new ReadOnlyRegistry(await this.provider.getRegistryById<R>(qualifiedId));
  }
}
