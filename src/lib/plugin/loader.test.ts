import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ServerAnimoRankAPI } from '$lib/api/server';
import { GlobalRegistryProvider } from '$lib/registry/global';
import { LanguageRegistry } from '$lib/language/languageRegistry';
import { PluginLoader } from './loader';
import { LoadedPlugin } from './loadedPlugin';
import type { PluginServerModule } from './loadedPlugin';
import type { PluginManifest } from './manifest';
import { ServerPlugin } from './serverPlugin';

let root: string;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'plugin-loader-'));
  PrebuiltServerPlugin.lastInstance = null;
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

function validManifest(id: string): string {
  return JSON.stringify({
    id,
    manifestVersion: '0',
    name: `Plugin ${id}`,
    author: 'tester',
    version: '1.0.0',
    category: ['test']
  } satisfies PluginManifest);
}

const CLIENT_JS = "import './client/other.js';\nconsole.log('client');\n";
const SERVER_JS = 'export default class TestServerPlugin {\n  async init() {}\n}\n';
async function writeFiles(rel: string, files: Record<string, string>): Promise<string> {
  const dir = path.join(root, rel);
  for (const [file, content] of Object.entries(files)) {
    const fullPath = path.join(dir, file);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
  }
  return dir;
}

class PrebuiltServerPlugin extends ServerPlugin {
  public static lastInstance: PrebuiltServerPlugin | null = null;
  public receivedApi: ServerAnimoRankAPI | null = null;

  public async init(api: ServerAnimoRankAPI) {
    PrebuiltServerPlugin.lastInstance = this;
    this.receivedApi = api;
  }
}

/** Load a single descriptor holding {@link PrebuiltServerPlugin} and hand back the instance the loader initialized. */
async function loadPrebuilt(id: string): Promise<PrebuiltServerPlugin> {
  const loader = new PluginLoader();
  const loaded = await loader.loadPrebuiltPlugins([
    { manifest: JSON.parse(validManifest(id)), files: new Map(), server: { default: PrebuiltServerPlugin } }
  ]);
  expect(loaded).toHaveLength(1);
  expect(PrebuiltServerPlugin.lastInstance).toBeInstanceOf(PrebuiltServerPlugin);
  return PrebuiltServerPlugin.lastInstance!;
}

