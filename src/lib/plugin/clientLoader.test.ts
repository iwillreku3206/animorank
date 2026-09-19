import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import http from 'node:http';
import vm from 'node:vm';
import type { AddressInfo } from 'node:net';
import {
  ClientPluginLoader,
  type PluginClientModule,
  type PluginModuleImporter,
  type ClientPluginLoaderOptions
} from './clientLoader';
import type { PluginPageHookContexts } from './clientPlugin';
import type { PluginClientDescriptor } from './catalog';

/** A plugin the test server serves, plus how often the browser evaluated it. */
interface ServedPlugin {
  id: string;
  code: string;
  loaded: number;
  /** Whether the plugin also ships the shared `global.js` entry. */
  shared: boolean;
}

let server: http.Server;
let origin: string;
let descriptorRequests: string[] = [];
let descriptorFails = false;
const served = new Map<string, ServedPlugin>();

function serve(id: string, code: string, shared = false): ServedPlugin {
  const plugin: ServedPlugin = { id, code, loaded: 0, shared };
  served.set(id, plugin);
  return plugin;
}

/** The descriptor the plugin route serves for one plugin, as the app's route builds it. */
function descriptorFor(plugin: ServedPlugin): PluginClientDescriptor {
  return {
    id: plugin.id,
    manifestVersion: '0',
    name: `Plugin ${plugin.id}`,
    author: 'tester',
    version: '1.0.0',
    category: ['test'],
    clientUrl: `/plugins/${plugin.id}/client.js`,
    globalUrl: plugin.shared ? `/plugins/${plugin.id}/global.js` : undefined
  };
}

/**
 * Plugin module that records its initialization so the test can read it back.
 * The record is written from `init` itself, so importing the module without
 * initializing it (which is how a page hook checks a plugin's class) does not
 * look like a load.
 */
function recordingPlugin(id: string): string {
  return `export default class TestClientPlugin {
  async init(api) {
    globalThis.__pluginInits = (globalThis.__pluginInits ?? []).concat('${id}');
    globalThis.__lastApi = api;
  }
}
`;
}

/**
 * Plugin module whose class overrides the named page hooks; every call records
 * `id:hook:context name`, and a hook named in `failing` throws after recording.
 * Initialization is recorded from `init` itself — importing the module to check
 * its class is not loading it.
 */
