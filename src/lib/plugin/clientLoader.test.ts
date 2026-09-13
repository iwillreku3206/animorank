import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import http from 'node:http';
import vm from 'node:vm';
import type { AddressInfo } from 'node:net';
import {
  ClientPluginLoader,
  prebuiltPluginDescriptors,
  type PluginClientModule,
  type PluginModuleImporter
} from './clientLoader';
import type { PluginClientDescriptor } from './catalog';

/** A plugin module the test server serves, plus how often the browser evaluated it. */
interface ServedPlugin {
  descriptor: PluginClientDescriptor;
  code: string;
  loaded: number;
  /** Whether the plugin also ships the shared `global.js` entry. */
  shared: boolean;
}

let server: http.Server;
let origin: string;
let catalogRequests = 0;
let catalogFails = false;
const served = new Map<string, ServedPlugin>();

function serve(id: string, code: string, shared = false): ServedPlugin {
  const plugin: ServedPlugin = {
    descriptor: {
      id,
      manifestVersion: '0',
      name: `Plugin ${id}`,
      author: 'tester',
      version: '1.0.0',
      category: ['test'],
      clientUrl: `/plugins/${id}/client.js`,
      globalUrl: shared ? `/plugins/${id}/global.js` : undefined
    },
    code,
    loaded: 0,
    shared
  };
  served.set(id, plugin);
  return plugin;
}

/** Plugin module that records its initialization so the test can read it back. */
function recordingPlugin(id: string): string {
  return `globalThis.__pluginInits = (globalThis.__pluginInits ?? []).concat('${id}');
export default class TestClientPlugin {
  async init(api) {
    globalThis.__lastApi = api;
  }
}
`;
}

/**
 * The browser's way of evaluating a plugin module: dynamic import resolving
 * against the document. Here the served source is evaluated in a fresh
 * context, which is what makes "was this plugin's code evaluated?" observable.
 */
/** Evaluate module source the way an import would: a default export appears as `module.default`. */
function evaluateModule(source: string): PluginClientModule {
  const module: { exports: PluginClientModule } = { exports: {} };
  // Just enough of an ES module to run the fixtures: a default export becomes
  // `exports.default`, exactly as a dynamic import would surface it. The
  // wrapper also runs module code once per import, like the real thing, and
  // `globalThis` is the host's so fixtures can record that they ran.
  const wrapped = `(function (__exports, __module, globalThis) {\n${source.replace(/\bexport default\b/, '__exports.default =')}\n})`;
  const factory = vm.runInNewContext(wrapped, { console, URL, fetch, setTimeout, clearTimeout }) as (
    _exports: unknown,
    _module: unknown,
    _globalThis: unknown
  ) => void;
  factory(module.exports, module, globalThis);
  return module.exports;
}

const browserImport: PluginModuleImporter = async (url) => {
  const response = await fetch(new URL(url, origin));
  if (!response.ok) throw new Error(`Failed to import ${url} (${response.status})`);
  return evaluateModule(await response.text());
};

function loader(): ClientPluginLoader {
  return new ClientPluginLoader({ catalogUrl: `${origin}/plugins`, importModule: browserImport });
}

/** Entry points the loader has imported, in order. */
let order: string[] = [];

function inits(): string[] {
  return Reflect.get(globalThis, '__pluginInits') ?? [];
}

beforeAll(async () => {
  server = http.createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (url.pathname === '/plugins') {
      catalogRequests += 1;
      if (catalogFails) {
        response.writeHead(500).end('boom');
        return;
      }
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ plugins: [...served.values()].map((plugin) => plugin.descriptor) }));
      return;
    }

    const [, , id, file] = url.pathname.split('/');
    const plugin = served.get(id);
    if (!plugin || (file !== 'client.js' && file !== 'global.js')) {
      response.writeHead(404).end('not found');
      return;
    }
    if (file === 'global.js') {
      response.writeHead(200, { 'content-type': 'text/javascript' });
      response.end('export const shared = 1;\n');
      return;
    }
    plugin.loaded += 1;
    response.writeHead(200, { 'content-type': 'text/javascript' });
    response.end(plugin.code);
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