describe('PluginLoader dynamic plugins', () => {
  it('loads a plugin directory into a LoadedPlugin and registers it by manifest id', async () => {
    await writeFiles('sample', {
      'manifest.json': validManifest('sample-plugin'),
      'client.js': CLIENT_JS,
      'server.js': SERVER_JS,
      'package.json': '{"type": "module"}\n',
      'client/other.js': 'export const helper = 1;\n',
      'client/sub/style.css': 'body { color: red; }\n'
    });

    const loader = new PluginLoader();
    const loaded = await loader.loadDynamicPlugins(root);

    expect(loaded).toHaveLength(1);
    const plugin = loaded[0];
    expect(plugin).toBeInstanceOf(LoadedPlugin);
    expect(plugin.type).toBe('dynamic');
    expect(plugin.manifest).toEqual({
      id: 'sample-plugin',
      manifestVersion: '0',
      name: 'Plugin sample-plugin',
      author: 'tester',
      version: '1.0.0',
      category: ['test']
    });
    expect(loader.getPlugin('sample-plugin')).toBe(plugin);
    expect(loader.getPlugin('unknown')).toBeUndefined();
  });

  it('keeps files keyed by plugin-root-relative paths with directory structure intact', async () => {
    await writeFiles('sample', {
      'manifest.json': validManifest('sample-plugin'),
      'client.js': CLIENT_JS,
      'server.js': SERVER_JS,
      'package.json': '{"type": "module"}\n',
      'client/other.js': 'export const helper = 1;\n',
      'client/sub/style.css': 'body { color: red; }\n'
    });

    const [plugin] = await new PluginLoader().loadDynamicPlugins(root);

    expect([...plugin.files.keys()].sort()).toEqual(['client.js', 'client/other.js', 'client/sub/style.css']);
    expect(plugin.files.get('client.js')?.toString('utf8')).toBe(CLIENT_JS);
    expect(plugin.files.get('client/other.js')?.toString('utf8')).toBe('export const helper = 1;\n');
    expect(plugin.files.get('client/sub/style.css')?.toString('utf8')).toBe('body { color: red; }\n');
  });

  it('dynamic-imports server.js and exposes the module namespace', async () => {
    await writeFiles('sample', {
      'manifest.json': validManifest('sample-plugin'),
      'client.js': CLIENT_JS,
      'server.js': SERVER_JS,
      'package.json': '{"type": "module"}\n'
    });

    const [plugin] = await new PluginLoader().loadDynamicPlugins(root);

    expect(plugin.server).toBeDefined();
    // The fixture default-exports a ServerPlugin class; the loader instantiates it.
    const ServerPluginClass = plugin.server.default;
    expect(ServerPluginClass).toBeTypeOf('function');
    expect(typeof new ServerPluginClass!().init).toBe('function');
  });

  it('runs the shared global.js entry before server.js and serves it', async () => {
    const order: string[] = [];
    Reflect.set(globalThis, '__pluginOrder', order);
    await writeFiles('ordered', {
      'manifest.json': validManifest('ordered-plugin'),
      'package.json': '{"type": "module"}\n',
      'client.js': CLIENT_JS,
      'global.js': "globalThis.__pluginOrder.push('global');\nexport const shared = 1;\n",
      'server.js':
        "globalThis.__pluginOrder.push('server');\n" +
        "export default class OrderedServerPlugin {\n  async init() { globalThis.__pluginOrder.push('init'); }\n}\n"
    });

    const [plugin] = await new PluginLoader().loadDynamicPlugins(root);

    expect(order).toEqual(['global', 'server', 'init']);
    // The shared entry is public: the browser imports it before the client entry.
    expect(plugin.files.get('global.js')?.toString('utf8')).toContain('__pluginOrder');
    Reflect.deleteProperty(globalThis, '__pluginOrder');
  });

  it('handles a plugin without a shared entry', async () => {
    await writeFiles('plain', {
      'manifest.json': validManifest('plain-plugin'),
      'package.json': '{"type": "module"}\n',
      'client.js': CLIENT_JS,
      'server.js': SERVER_JS
    });

    const [plugin] = await new PluginLoader().loadDynamicPlugins(root);

    expect(plugin.files.has('global.js')).toBe(false);
  });

  it('handles plugins without a client folder', async () => {
    await writeFiles('sample', {
      'manifest.json': validManifest('bare-plugin'),
      'client.js': CLIENT_JS,
      'server.js': SERVER_JS,
      'package.json': '{"type": "module"}\n'
    });

    const [plugin] = await new PluginLoader().loadDynamicPlugins(root);

    expect([...plugin.files.keys()]).toEqual(['client.js']);
  });

  it('loads multiple plugins and skips non-plugin entries', async () => {
    await writeFiles('a', {
      'manifest.json': validManifest('plugin-a'),
      'package.json': '{"type": "module"}\n',
      'client.js': CLIENT_JS,
      'server.js': SERVER_JS
    });
    await writeFiles('b', {
      'manifest.json': validManifest('plugin-b'),
      'package.json': '{"type": "module"}\n',
      'client.js': CLIENT_JS,
      'server.js': SERVER_JS
    });
    await writeFiles('not-a-plugin', { 'readme.txt': 'hello' });
    await fs.writeFile(path.join(root, 'stray-file.txt'), 'not a directory');

    const loader = new PluginLoader();
    const loaded = await loader.loadDynamicPlugins(root);

    expect(loaded.map((plugin) => plugin.manifest.id).sort()).toEqual(['plugin-a', 'plugin-b']);
    expect(loader.getPlugin('plugin-a')).toBeDefined();
    expect(loader.getPlugin('plugin-b')).toBeDefined();
    expect(loader.getPlugin('not-a-plugin')).toBeUndefined();
  });

  it('skips broken plugin directories and keeps loading the rest', async () => {
    await writeFiles('good', {
      'manifest.json': validManifest('good-plugin'),
      'package.json': '{"type": "module"}\n',
      'client.js': CLIENT_JS,
      'server.js': SERVER_JS
    });
    // No manifest at all.
    await writeFiles('no-manifest', { 'client.js': CLIENT_JS });
    // Malformed manifest JSON.
    await writeFiles('bad-json', { 'manifest.json': '{ not json' });
    // Manifest that fails schema validation (missing id).
    await writeFiles('bad-schema', {
      'manifest.json': JSON.stringify({ name: 'no id' }),
      'client.js': CLIENT_JS,
      'server.js': SERVER_JS
    });
    // Missing client entry.
    await writeFiles('no-client', {
      'manifest.json': validManifest('no-client'),
      'server.js': SERVER_JS,
      'package.json': '{"type": "module"}\n'
    });
    // Missing server entry.
    await writeFiles('no-server', {
      'manifest.json': validManifest('no-server'),
      'client.js': CLIENT_JS,
      'package.json': '{"type": "module"}\n'
    });

    const loaded = await new PluginLoader().loadDynamicPlugins(root);

    expect(loaded.map((plugin) => plugin.manifest.id)).toEqual(['good-plugin']);
  });

  it('rejects when the plugin directory does not exist', async () => {
    await expect(new PluginLoader().loadDynamicPlugins(path.join(root, 'missing'))).rejects.toThrow();
  });

  it('rejects the whole load when a plugin init throws', async () => {
    await writeFiles('good', {
      'manifest.json': validManifest('good-plugin'),
      'package.json': '{"type": "module"}\n',
      'client.js': CLIENT_JS,
      'server.js': SERVER_JS
    });
    await writeFiles('failing', {
      'manifest.json': validManifest('failing-plugin'),
      'package.json': '{"type": "module"}\n',
      'client.js': CLIENT_JS,
      'server.js': 'export default class FailingPlugin {\n  async init() { throw new Error("init failed"); }\n}\n'
    });

    await expect(new PluginLoader().loadDynamicPlugins(root)).rejects.toThrow('init failed');
  });

  it('hands the plugin its API on init', async () => {
    await writeFiles('sample', {
      'manifest.json': validManifest('api-plugin'),
      'package.json': '{"type": "module"}\n',
      'client.js': CLIENT_JS,
      'server.js':
        'export default class ApiPlugin {\n  async init(api) { globalThis.__apiPluginId = api.serverRegistryProviderRegistrar.id; }\n}\n'
    });

    await new PluginLoader().loadDynamicPlugins(root);

    expect(Reflect.get(globalThis, '__apiPluginId')).toBe('api-plugin');
  });

  it('lets a plugin that cannot import app classes wire a registry by id', async () => {
    // This script is exactly what a runtime plugin can be: no imports at all,
    // because a `data:` URL resolves none. The registry is named by id, and the
    // only class involved is the plugin's own.
    await writeFiles('by-id', {
      'manifest.json': validManifest('by-id-plugin'),
      'package.json': '{"type": "module"}\n',
      'client.js': CLIENT_JS,
      'server.js': [
        "class PluginLanguage { static id = 'pluginlang'; }",
        'export default class ByIdPlugin {',
        '  async init(api) {',
        "    const registrar = await api.globalRegistryProviderRegistrar.getRegistrarById('language');",
        "    registrar.register('pluginlang', PluginLanguage);",
        '  }',
        '}'
      ].join('\n')
    });

    await new PluginLoader().loadDynamicPlugins(root);

    const registry = GlobalRegistryProvider.instance().getRegistry(LanguageRegistry);
    expect(registry.keys()).toContain('by-id-plugin:pluginlang');
    expect(registry.registeredBy('by-id-plugin:pluginlang')).toBe('by-id-plugin');

    // The plugin's own class, reached through the app's registry by id alone.
    const registered = (await registry.getStatic('by-id-plugin:pluginlang')) as unknown as { id: string };
    expect(registered.id).toBe('pluginlang');
  });
});

