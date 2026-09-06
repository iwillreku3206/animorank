import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PluginLoader } from './loader';
import { LoadedPlugin } from './loadedPlugin';
import type { PluginServerModule } from './loadedPlugin';
import type { PluginManifest } from './manifest';
import { ServerPlugin } from './plugin';

let root: string;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'plugin-loader-'));
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

const CLIENT_JS = "import './static/other.js';\nconsole.log('client');\n";
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
  public async init() {}
}

describe('PluginLoader dynamic plugins', () => {
  it('loads a plugin directory into a LoadedPlugin and registers it by manifest id', async () => {
    await writeFiles('sample', {
      'manifest.json': validManifest('sample-plugin'),
      'client.js': CLIENT_JS,
      'server.js': SERVER_JS,
      'package.json': '{"type": "module"}\n',
      'static/other.js': 'export const helper = 1;\n',
      'static/sub/style.css': 'body { color: red; }\n'
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
      'static/other.js': 'export const helper = 1;\n',
      'static/sub/style.css': 'body { color: red; }\n'
    });

    const [plugin] = await new PluginLoader().loadDynamicPlugins(root);

    expect([...plugin.files.keys()].sort()).toEqual(['client.js', 'static/other.js', 'static/sub/style.css']);
    expect(plugin.files.get('client.js')?.toString('utf8')).toBe(CLIENT_JS);
    expect(plugin.files.get('static/other.js')?.toString('utf8')).toBe('export const helper = 1;\n');
    expect(plugin.files.get('static/sub/style.css')?.toString('utf8')).toBe('body { color: red; }\n');
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
    // The fixture default-exports a ServerPlugin class; instantiate to reach init.
    const ServerPluginClass = plugin.server.default as unknown as new () => { init: () => Promise<void> };
    expect(typeof new ServerPluginClass().init).toBe('function');
  });

  it('handles plugins without a static folder', async () => {
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
});

describe('PluginLoader prebuilt plugins', () => {
  it('uses the plugins found by the src/plugins and plugins globs when no descriptors are given', async () => {
    const loader = new PluginLoader();
    const loaded = await loader.loadPrebuiltPlugins();

    for (const plugin of loaded) {
      expect(plugin.type).toBe('prebuilt');
      expect(loader.getPlugin(plugin.manifest.id)).toBe(plugin);
    }
  });

  it('wraps compile-time descriptors into LoadedPlugins and registers them', async () => {
    const files = new Map<string, Buffer>([
      ['client.ts', Buffer.from("console.log('hi');\n")],
      ['static/data.json', Buffer.from('{"a":1}\n')]
    ]);
    const server = { default: new PrebuiltServerPlugin() } satisfies PluginServerModule;

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
    expect(plugin.server.default).toBeInstanceOf(ServerPlugin);
    expect(loader.getPlugin('built-in-plugin')).toBe(plugin);
  });

  it('fails fast on an invalid manifest (compile-time data is trusted)', async () => {
    const loader = new PluginLoader();
    await expect(
      loader.loadPrebuiltPlugins([
        {
          manifest: { id: '', manifestVersion: 'nope' },
          files: new Map(),
          server: { default: new PrebuiltServerPlugin() }
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
        server: { default: new PrebuiltServerPlugin() }
      }
    ]);

    expect(loaded).toHaveLength(0);
    expect(loader.getPlugin('dup-plugin')).toBe(dynamicPlugin);
    expect(loader.getPlugin('dup-plugin')?.type).toBe('dynamic');
  });
});
