/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceRegistry } from '.';
import { Registrar } from './registrar';
import { RegistryProvider } from './registryProvider';

// A browser is where the registry layer may load plugins; see clientPlugins.ts.
vi.mock('$app/environment', () => ({ browser: true, building: false, dev: true, version: 'test' }));

/** What the fake finder does for each question: the contribution a loaded plugin registers. */
let contributions: Record<string, () => void> = {};
const asked: string[] = [];

vi.mock('$lib/plugin/clientPluginFinder', () => ({
  ClientPluginFinder: {
    instance: () => ({
      findRegistryPlugin: async (domain: string, id: string) => {
        asked.push(`registry|${domain}|${id}`);
        contributions[`registry|${id}`]?.();
      },
      findItemPlugin: async (domain: string, registryId: string, key: string) => {
        asked.push(`item|${domain}|${registryId}|${key}`);
        contributions[`item|${registryId}|${key}`]?.();
      },
      findRegistryWriters: async (domain: string, registryId: string) => {
        asked.push(`writers|${domain}|${registryId}`);
        contributions[`writers|${registryId}`]?.();
      }
    })
  }
}));

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

  public constructor(domain: 'client' | 'global' | 'server' = 'global') {
    super(domain);
    this.registerRegistry(this.things);
  }

  /** What a plugin's registrar does to a provider; exposed so a fake plugin can do it. */
  public register(registry: ServiceRegistry<any, any[], any>, namespace: string): void {
    this.registerRegistry(registry, namespace);
  }
}

beforeEach(() => {
  contributions = {};
  asked.length = 0;
});

describe('plugin loading through the registry providers', () => {
  it('loads the plugin that provides a registry, then retries the lookup', async () => {
    const provider = new TestProvider('global');
    contributions['registry|p1:test.other'] = () => provider.register(new OtherRegistry(), 'p1');

    await expect(provider.getRegistryById('p1:test.other')).resolves.toBeInstanceOf(OtherRegistry);
    expect(asked).toEqual(['registry|global|p1:test.other']);
  });

  it('loads the plugin that provides an item, then retries the lookup', async () => {
    const provider = new TestProvider('global');
    contributions['item|test.things|thing'] = () =>
      new Registrar(provider.things, '', 'p1').register('thing', ThingService);

    await expect(provider.things.getInstance('thing')).resolves.toBeInstanceOf(ThingService);
    expect(asked).toEqual(['item|global|test.things|thing']);
    expect(provider.things.registeredBy('thing')).toBe('p1');
  });

  it('loads the writers before a registry is enumerated', async () => {
    const provider = new TestProvider('global');
    contributions['writers|test.things'] = () => new Registrar(provider.things, '', 'p1').register('one', ThingService);

    await expect(provider.things.loadKeys()).resolves.toEqual(['one']);
    expect(asked).toEqual(['writers|global|test.things']);
  });

  it('reports its own error when the loaded plugin does not provide what was looked up', async () => {
    const provider = new TestProvider('global');
    contributions['registry|p1:test.other'] = () => undefined;

    await expect(provider.getRegistryById('p1:test.other')).rejects.toThrow(/not found/);
    expect(asked).toEqual(['registry|global|p1:test.other']);
  });

  it('loads no plugins for the server domain, even in a browser', async () => {
    const provider = new TestProvider('server');
    const loaded: string[] = [];
    contributions['registry|p1:test.other'] = () => loaded.push('p1');
    contributions['item|test.things|thing'] = () => loaded.push('thing');

    await expect(provider.getRegistryById('p1:test.other')).rejects.toThrow(/not found/);
    await expect(provider.things.getInstance('thing')).rejects.toThrow(/not found/);
    await expect(provider.things.loadKeys()).resolves.toEqual([]);
    expect(asked).toEqual([]);
    expect(loaded).toEqual([]);
  });
});