function hookingPlugin(id: string, hooks: readonly string[], failing: readonly string[] = []): string {
  const bodies = hooks.map(
    (hook) => `  ${hook}(context) {
    globalThis.__hookCalls = (globalThis.__hookCalls ?? []).concat('${id}:${hook}:' + context.name);${
      failing.includes(hook) ? "\n    throw new Error('the hook failed');" : ''
    }
  }`
  );
  return `export default class TestClientPlugin {
  async init() {
    globalThis.__pluginInits = (globalThis.__pluginInits ?? []).concat('${id}');
  }
${bodies.join('\n')}
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

function loader(options: Partial<ClientPluginLoaderOptions> = {}): ClientPluginLoader {
  return new ClientPluginLoader({ routeBase: `${origin}/plugins`, importModule: browserImport, ...options });
}

/** Entry points the loader has imported, in order. */
let order: string[] = [];

function inits(): string[] {
  return Reflect.get(globalThis, '__pluginInits') ?? [];
}

/** Every page hook call a fixture plugin recorded. */
function hookCalls(): string[] {
  return Reflect.get(globalThis, '__hookCalls') ?? [];
}

beforeAll(async () => {
  server = http.createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const [, , id, file] = url.pathname.split('/');
    const plugin = served.get(id);

    // No file names the plugin itself: the descriptor the client loads it by.
    if (file === undefined) {
      descriptorRequests.push(id);
      if (descriptorFails) {
        response.writeHead(500).end('boom');
        return;
      }
      if (!plugin) {
        response.writeHead(404).end('not found');
        return;
      }
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(descriptorFor(plugin)));
      return;
    }

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

afterEach(() => {
  vi.unstubAllGlobals();
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

  it("asks the route for a plugin's descriptor once per id", async () => {
    serve('descriptor-plugin', recordingPlugin('descriptor-plugin'));
    const plugins = loader();

    descriptorRequests = [];
    await Promise.all([plugins.getPlugin('descriptor-plugin'), plugins.getPlugin('descriptor-plugin')]);

    expect(descriptorRequests).toEqual(['descriptor-plugin']);
  });

  it('returns undefined for a plugin the server does not offer', async () => {
    await expect(loader().getPlugin('nope')).resolves.toBeUndefined();
  });

  it('retries a failed descriptor request instead of caching the failure', async () => {
    serve('retry-descriptor', recordingPlugin('retry-descriptor'));
    const plugins = loader();

    descriptorFails = true;
    await expect(plugins.getPlugin('retry-descriptor')).rejects.toThrow(/Failed to load plugin/);
    descriptorFails = false;

    await expect(plugins.getPlugin('retry-descriptor')).resolves.toBeDefined();
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

  it('imports the entries the descriptor names, wherever they are served', async () => {
    // A prebuilt plugin's entries are chunks of the app's client build, not
    // files of the plugin route; the loader fetches whatever the descriptor
    // names and knows no path of its own.
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              id: 'prebuilt-plugin',
              manifestVersion: '0',
              name: 'Builtin',
              author: 'app',
              version: '1.0.0',
              category: ['test'],
              clientUrl: '/app/immutable/chunks/prebuilt-client.js',
              globalUrl: '/app/immutable/chunks/prebuilt-global.js'
            } satisfies PluginClientDescriptor),
            { status: 200 }
          )
      )
    );
    const urls: string[] = [];
    const plugins = new ClientPluginLoader({
      importModule: async (url) => {
        urls.push(url);
        return {
          default: class {
            async init() {}
          }
        } as never;
      }
    });

    await expect(plugins.getPlugin('prebuilt-plugin')).resolves.toBeDefined();

    expect(urls).toEqual(['/app/immutable/chunks/prebuilt-global.js', '/app/immutable/chunks/prebuilt-client.js']);
  });

  it("runs a dynamic plugin's shared entry before its client entry", async () => {
    order = [];
    serve('global-plugin', recordingPlugin('global-plugin'), true);
    const plugins = new ClientPluginLoader({
      routeBase: `${origin}/plugins`,
      importModule: async (path) => {
        order.push(path.endsWith('global.js') ? 'global' : 'client');
        return {
          default: class {
            async init() {}
          }
        } as never;
      }
    });

    await plugins.getPlugin('global-plugin');
    expect(order).toEqual(['global', 'client']);
  });
});

/**
 * Page hooks: which plugins a page loads, and which of them are told the page
 * has loaded. A plugin answers a page by overriding its hook, and the class is
 * all the loader needs to decide — a plugin that leaves the hook alone is
 * never initialized for that page.
 */
describe('ClientPluginLoader page hooks', () => {
  const solvePage = { name: 'the solve page' } as unknown as PluginPageHookContexts['onSolvePageLoad'];

  it('loads the plugins that answer the hook, and calls each with the context', async () => {
    serve('solver', hookingPlugin('solver', ['onSolvePageLoad']));
    serve('editor-plugin', hookingPlugin('editor-plugin', ['onProblemEditorLoad']));
    const plugins = loader({ prebuiltPlugins: () => ['solver', 'editor-plugin'] });

    await plugins.notifyPageHook('onSolvePageLoad', solvePage);

    expect(inits()).toContain('solver');
    expect(inits()).not.toContain('editor-plugin');
    expect(hookCalls()).toEqual(['solver:onSolvePageLoad:the solve page']);
  });

  it('leaves a plugin that does not answer the hook unloaded', async () => {
    serve('plain-plugin', recordingPlugin('plain-plugin'));
    const plugins = loader({ prebuiltPlugins: () => ['plain-plugin'] });

    await plugins.notifyPageHook('onSolvePageLoad', solvePage);

    expect(inits()).not.toContain('plain-plugin');
    expect(hookCalls()).not.toContain('plain-plugin:onSolvePageLoad:the solve page');
  });

  it('tells a plugin that was already loaded', async () => {
    serve('loaded-solver', hookingPlugin('loaded-solver', ['onSolvePageLoad']));
    const plugins = loader();

    await plugins.getPlugin('loaded-solver');
    await plugins.notifyPageHook('onSolvePageLoad', solvePage);

    expect(hookCalls()).toContain('loaded-solver:onSolvePageLoad:the solve page');
  });

  it('keeps a failing hook from stopping the other plugins', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    serve('failing-solver', hookingPlugin('failing-solver', ['onSolvePageLoad'], ['onSolvePageLoad']));
    serve('working-solver', hookingPlugin('working-solver', ['onSolvePageLoad']));
    const plugins = loader({ prebuiltPlugins: () => ['failing-solver', 'working-solver'] });

    await plugins.notifyPageHook('onSolvePageLoad', solvePage);

    expect(hookCalls()).toContain('working-solver:onSolvePageLoad:the solve page');
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('passes over a plugin the route does not serve', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const plugins = loader({ prebuiltPlugins: () => ['not-served'] });

    await expect(plugins.notifyPageHook('onSolvePageLoad', solvePage)).resolves.toBeUndefined();

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