describe('ClientPluginLoader', () => {
  it('loads a plugin only when it is first requested', async () => {
    const plugin = serve('lazy-plugin', recordingPlugin('lazy-plugin'));

    expect(plugin.loaded).toBe(0);
    expect(inits()).not.toContain('lazy-plugin');

    const instance = await loader().getPlugin('lazy-plugin');

    expect(instance).toBeDefined();
    expect(plugin.loaded).toBe(1);
    expect(inits()).toContain('lazy-plugin');
  });

  it('initializes the plugin with an API bound to its own id', async () => {
    serve('api-plugin', recordingPlugin('api-plugin'));

    await loader().getPlugin('api-plugin');

    const api = Reflect.get(globalThis, '__lastApi') as Record<string, { id: string }>;
    expect(api.clientRegistryProviderRegistrar.id).toBe('api-plugin');
    expect(api.globalRegistryProviderRegistrar.id).toBe('api-plugin');
  });

  it('memoizes the instance and the code evaluation', async () => {
    const plugin = serve('memo-plugin', recordingPlugin('memo-plugin'));
    const plugins = loader();

    const first = await plugins.getPlugin('memo-plugin');
    const second = await plugins.getPlugin('memo-plugin');

    expect(second).toBe(first);
    expect(plugin.loaded).toBe(1);
  });

  it('shares one in-flight load between concurrent requests', async () => {
    const plugin = serve('concurrent-plugin', recordingPlugin('concurrent-plugin'));
    const plugins = loader();

    const [first, second] = await Promise.all([
      plugins.getPlugin('concurrent-plugin'),
      plugins.getPlugin('concurrent-plugin')
    ]);

    expect(second).toBe(first);
    expect(plugin.loaded).toBe(1);
  });

  it('fetches the catalog once and caches it', async () => {
    serve('catalog-plugin', recordingPlugin('catalog-plugin'));
    const plugins = loader();

    catalogRequests = 0;
    const first = await plugins.catalog();
    const second = await plugins.catalog();

    expect(catalogRequests).toBe(1);
    expect(second).toEqual(first);
    expect(first.map((plugin) => plugin.id)).toContain('catalog-plugin');
  });

  it('returns undefined for a plugin the server does not offer', async () => {
    await expect(loader().getPlugin('nope')).resolves.toBeUndefined();
  });

  it('retries a failed catalog fetch instead of caching the failure', async () => {
    const plugins = loader();
    catalogFails = true;
    await expect(plugins.catalog()).rejects.toThrow(/plugin catalog/);
    catalogFails = false;

    await expect(plugins.catalog()).resolves.toBeInstanceOf(Array);
  });

  it('loads the dynamic plugins through loadAll', async () => {
    serve('all-a', recordingPlugin('all-a'));
    serve('all-b', recordingPlugin('all-b'));
    const plugins = new ClientPluginLoader({
      catalogUrl: `${origin}/plugins`,
      importModule: browserImport,
      prebuilt: []
    });

    const loaded = await plugins.loadAll();

    expect(loaded.length).toBeGreaterThanOrEqual(2);
    expect(inits()).toEqual(expect.arrayContaining(['all-a', 'all-b']));
  });

  it('rejects a client entry that has no default export', async () => {
    serve('bad-plugin', 'export default 42;\n');

    await expect(loader().getPlugin('bad-plugin')).rejects.toThrow(/no default export|not a constructor/);
  });

  it('leaves a failed plugin retryable', async () => {
    const plugin = serve('retry-plugin', 'export default 42;\n');
    const plugins = loader();

    await expect(plugins.getPlugin('retry-plugin')).rejects.toThrow();
    plugin.code = recordingPlugin('retry-plugin');

    await expect(plugins.getPlugin('retry-plugin')).resolves.toBeDefined();
  });

  it('loads a prebuilt plugin from its Vite module path, never the plugin route', async () => {
    const plugins = new ClientPluginLoader({
      catalogUrl: `${origin}/plugins`,
      prebuilt: [
        {
          id: 'bundled-plugin',
          manifestVersion: '0',
          name: 'Bundled',
          author: 'app',
          version: '1.0.0',
          category: ['test'],
          modulePath: '../../../plugins/bundled-plugin/client.ts'
        }
      ],
      importModule: async (path) => {
        expect(path).toBe('../../../plugins/bundled-plugin/client.ts');
        return evaluateModule(recordingPlugin('bundled-plugin'));
      }
    });

    const plugin = await plugins.getPlugin('bundled-plugin');

    expect(plugin).toBeDefined();
    expect(inits()).toContain('bundled-plugin');
  });

  it("runs a dynamic plugin's shared entry before its client entry", async () => {
    order = [];
    serve('global-plugin', recordingPlugin('global-plugin'), true);
    const plugins = new ClientPluginLoader({
      catalogUrl: `${origin}/plugins`,
      prebuilt: [],
      importModule: async (path) => {
        order.push(path.endsWith('global.js') ? 'global' : 'client');
        return {
          default: class {
            async init() {}
          }
        } as never;
      }
    });

    const descriptor = (await plugins.catalog()).find((plugin) => plugin.id === 'global-plugin');
    expect(descriptor?.globalUrl).toBe('/plugins/global-plugin/global.js');

    await plugins.getPlugin('global-plugin');
    expect(order).toEqual(['global', 'client']);
  });

  it("runs a prebuilt plugin's shared entry before its client entry", async () => {
    order = [];
    const plugins = new ClientPluginLoader({
      catalogUrl: `${origin}/plugins`,
      prebuilt: [
        {
          id: 'prebuilt-global',
          manifestVersion: '0',
          name: 'Bundled',
          author: 'app',
          version: '1.0.0',
          category: ['test'],
          modulePath: 'virtual/client.ts',
          loadGlobal: async () => {
            order.push('global');
          }
        }
      ],
      importModule: async () => {
        order.push('client');
        return {
          default: class {
            async init() {}
          }
        } as never;
      }
    });

    await plugins.getPlugin('prebuilt-global');

    expect(order).toEqual(['global', 'client']);
  });

  it('prefers a prebuilt plugin over a dynamic one with the same id', async () => {
    serve('shared-id', recordingPlugin('shared-id'));

    const plugins = new ClientPluginLoader({
      catalogUrl: `${origin}/plugins`,
      prebuilt: [
        {
          id: 'shared-id',
          manifestVersion: '0',
          name: 'Bundled',
          author: 'app',
          version: '1.0.0',
          category: ['test'],
          modulePath: 'virtual'
        }
      ],
      importModule: async () => ({ default: class extends class {} {} as never }) as never
    });

    const catalog = await plugins.catalog();

    expect(catalog.filter((plugin) => plugin.id === 'shared-id')).toHaveLength(1);
    expect(catalog.find((plugin) => plugin.id === 'shared-id')?.modulePath).toBe('virtual');
  });
});

describe('prebuiltPluginDescriptors', () => {
  it('resolves every app plugin to a Vite module path, never to a plugin-route URL', () => {
    const descriptors = prebuiltPluginDescriptors();

    // The app's own plugin ships here; an empty list means the globs missed it.
    const arrayTypes = descriptors.find((descriptor) => descriptor.id === 'array-types');
    expect(arrayTypes?.modulePath).toMatch(/\/plugins\/array-types\/client\.ts$/);
    expect(arrayTypes?.loadGlobal).toBeTypeOf('function');

    for (const descriptor of descriptors) {
      // Prebuilt plugins are bundled with the app, so they must not go through
      // the plugin route, which exists for dynamically loaded plugins only.
      expect(descriptor.modulePath).toMatch(/\/plugins\/[^/]+\/client\.ts$/);
      expect(descriptor.clientUrl).toBeUndefined();
    }
  });
});
