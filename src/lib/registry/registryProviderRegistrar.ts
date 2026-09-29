/* eslint-disable @typescript-eslint/no-explicit-any */
import { ServiceRegistry } from '.';
import type { AbstractConstructor, RegistryProvider } from './registryProvider';
import { Registrar } from './registrar';

/** Structural view of the protected registration surface of {@link RegistryProvider}. */
interface ProviderWriter {
  registerRegistry<T extends ServiceRegistry<any, any[], any>>(_registry: T, _namespace?: string): T;
  registerServiceRegistry<T, R extends ServiceRegistry<T, any[], any>>(
    _service: AbstractConstructor<T>,
    _registry: R,
    _namespace?: string
  ): R;
  registerRegistryLazy<T extends ServiceRegistry<any, any[], any>>(
    _namespace: string,
    _id: string,
    _loader: () => Promise<T>
  ): void;
}

/**
 * Namespaced write access to one registry provider: registers registries into
 * it under `id` (the plugin id) as `${id}:${registryId}`, and hands out
 * {@link Registrar}s for its existing registries.
 */
export class RegistryProviderRegistrar {
  private readonly provider: RegistryProvider;
  private readonly writer: ProviderWriter;

  /** The namespace (plugin id) every registry id is qualified with. */
  public readonly id: string;

  public constructor(provider: RegistryProvider, id: string) {
    this.provider = provider;
    this.writer = provider as unknown as ProviderWriter;
    this.id = id;
  }

  /**
   * Registrar for a registry already registered with the provider.
   *
   * @param namespace overrides the plugin id a registrar stamps on every key.
   *   An empty namespace registers keys verbatim, which definitions the app
   *   looks up by plain name need — a data type is read by its type id
   *   everywhere, so it cannot live in a plugin's namespace.
   */
  public getRegistrar<R extends ServiceRegistry<any, any[], any>>(
    registry: new () => R,
    namespace: string = this.id
  ): Registrar<R> {
    return new Registrar(this.provider.getRegistry(registry), namespace, this.id);
  }

  /**
   * Registrar for a registry named by id — its qualified id (`animorank:test_case`)
   * or, when unambiguous, its own id (`test_case`).
   *
   * This is the way in for a plugin that cannot import the registry's class: a
   * dynamically loaded plugin runs from a URL with no directory of its own to
   * resolve against, so the app's classes are not names it can write down. The
   * app can still name its registries for it, and an id is all it needs.
   * Resolving a lazily registered registry loads it first.
   *
   * @param namespace overrides the plugin id a registrar stamps on every key;
   *   see {@link getRegistrar}.
   */
  public async getRegistrarById<R extends ServiceRegistry<any, any[], any>>(
    id: string,
    namespace: string = this.id
  ): Promise<Registrar<R>> {
    return new Registrar<R>(await this.provider.getRegistryById<R>(id), namespace, this.id);
  }

  /** Register a registry under `${id}:${registry.id}`; also keyed by its class. */
  public registerRegistry<R extends ServiceRegistry<any, any[], any>>(registry: R): R {
    return this.writer.registerRegistry(registry, this.id);
  }

  /** Register a service registry under `${id}:${registry.id}`; also keyed by the service class. */
  public registerServiceRegistry<T, R extends ServiceRegistry<T, any[], any>>(
    service: AbstractConstructor<T>,
    registry: R
  ): R {
    return this.writer.registerServiceRegistry(service, registry, this.id);
  }

  /** Lazily register a registry under `${id}:${id}`; the loader runs on first lookup. */
  public registerRegistryLazy<R extends ServiceRegistry<any, any[], any>>(id: string, loader: () => Promise<R>): void {
    this.writer.registerRegistryLazy(this.id, id, loader);
  }
}
