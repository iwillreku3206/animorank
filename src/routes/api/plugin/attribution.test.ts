import { describe, expect, it } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import { GET as getRegistry } from './registry/+server';
import { GET as getRegistryItem } from './registryItem/+server';
import { GET as getRegistryWriters } from './registryWriters/+server';
import { ServiceRegistry } from '$lib/registry';
import { GlobalRegistryProvider } from '$lib/registry/global';
import { RegistryProviderRegistrar } from '$lib/registry/registryProviderRegistrar';

class ProbeService {
  public static readonly label = 'probe';
}

/** A registry a plugin registers; only the routes' view of it matters here. */
class ProbeRegistry extends ServiceRegistry<ProbeService, [], typeof ProbeService> {
  public id = 'probe.registry';
}

// Register a plugin's registry the way the plugin API does; the routes read the
// process-wide global provider. The item is registered without a namespace, the
// way data types are, so its key is the plain one.
const registrar = new RegistryProviderRegistrar(GlobalRegistryProvider.instance(), 'probe-plugin');
registrar.registerRegistry(new ProbeRegistry());
registrar.getRegistrar(ProbeRegistry, '').register('probe', ProbeService);

function registryEvent(query: string) {
  return {
    url: new URL(`http://localhost/api/plugin/registry?${query}`)
  } as unknown as Parameters<typeof getRegistry>[0];
}

function itemEvent(query: string) {
  return {
    url: new URL(`http://localhost/api/plugin/registryItem?${query}`)
  } as unknown as Parameters<typeof getRegistryItem>[0];
}

function writersEvent(query: string) {
  return {
    url: new URL(`http://localhost/api/plugin/registryWriters?${query}`)
  } as unknown as Parameters<typeof getRegistryWriters>[0];
}

describe('GET /api/plugin/registry', () => {
  it('reports the plugin that registered a registry', async () => {
    const response = await getRegistry(registryEvent('domain=global&id=probe.registry'));

    await expect(response.json()).resolves.toEqual({
      plugin: 'probe-plugin',
      domain: 'global',
      id: 'probe.registry'
    });
  });

  it('accepts the qualified registry id', async () => {
    const response = await getRegistry(registryEvent('domain=global&id=probe-plugin:probe.registry'));

    await expect(response.json()).resolves.toEqual({
      plugin: 'probe-plugin',
      domain: 'global',
      id: 'probe-plugin:probe.registry'
    });
  });

  it('reports the app namespace for a built-in registry', async () => {
    const response = await getRegistry(registryEvent('domain=global&id=test_case.function.type'));

    await expect(response.json()).resolves.toEqual({
      plugin: 'animorank',
      domain: 'global',
      id: 'test_case.function.type'
    });
  });

  it('rejects a missing or unknown domain', async () => {
    for (const query of ['id=probe.registry', 'domain=nope&id=probe.registry']) {
      await expect(getRegistry(registryEvent(query))).rejects.toSatisfy(
        (error: unknown) => isHttpError(error) && error.status === 400
      );
    }
  });

  it('404s for a registry that is registered nowhere', async () => {
    await expect(getRegistry(registryEvent('domain=global&id=missing'))).rejects.toSatisfy(
      (error: unknown) => isHttpError(error) && error.status === 404
    );
  });
});

describe('GET /api/plugin/registryItem', () => {
  it('reports the plugin that registered an item', async () => {
    const response = await getRegistryItem(itemEvent('domain=global&registry=probe.registry&id=probe'));

    await expect(response.json()).resolves.toEqual({
      plugin: 'probe-plugin',
      domain: 'global',
      registry: 'probe.registry',
      id: 'probe'
    });
  });

  it('400s without a registry or an item id', async () => {
    for (const query of ['domain=global&id=probe', 'domain=global&registry=probe.registry']) {
      await expect(getRegistryItem(itemEvent(query))).rejects.toSatisfy(
        (error: unknown) => isHttpError(error) && error.status === 400
      );
    }
  });

  it('404s for an unknown registry and for an item it does not hold', async () => {
    for (const query of [
      'domain=global&registry=missing&id=probe',
      'domain=global&registry=probe.registry&id=missing'
    ]) {
      await expect(getRegistryItem(itemEvent(query))).rejects.toSatisfy(
        (error: unknown) => isHttpError(error) && error.status === 404
      );
    }
  });
});

describe('GET /api/plugin/registryWriters', () => {
  it('lists the plugins that write into a registry', async () => {
    const response = await getRegistryWriters(writersEvent('domain=global&registry=probe.registry'));

    await expect(response.json()).resolves.toEqual({
      domain: 'global',
      registry: 'probe.registry',
      plugins: ['probe-plugin']
    });
  });

  it('lists the app namespace for a built-in registry', async () => {
    const response = await getRegistryWriters(writersEvent('domain=global&registry=test_case.function.type'));

    await expect(response.json()).resolves.toEqual({
      domain: 'global',
      registry: 'test_case.function.type',
      plugins: ['animorank']
    });
  });

  it('400s without a registry and 404s for an unknown one', async () => {
    await expect(getRegistryWriters(writersEvent('domain=global'))).rejects.toSatisfy(
      (error: unknown) => isHttpError(error) && error.status === 400
    );
    await expect(getRegistryWriters(writersEvent('domain=global&registry=missing'))).rejects.toSatisfy(
      (error: unknown) => isHttpError(error) && error.status === 404
    );
  });
});
