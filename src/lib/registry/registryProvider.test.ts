/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from 'vitest';
import { ServiceRegistry } from '.';
import { RegistryProvider } from './registryProvider';

// The finder would fail the test if a lookup ever asked it to load a plugin:
// only a browser loads plugins, so a miss on the server is final (see
// clientPlugins.ts).
vi.mock('$lib/plugin/clientPluginFinder', () => ({
  ClientPluginFinder: {
    instance: () => {
      throw new Error('the server must not load plugins');
    }
  }
}));

class TestService {}
class TestRegistry extends ServiceRegistry<TestService, [], typeof TestService> {
  public id = 'test';
  public constructor() {
    super();
    this.register('test', TestService);
  }
}

class OtherService {}
class OtherRegistry extends ServiceRegistry<OtherService, [], object> {
  public id = 'other';
  public constructor() {
    super();
    this.register('default', OtherService);
  }
}

class NoIdRegistry extends ServiceRegistry<TestService, [], object> {}

class ExposedProvider extends RegistryProvider {
  public constructor() {
    super('global');
  }
  public add(registry: ServiceRegistry<any, any[], any>, namespace: string = 'animorank'): void {
    this.registerRegistry(registry, namespace);
  }
  public addLazy(namespace: string, id: string, loader: () => Promise<ServiceRegistry<any, any[]>>): void {
    this.registerRegistryLazy(namespace, id, loader);
  }
  public addServiceRegistry<T, R extends ServiceRegistry<T, any[], any>>(
    service: new () => T,
    registry: R,
    namespace: string = 'animorank'
  ): R {
    return this.registerServiceRegistry(service, registry, namespace);
  }
}

describe('RegistryProvider registry ids', () => {
  it('getRegistryById resolves an eagerly registered registry by its id', async () => {
    const provider = new ExposedProvider();
    provider.add(new TestRegistry());
    const registry = await provider.getRegistryById<TestRegistry>('animorank:test');
    expect(registry).toBeInstanceOf(TestRegistry);
    expect((await registry.getStatic('test')).name).toBe('TestService');
  });

  it('keeps the class-keyed getRegistry working for eagerly registered registries', () => {
    const provider = new ExposedProvider();
    provider.add(new TestRegistry());
    expect(provider.getRegistry(TestRegistry)).toBeInstanceOf(TestRegistry);
    expect(() => provider.getRegistry(OtherRegistry)).toThrow(/not found/);
  });

  it('registers a service registry under both the service class and its id', async () => {
    const provider = new ExposedProvider();
    provider.addServiceRegistry(OtherService, new OtherRegistry());
    await expect(provider.getService(OtherService)).resolves.toBeInstanceOf(OtherService);
    await expect(provider.getRegistryById<OtherRegistry>('animorank:other')).resolves.toBeInstanceOf(OtherRegistry);
  });

  it('getRegistryById loads a lazy registry once and memoizes it', async () => {
    const provider = new ExposedProvider();
    let loads = 0;
    provider.addLazy('animorank', 'lazy', async () => {
      loads += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return new TestRegistry();
    });
    const [first, second] = await Promise.all([
      provider.getRegistryById<TestRegistry>('animorank:lazy'),
      provider.getRegistryById<TestRegistry>('animorank:lazy')
    ]);
    expect(first).toBeInstanceOf(TestRegistry);
    expect(second).toBe(first);
    expect(loads).toBe(1);
  });

  it('propagates a lazy loader rejection and retries successfully afterwards', async () => {
    const provider = new ExposedProvider();
    let shouldFail = true;
    provider.addLazy('animorank', 'retry', async () => {
      if (shouldFail) throw new Error('loader failed');
      return new TestRegistry();
    });
    await expect(provider.getRegistryById('animorank:retry')).rejects.toThrow('loader failed');
    shouldFail = false;
    await expect(provider.getRegistryById<TestRegistry>('animorank:retry')).resolves.toBeInstanceOf(TestRegistry);
  });

  it('does not load plugins for an id it does not have: a server miss is final', async () => {
    const provider = new ExposedProvider();

    await expect(provider.getRegistryById('animorank:missing')).rejects.toThrow(
      "Registry with id 'animorank:missing' not found"
    );
  });

  it('registers under the namespace supplied at registration', async () => {
    const provider = new ExposedProvider();
    const registry = new TestRegistry();
    provider.add(registry, 'other');
    await expect(provider.getRegistryById<TestRegistry>('other:test')).resolves.toBe(registry);
    await expect(provider.getRegistryById('animorank:test')).rejects.toThrow(/not found/);
    expect(provider.getRegistry(TestRegistry)).toBe(registry);
  });

  it('rejects registries without an id and duplicate ids', () => {
    const provider = new ExposedProvider();
    expect(() => provider.add(new NoIdRegistry())).toThrow(/must declare an id/);
    provider.add(new TestRegistry());
    expect(() => provider.add(new TestRegistry())).toThrow(/already exists/);
    expect(() => provider.addLazy('animorank', 'test', async () => new TestRegistry())).toThrow(/already exists/);
    provider.addLazy('animorank', 'lazy2', async () => new TestRegistry());
    expect(() => provider.addLazy('animorank', 'lazy2', async () => new TestRegistry())).toThrow(/already exists/);
  });
});

describe('RegistryProvider registration tracking', () => {
  it('reports the namespace each registry was registered under', () => {
    const provider = new ExposedProvider();
    provider.add(new TestRegistry());
    provider.add(new OtherRegistry(), 'plugin-a');
    provider.addLazy('plugin-b', 'later', async () => new TestRegistry());

    expect(provider.registeredBy('animorank:test')).toBe('animorank');
    expect(provider.registeredBy('plugin-a:other')).toBe('plugin-a');
    // The registry's own id names it when it matches exactly one registry.
    expect(provider.registeredBy('other')).toBe('plugin-a');
    // A lazily registered registry knows its registrant before it is loaded.
    expect(provider.registeredBy('plugin-b:later')).toBe('plugin-b');
    expect(provider.registeredBy('missing')).toBeUndefined();
  });

  it('attributes keys registered without a namespace to the registry namespace', async () => {
    const provider = new ExposedProvider();
    const registry = new TestRegistry();
    provider.add(registry, 'plugin-a');

    expect(registry.registeredBy('test')).toBe('plugin-a');
    expect(provider.findRegistry('plugin-a:test')).toBe(registry);
    expect(provider.findRegistry('test')).toBe(registry);
  });
});
