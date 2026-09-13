import { describe, expect, it } from 'vitest';
import { RegistryProvider } from './registryProvider';
import { ReadOnlyRegistryProvider } from './readOnlyRegistryProvider';
import { RegistryProviderRegistrar } from './registryProviderRegistrar';
import { ServiceRegistry } from '.';

class ProbeService {
  public static displayName = 'ProbeService';
}

class ProbeRegistry extends ServiceRegistry<ProbeService, [], typeof ProbeService> {
  public id = 'probe';
  public constructor() {
    super();
    this.register('default', ProbeService);
  }
}

class LazyProbeRegistry extends ServiceRegistry<ProbeService, [], typeof ProbeService> {
  public id = 'lazy';
}

describe('RegistryProviderRegistrar', () => {
  it('registers a registry under the plugin namespace and by its class', async () => {
    const provider = new RegistryProvider();
    const registry = new ProbeRegistry();
    const registered = new RegistryProviderRegistrar(provider, 'plugin-a').registerRegistry(registry);

    expect(registered).toBe(registry);
    expect(await provider.getRegistryById<ProbeRegistry>('plugin-a:probe')).toBe(registry);
    expect(provider.getRegistry(ProbeRegistry)).toBe(registry);
  });

  it('registers a service registry that getService resolves', async () => {
    const provider = new RegistryProvider();
    const registry = new ProbeRegistry();
    new RegistryProviderRegistrar(provider, 'plugin-a').registerServiceRegistry(ProbeService, registry);

    await expect(provider.getService(ProbeService)).resolves.toBeInstanceOf(ProbeService);
    expect(await provider.getRegistryById<ProbeRegistry>('plugin-a:probe')).toBe(registry);
  });

  it('registers a lazy registry that loads once', async () => {
    const provider = new RegistryProvider();
    let loads = 0;
    new RegistryProviderRegistrar(provider, 'plugin-a').registerRegistryLazy('lazy', async () => {
      loads += 1;
      return new LazyProbeRegistry();
    });

    const [first, second] = await Promise.all([
      provider.getRegistryById<LazyProbeRegistry>('plugin-a:lazy'),
      provider.getRegistryById<LazyProbeRegistry>('plugin-a:lazy')
    ]);
    expect(first).toBeInstanceOf(LazyProbeRegistry);
    expect(second).toBe(first);
    expect(loads).toBe(1);
  });

  it('hands out namespaced registrars for registries the provider already holds', async () => {
    const provider = new RegistryProvider();
    const registry = new ProbeRegistry();
    new RegistryProviderRegistrar(provider, 'plugin-a').registerRegistry(registry);

    const registrar = new RegistryProviderRegistrar(provider, 'plugin-b').getRegistrar(ProbeRegistry);
    expect(registrar.id).toBe('plugin-b');
    registrar.registerSingleton('probe', new ProbeService());
    expect(registry.keys()).toEqual(['default', 'plugin-b:probe']);
  });

  it('keeps registries of different plugins apart', async () => {
    const provider = new RegistryProvider();
    new RegistryProviderRegistrar(provider, 'plugin-a').registerRegistry(new ProbeRegistry());
    new RegistryProviderRegistrar(provider, 'plugin-b').registerRegistry(new ProbeRegistry());

    expect(await provider.getRegistryById<ProbeRegistry>('plugin-a:probe')).toBeInstanceOf(ProbeRegistry);
    expect(await provider.getRegistryById<ProbeRegistry>('plugin-b:probe')).toBeInstanceOf(ProbeRegistry);
  });
});

describe('ReadOnlyRegistryProvider', () => {
  it('reads registries through read-only views', async () => {
    const provider = new RegistryProvider();
    const registry = new ProbeRegistry();
    new RegistryProviderRegistrar(provider, 'plugin-a').registerRegistry(registry);
    const readOnly = new ReadOnlyRegistryProvider(provider);

    expect(readOnly.getRegistry(ProbeRegistry).keys()).toEqual(registry.keys());
    expect((await readOnly.getRegistryById<ProbeRegistry>('plugin-a:probe')).keys()).toEqual(registry.keys());
    expect(await readOnly.getRegistry(ProbeRegistry).getInstance('default')).toBeInstanceOf(ProbeService);
  });

  it('does not expose registry registration', () => {
    const readOnly = new ReadOnlyRegistryProvider(new RegistryProvider());
    expect('registerRegistry' in readOnly).toBe(false);
    expect('registerServiceRegistry' in readOnly).toBe(false);
    expect('registerRegistryLazy' in readOnly).toBe(false);
  });
});
