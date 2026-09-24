import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiQueryHandler } from '$lib/util/apiQueryHandler';
import { ClientPluginLoader } from './clientLoader';
import { ClientPluginFinder } from './clientPluginFinder';
import { ClientPlugin } from './clientPlugin';
import type { PluginClientDescriptor } from './catalog';

/** The descriptor the plugin route serves for a plugin the fixture has. */
function descriptorFor(id: string): PluginClientDescriptor {
  return {
    id,
    manifestVersion: '0',
    name: `Plugin ${id}`,
    author: 'tester',
    version: '1.0.0',
    category: ['test'],
    clientUrl: `/plugins/${id}/client.js`
  };
}

interface FinderFixture {
  finder: ClientPluginFinder;
  /** The plugins whose code was loaded. */
  loaded: string[];
  /** The query URLs the finder asked the API for. */
  asked: string[];
  /** The plugin ids whose descriptor the loader asked the plugin route for. */
  described: string[];
}

/**
 * A finder over the app's plugin API: `answers` is what the API returns
 * per query URL, and anything it does not answer 404s, exactly as the routes
 * do for what they know of nothing. The plugin route serves a descriptor for
 * every plugin in `plugins`, and its files for the plugins that ask for them.
 */
function finderFor(answers: Record<string, unknown>, plugins: string[] = []): FinderFixture {
  const loaded: string[] = [];
  const asked: string[] = [];
  const described: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.startsWith('/plugins/')) {
        const id = url.slice('/plugins/'.length);
        described.push(id);
        return plugins.includes(id)
          ? new Response(JSON.stringify(descriptorFor(id)), { status: 200 })
          : new Response('nothing', { status: 404 });
      }
      asked.push(url);
      const answer = answers[url];
      return answer === undefined
        ? new Response('nothing', { status: 404 })
        : new Response(JSON.stringify(answer), { status: 200 });
    })
  );

  const loader = new ClientPluginLoader({
    importModule: async (path) => {
      loaded.push(path.split('/')[2]);
      return {
        default: class extends ClientPlugin {
          public async init(): Promise<void> {}
        }
      };
    }
  });

  return {
    finder: new ClientPluginFinder({ api: new ApiQueryHandler('/api/plugin'), loader }),
    loaded,
    asked,
    described
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ClientPluginFinder', () => {
  it('loads the plugin the server attributes an item to', async () => {
    const { finder, loaded, asked } = finderFor(
      { '/api/plugin/registryItem?domain=global&registry=test.things&id=thing': { plugin: 'p1' } },
      ['p1']
    );

    await finder.findItemPlugin('global', 'test.things', 'thing');

    expect(loaded).toEqual(['p1']);
    expect(asked).toEqual(['/api/plugin/registryItem?domain=global&registry=test.things&id=thing']);
  });

  it('loads the plugin a qualified registry id names, without asking the server', async () => {
    const { finder, loaded, asked } = finderFor({}, ['p1']);

    await finder.findRegistryPlugin('client', 'p1:test.other');

    expect(loaded).toEqual(['p1']);
    expect(asked).toEqual([]);
  });

  it('asks which plugin registers a registry, then loads it', async () => {
    const { finder, loaded, asked } = finderFor(
      { '/api/plugin/registry?domain=global&id=test.things': { plugin: 'p2' } },
      ['p2']
    );

    await finder.findRegistryPlugin('global', 'test.things');

    expect(loaded).toEqual(['p2']);
    expect(asked).toEqual(['/api/plugin/registry?domain=global&id=test.things']);
  });

  it('loads nothing when the server attributes no plugin', async () => {
    const { finder, loaded, asked } = finderFor({}, ['p1', 'p2']);

    await finder.findRegistryPlugin('global', 'test.missing');
    await finder.findItemPlugin('global', 'test.things', 'missing');

    expect(loaded).toEqual([]);
    expect(asked).toEqual([
      '/api/plugin/registry?domain=global&id=test.missing',
      '/api/plugin/registryItem?domain=global&registry=test.things&id=missing'
    ]);
  });

  it('loads every plugin the server names as a writer', async () => {
    const { finder, loaded, asked } = finderFor(
      { '/api/plugin/registryWriters?domain=global&registry=test.things': { plugins: ['p1', 'p2'] } },
      ['p1', 'p2']
    );

    await finder.findRegistryWriters('global', 'test.things');

    expect(loaded).toEqual(['p1', 'p2']);
    expect(asked).toEqual(['/api/plugin/registryWriters?domain=global&registry=test.things']);
  });

  it('skips a plugin it cannot load and loads the rest', async () => {
    const { finder, loaded } = finderFor(
      { '/api/plugin/registryWriters?domain=global&registry=test.things': { plugins: ['ghost', 'p1'] } },
      ['p1']
    );

    await finder.findRegistryWriters('global', 'test.things');

    expect(loaded).toEqual(['p1']);
  });

  it('hands out one shared instance', () => {
    expect(ClientPluginFinder.instance()).toBe(ClientPluginFinder.instance());
  });
});
