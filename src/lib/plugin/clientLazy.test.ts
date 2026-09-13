/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from 'vitest';
import { ServiceRegistry } from '$lib/registry';
import { Registrar } from '$lib/registry/registrar';
import { RegistryProvider } from '$lib/registry/registryProvider';
import { ClientPluginLoader } from './clientLoader';
import { RegistryAttribution, enableClientLazyPluginLoading, type AttributionSource } from './clientLazy';
import type { PluginClientDescriptor } from './catalog';

class ThingService {
  public static readonly label = 'thing';
}

class ThingRegistry extends ServiceRegistry<ThingService, [], typeof ThingService> {
  public id = 'test.things';
}

class OtherRegistry extends ServiceRegistry<ThingService, [], typeof ThingService> {
  public id = 'test.other';
}

/** A provider with one registry, standing in for the providers the app wires. */
class TestProvider extends RegistryProvider {
  public readonly things = new ThingRegistry();

  public constructor() {
    super();
    this.registerRegistry(this.things);
  }

  /** What a plugin's registrar does to a provider; exposed so a stub plugin can do it. */
  public register(registry: ServiceRegistry<any, any[], any>, namespace: string): void {
    this.registerRegistry(registry, namespace);
  }
}

/** A prebuilt descriptor, so the loader never needs the plugin route. */
function descriptor(id: string): PluginClientDescriptor {
  return {
    id,
    manifestVersion: '0',
    name: `Plugin ${id}`,
    author: 'tester',
    version: '1.0.0',
    category: ['test'],
    modulePath: `virtual/${id}/client.ts`
  };
}

/** A loader whose plugins run `effects[id]` when they initialize. */
function loaderFor(effects: Record<string, () => void>): ClientPluginLoader {
  return new ClientPluginLoader({
    // An empty dynamic catalog: these tests exercise prebuilt plugins only.
    catalogUrl: 'data:application/json,%7B%22plugins%22%3A%5B%5D%7D',
    prebuilt: Object.keys(effects).map(descriptor),
    importModule: async (path) => ({
      default: class {
        public async init(): Promise<void> {
          effects[path.split('/')[1]]();
        }
      }
    })
  });
}

const noAttribution: AttributionSource = {
  pluginForRegistry: async () => undefined,
  pluginForItem: async () => undefined,
  writersForRegistry: async () => []
};

describe('enableClientLazyPluginLoading', () => {
  it('loads the plugin the server attributes an item to, then retries the lookup', async () => {
    const provider = new TestProvider();
    const loaded: string[] = [];
    const loader = loaderFor({
      p1: () => {
        loaded.push('p1');
        new Registrar(provider.things, '', 'p1').register('thing', ThingService);
      }
    });
    const asked: string[] = [];
    const attribution: AttributionSource = {
      pluginForRegistry: async () => undefined,
      pluginForItem: async (domain, registryId, id) => {
        asked.push(`${domain}|${registryId}|${id}`);
        return 'p1';
      },
      writersForRegistry: async () => []
    };
    enableClientLazyPluginLoading([{ provider, domain: 'global' }], { loader, attribution });

    await expect(provider.things.getInstance('thing')).resolves.toBeInstanceOf(ThingService);
    expect(asked).toEqual(['global|test.things|thing']);
    expect(loaded).toEqual(['p1']);
    expect(provider.things.registeredBy('thing')).toBe('p1');
  });

  it('loads the plugin a qualified registry id names, then retries the lookup', async () => {
    const provider = new TestProvider();
    const loader = loaderFor({ p1: () => provider.register(new OtherRegistry(), 'p1') });
    enableClientLazyPluginLoading([{ provider, domain: 'client' }], { loader, attribution: noAttribution });

    await expect(provider.getRegistryById('p1:test.other')).resolves.toBeInstanceOf(OtherRegistry);
  });

  it('sweeps the catalog when the server cannot attribute a registration', async () => {
    const provider = new TestProvider();
    const loaded: string[] = [];
    const loader = loaderFor({
      first: () => {
        loaded.push('first');
      },
      second: () => {
        loaded.push('second');
        new Registrar(provider.things, '', 'second').register('thing', ThingService);
      }
    });
    enableClientLazyPluginLoading([{ provider, domain: 'global' }], { loader, attribution: noAttribution });

    await expect(provider.things.getInstance('thing')).resolves.toBeInstanceOf(ThingService);
    expect(loaded).toEqual(['first', 'second']);
  });

  it('reports the unknown key when no plugin provides it', async () => {
    const provider = new TestProvider();
    const loader = loaderFor({ p1: () => undefined });
    enableClientLazyPluginLoading([{ provider, domain: 'global' }], { loader, attribution: noAttribution });

    await expect(provider.things.getInstance('missing')).rejects.toThrow(/not found/);
  });

  it('loads every plugin that writes to a registry when its keys are enumerated', async () => {
    const provider = new TestProvider();
    const loaded: string[] = [];
    const loader = loaderFor({
      first: () => {
        loaded.push('first');
        new Registrar(provider.things, '', 'first').register('one', ThingService);
      },
      second: () => {
        loaded.push('second');
      }
    });
    const attribution: AttributionSource = {
      pluginForRegistry: async () => undefined,
      pluginForItem: async () => undefined,
      writersForRegistry: async (_domain, registryId) => (registryId === 'test.things' ? ['first'] : [])
    };
    enableClientLazyPluginLoading([{ provider, domain: 'global' }], { loader, attribution });

    await expect(provider.things.loadKeys()).resolves.toEqual(['one']);
    // Only the plugin that writes to the registry loads; 'second' is untouched.
    expect(loaded).toEqual(['first']);
  });
});

describe('ClientPluginLoader.instance', () => {
  it('hands out one shared instance', () => {
    expect(ClientPluginLoader.instance()).toBe(ClientPluginLoader.instance());
  });
});

describe('RegistryAttribution', () => {
  it('reports what the API returns, counts a 404 as unknown, and asks once per question', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        calls.push(url);
        if (url.includes('registryWriters')) {
          return new Response(JSON.stringify({ plugins: ['p1', 'p2'] }), { status: 200 });
        }
        return url.includes('registryItem')
          ? new Response(JSON.stringify({ plugin: 'p1' }), { status: 200 })
          : new Response('no plugin', { status: 404 });
      })
    );
    const attribution = new RegistryAttribution();

    try {
      await expect(attribution.pluginForItem('global', 'test.things', 'thing')).resolves.toBe('p1');
      await expect(attribution.pluginForRegistry('global', 'test.things')).resolves.toBeUndefined();
      await expect(attribution.writersForRegistry('global', 'test.things')).resolves.toEqual(['p1', 'p2']);

      // Repeated questions are answered from the memo, not the API.
      await attribution.pluginForItem('global', 'test.things', 'thing');
      await attribution.pluginForRegistry('global', 'test.things');
      await attribution.writersForRegistry('global', 'test.things');
      expect(calls).toEqual([
        '/api/plugin/registryItem?domain=global&registry=test.things&id=thing',
        '/api/plugin/registry?domain=global&id=test.things',
        '/api/plugin/registryWriters?domain=global&registry=test.things'
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
