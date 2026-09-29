/* eslint-disable @typescript-eslint/no-explicit-any */
import { ServiceRegistry, type ServiceClassOf, type ServiceInstanceOf } from '.';

/**
 * Structural view of the protected registration surface of {@link ServiceRegistry}.
 * TypeScript has no friend classes: the registrar re-declares what it needs and
 * reaches it through the single cast in its constructor.
 */
interface RegistryWriter<T, C extends unknown[], S> {
  register(_key: string, _value: (new (..._args: C) => T) & S, _origin?: string): void;
  registerSingleton(_key: string, _instance: T, _origin?: string): void;
  registerLazy(_key: string, _loader: () => Promise<(new (..._args: C) => T) & S>, _origin?: string): void;
  registerSingletonLazy(_key: string, _loader: () => Promise<T>, _origin?: string): void;
}

/**
 * Namespaced write access to one registry — the public way to register into a
 * registry. Every key is qualified with `id` (the namespace) as `${id}:${key}`,
 * so registrations of different plugins can never collide. Registrations are
 * also attributed to `pluginId` (see {@link ServiceRegistry.registeredBy}),
 * which is the plugin even when the key is registered without a namespace.
 */
export class Registrar<R extends ServiceRegistry<any, any[], any>> {
  private readonly writer: RegistryWriter<any, any[], any>;

  /**
   * The namespace every key is qualified with. An empty namespace registers
   * keys verbatim, for definitions the app looks up by plain name (data types
   * are read by their type id everywhere).
   */
  public readonly id: string;

  /** The plugin the registrations belong to, as reported by `registeredBy`. */
  public readonly pluginId: string;

  /**
   * @param registeredBy the plugin the registrations belong to; defaults to
   *   `id`, which is the plugin's own namespace in the common case.
   */
  public constructor(registry: R, id: string, registeredBy: string = id) {
    this.writer = registry as unknown as RegistryWriter<any, any[], any>;
    this.id = id;
    this.pluginId = registeredBy;
  }

  /** Register a service class under `${id}:${key}`. */
  public register(key: string, value: ServiceClassOf<R>): void {
    this.writer.register(this.qualify(key), value, this.pluginId);
  }

  /** Register a singleton instance under `${id}:${key}`. */
  public registerSingleton(key: string, instance: ServiceInstanceOf<R>): void {
    this.writer.registerSingleton(this.qualify(key), instance, this.pluginId);
  }

  /** Lazily load a service class under `${id}:${key}` on first access. */
  public registerLazy(key: string, loader: () => Promise<ServiceClassOf<R>>): void {
    this.writer.registerLazy(this.qualify(key), loader, this.pluginId);
  }

  /** Lazily load a singleton instance under `${id}:${key}` on first access. */
  public registerSingletonLazy(key: string, loader: () => Promise<ServiceInstanceOf<R>>): void {
    this.writer.registerSingletonLazy(this.qualify(key), loader, this.pluginId);
  }

  private qualify(key: string): string {
    return this.id ? `${this.id}:${key}` : key;
  }
}