describe('PluginLoader prebuilt plugins', () => {
  it('uses the plugins found by the src/plugins and plugins globs when no descriptors are given', async () => {
    const loader = new PluginLoader();
    const loaded = await loader.loadPrebuiltPlugins();

    // The app ships its own plugin; an empty list means the glob roots missed it.
    expect(loaded.map((plugin) => plugin.manifest.id)).toContain('array-types');

    for (const plugin of loaded) {
      expect(plugin.type).toBe('prebuilt');
      expect(loader.getPlugin(plugin.manifest.id)).toBe(plugin);
      // Its browser-facing files travel with it, so the route can serve them.
      expect(plugin.files.has('client.ts')).toBe(true);
    }
  });

  it('wraps compile-time descriptors into LoadedPlugins and registers them', async () => {
    const files = new Map<string, Buffer>([
      ['client.ts', Buffer.from("console.log('hi');\n")],
      ['client/data.json', Buffer.from('{"a":1}\n')]
    ]);
    const server = { default: PrebuiltServerPlugin } satisfies PluginServerModule;

    const loader = new PluginLoader();
    const loaded = await loader.loadPrebuiltPlugins([
      { manifest: JSON.parse(validManifest('built-in-plugin')), files, server }
    ]);

    expect(loaded).toHaveLength(1);
    const plugin = loaded[0];
    expect(plugin.type).toBe('prebuilt');
    expect(plugin.manifest.id).toBe('built-in-plugin');
    expect(plugin.files).toBe(files);
    expect(plugin.server).toBe(server);
    expect(loader.getPlugin('built-in-plugin')).toBe(plugin);
  });

  it('hands the prebuilt plugin its API on init', async () => {
    const instance = await loadPrebuilt('built-in-plugin');

    expect(instance).toBeInstanceOf(PrebuiltServerPlugin);
    expect(instance.receivedApi?.serverRegistryProviderRegistrar.id).toBe('built-in-plugin');
    expect(instance.receivedApi?.globalRegistryProvider.getRegistry(LanguageRegistry).keys()).toContain('c');
  });

  it('fails fast when a prebuilt plugin cannot initialize', async () => {
    class FailingPrebuiltPlugin extends ServerPlugin {
      public async init(): Promise<void> {
        throw new Error('init failed');
      }
    }

    await expect(
      new PluginLoader().loadPrebuiltPlugins([
        {
          manifest: JSON.parse(validManifest('failing-plugin')),
          files: new Map(),
          server: { default: FailingPrebuiltPlugin }
        }
      ])
    ).rejects.toThrow('init failed');
  });

  it('fails fast on an invalid manifest (compile-time data is trusted)', async () => {
    const loader = new PluginLoader();
    await expect(
      loader.loadPrebuiltPlugins([
        {
          manifest: { id: '', manifestVersion: 'nope' },
          files: new Map(),
          server: { default: PrebuiltServerPlugin }
        }
      ])
    ).rejects.toThrow();
  });

  it('keeps the first plugin loaded for a duplicate id', async () => {
    await writeFiles('dup', {
      'manifest.json': validManifest('dup-plugin'),
      'client.js': CLIENT_JS,
      'server.js': SERVER_JS,
      'package.json': '{"type": "module"}\n'
    });
    const loader = new PluginLoader();
    const [dynamicPlugin] = await loader.loadDynamicPlugins(root);
    expect(dynamicPlugin).toBeDefined();

    const loaded = await loader.loadPrebuiltPlugins([
      {
        manifest: JSON.parse(validManifest('dup-plugin')),
        files: new Map(),
        server: { default: PrebuiltServerPlugin }
      }
    ]);

    expect(loaded).toHaveLength(0);
    expect(loader.getPlugin('dup-plugin')).toBe(dynamicPlugin);
    expect(loader.getPlugin('dup-plugin')?.type).toBe('dynamic');
  });
});
