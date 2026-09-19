import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppConfig } from '$lib/config/config';
import { PluginsConfigSection } from '$lib/config/sections/plugins';
import { GlobalRegistryProvider } from '$lib/registry/global';
import { ServerPluginService } from './serverPluginService';
import type { PluginManifest } from './manifest';

let root: string;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'plugin-service-'));
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

function manifest(id: string): string {
  return JSON.stringify({
    id,
    manifestVersion: '0',
    name: `Plugin ${id}`,
    author: 'tester',
    version: '1.0.0',
    category: ['test']
  } satisfies PluginManifest);
}

/**
 * Register the global config the service reads its plugin folder from, the way
 * the app's config loader would (the service resolves it through the registry).
 */
function configurePluginDir(pluginDir?: string): void {
  const plugins = new PluginsConfigSection(pluginDir ? { pluginDir } : {});
  GlobalRegistryProvider.instance().registerSingleton(
    AppConfig,
    new AppConfig(path.join(root, 'config.json'), { plugins })
  );
}

async function writePlugin(
  id: string,
  files: Record<string, string> = { 'client.js': `console.log('${id}');\n` }
): Promise<void> {
  const dir = path.join(root, 'plugins', id);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'manifest.json'), files['manifest.json'] ?? manifest(id));
  await fs.writeFile(path.join(dir, 'server.js'), files['server.js'] ?? 'export default class P { async init() {} }\n');
  for (const [name, content] of Object.entries(files)) {
    if (name === 'manifest.json' || name === 'server.js') continue;
    const target = path.join(dir, name);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content);
  }
}

/** A service over a private root, so tests never touch the repository's own plugin folders. */
function service(): ServerPluginService {
  return new ServerPluginService(root);
}

describe('ServerPluginService', () => {
  it('describes a loaded dynamic plugin and the files the browser runs for it', async () => {
    await configurePluginDir('plugins');
    await writePlugin('plugin-a');
    await writePlugin('plugin-b', {
      'client.js': "import './client/helper.js';\n",
      'global.js': 'export const shared = 1;\n',
      'client/helper.js': 'export const helper = 1;\n'
    });
    const plugins = service();

    const plugin = await plugins.getClientDescriptor('plugin-a');
    const shared = await plugins.getClientDescriptor('plugin-b');

    expect(plugin).toMatchObject({
      id: 'plugin-a',
      name: 'Plugin plugin-a',
      clientUrl: '/plugins/plugin-a/client.js'
    });
    // Only a plugin that ships the shared entry is told to run one.
    expect(plugin?.globalUrl).toBeUndefined();
    expect(shared?.globalUrl).toBe('/plugins/plugin-b/global.js');
  });

  it('describes a prebuilt plugin with the entries the app build emitted', async () => {
    await configurePluginDir('plugins');
    await writePlugin('plugin-a');
    const plugins = service();

    // The app ships array-types: its client entry is a compiled module of the
    // client build, and Vite resolved the URLs the route hands the browser.
    const prebuilt = await plugins.getClientDescriptor('array-types');

    expect(prebuilt?.name).toBe('Array Data Types');
    expect(prebuilt?.clientUrl).toMatch(/plugins\/array-types\/client\.ts$/);
    expect(prebuilt?.globalUrl).toMatch(/plugins\/array-types\/global\.ts$/);
  });

  it('describes no plugin it does not have loaded', async () => {
    await configurePluginDir('plugins');
    await writePlugin('plugin-a');

    await expect(service().getClientDescriptor('other-plugin')).resolves.toBeUndefined();
  });

  it('reads the client surface of a plugin and nothing else', async () => {
    await configurePluginDir('plugins');
    await writePlugin('plugin-a', {
      'client.js': "import './client/helper.js';\n",
      'client/helper.js': 'export const helper = 1;\n',
      'secrets.txt': 'not for the browser\n'
    });
    const plugins = service();

    await expect(plugins.readPluginFile('plugin-a', 'client.js')).resolves.toBeInstanceOf(Buffer);
    await expect(plugins.readPluginFile('plugin-a', 'client/helper.js')).resolves.toBeInstanceOf(Buffer);
    await expect(plugins.readPluginFile('plugin-a', 'secrets.txt')).resolves.toBeUndefined();
    await expect(plugins.readPluginFile('plugin-a', 'server.js')).resolves.toBeUndefined();
    await expect(plugins.readPluginFile('plugin-a', 'manifest.json')).resolves.toBeUndefined();
    await expect(plugins.readPluginFile('plugin-a', '../plugin-a/client.js')).resolves.toBeUndefined();
    await expect(plugins.readPluginFile('other-plugin', 'client.js')).resolves.toBeUndefined();
  });

  it('scans the folder named by the global config', async () => {
    await configurePluginDir('custom-plugins');
    const dir = path.join(root, 'custom-plugins', 'disk-plugin');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'manifest.json'), manifest('disk-plugin'));
    await fs.writeFile(path.join(dir, 'client.js'), 'export const x = 1;\n');
    await fs.writeFile(path.join(dir, 'server.js'), 'export default class P { async init() {} }\n');
    // A package in the default location must be ignored: only the configured folder is scanned.
    await writePlugin('elsewhere-plugin');

    const ids = (await service().getLoader()).getPlugins().map((plugin) => plugin.manifest.id);

    expect(ids).toContain('disk-plugin');
    expect(ids).not.toContain('elsewhere-plugin');
  });

  it('scans nothing when the config names no plugin folder', async () => {
    await configurePluginDir();
    await writePlugin('elsewhere-plugin');

    const ids = (await service().getLoader()).getPlugins().map((plugin) => plugin.manifest.id);

    expect(ids).not.toContain('elsewhere-plugin');
  });

  it('fails when the configured plugin folder does not exist', async () => {
    await configurePluginDir('missing-folder');

    await expect(service().getClientDescriptor('plugin-a')).rejects.toThrow(/does not exist/);
  });

  it('loads lazily and caches the loader', async () => {
    await writePlugin('lazy-plugin');
    configurePluginDir('plugins');
    const plugins = service();

    const first = await plugins.getLoader();

    expect(await plugins.getLoader()).toBe(first);
    expect(first.getPlugins().map((plugin) => plugin.manifest.id)).toContain('lazy-plugin');
  });

  it('picks the folder up on a later call when it was missing before', async () => {
    configurePluginDir('plugins');
    const plugins = service();
    await expect(plugins.getLoader()).rejects.toThrow(/does not exist/);

    // A folder created after the failed attempt is picked up: failures are not cached.
    await writePlugin('late-plugin');
    const loader = await plugins.getLoader();
    expect(loader.getPlugins().map((plugin) => plugin.manifest.id)).toContain('late-plugin');
  });
});
