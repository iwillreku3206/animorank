import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ClientAnimoRankAPI } from './client';
import { ServerAnimoRankAPI } from './server';
import { GlobalRegistryProvider } from '$lib/registry/global';
import { ClientRegistryProvider } from '$lib/registry/client';
import { ServerRegistryProvider } from '$lib/registry/server';
import { ServiceRegistry } from '$lib/registry';
import { LanguageRegistry } from '$lib/language/languageRegistry';
import { CLanguage } from '$lib/language/c';
import { LoggerRegistry } from '$lib/logging/loggerRegistry';

class MyLanguage extends CLanguage {
  public static override id = 'apimylang';
}

class ApiProbeService {}

class ApiProbeRegistry extends ServiceRegistry<ApiProbeService, [], object> {
  public id = 'api_probe';
}

class ClientProbeRegistry extends ServiceRegistry<ApiProbeService, [], object> {
  public id = 'api_client_probe';
}

describe('ServerAnimoRankAPI', () => {
  it('registers into the global registry provider under the plugin id', async () => {
    const api = new ServerAnimoRankAPI('probe-plugin');
    api.globalRegistryProviderRegistrar.getRegistrar(LanguageRegistry).register('mylang', MyLanguage);

    const registry = GlobalRegistryProvider.instance().getRegistry(LanguageRegistry);
    expect(registry.keys()).toContain('probe-plugin:mylang');
    expect(await api.globalRegistryProvider.getRegistry(LanguageRegistry).getInstance('c')).toBeInstanceOf(CLanguage);
  });

  it('registers registries into the server registry provider', async () => {
    const api = new ServerAnimoRankAPI('probe-plugin');
    const registry = new ApiProbeRegistry();
    api.serverRegistryProviderRegistrar.registerRegistry(registry);

    expect(ServerRegistryProvider.instance().getRegistry(ApiProbeRegistry)).toBe(registry);
    expect(api.serverRegistryProvider.getRegistry(ApiProbeRegistry).keys()).toEqual([]);
  });

  it('keeps the server and global slots separate', () => {
    const api = new ServerAnimoRankAPI('probe-plugin');

    expect(() => api.serverRegistryProvider.getRegistry(LanguageRegistry)).toThrow(/ServiceRegistry not found/);
    expect(() => api.globalRegistryProvider.getRegistry(ApiProbeRegistry)).toThrow(/ServiceRegistry not found/);
  });

  it('stamps the plugin id on both registrars', () => {
    const api = new ServerAnimoRankAPI('probe-plugin');

    expect(api.serverRegistryProviderRegistrar.id).toBe('probe-plugin');
    expect(api.globalRegistryProviderRegistrar.id).toBe('probe-plugin');
  });

  it('wires a registry by id, namespacing the keys to the plugin', async () => {
    const api = new ServerAnimoRankAPI('by-id-plugin');

    // The way in for a plugin that cannot name the registry's class.
    const registrar = await api.globalRegistryProviderRegistrar.getRegistrarById<LanguageRegistry>('language');
    expect(registrar.id).toBe('by-id-plugin');
    expect(registrar.pluginId).toBe('by-id-plugin');
    registrar.register('byidlang', MyLanguage);

    const registry = GlobalRegistryProvider.instance().getRegistry(LanguageRegistry);
    expect(registry.keys()).toContain('by-id-plugin:byidlang');
    expect(registry.registeredBy('by-id-plugin:byidlang')).toBe('by-id-plugin');
  });

  it('wires a registry by id in the app’s own namespace when asked to', async () => {
    const api = new ServerAnimoRankAPI('by-id-plugin');

    // An empty namespace registers the key verbatim: definitions the app looks
    // up by plain name (a data type) must not live in the plugin's namespace.
    const registrar = await api.globalRegistryProviderRegistrar.getRegistrarById<LanguageRegistry>('language', '');
    expect(registrar.id).toBe('');
    registrar.register('byidplainlang', MyLanguage);

    const registry = GlobalRegistryProvider.instance().getRegistry(LanguageRegistry);
    expect(registry.keys()).toContain('byidplainlang');
    expect(registry.registeredBy('byidplainlang')).toBe('by-id-plugin');
  });

  it('rejects an id no provider knows', async () => {
    const api = new ServerAnimoRankAPI('probe-plugin');

    await expect(api.globalRegistryProviderRegistrar.getRegistrarById('nowhere')).rejects.toThrow(/not found/);
  });
});

describe('ClientAnimoRankAPI', () => {
  it('registers registries into the client registry provider', () => {
    const api = new ClientAnimoRankAPI('probe-plugin', '/plugins/probe-plugin/');
    const registry = new ClientProbeRegistry();
    api.clientRegistryProviderRegistrar.registerRegistry(registry);

    expect(ClientRegistryProvider.instance().getRegistry(ClientProbeRegistry)).toBe(registry);
    expect(api.clientRegistryProvider.getRegistry(ClientProbeRegistry).keys()).toEqual([]);
  });

  it('exposes the global pair like the server API does', () => {
    const api = new ClientAnimoRankAPI('probe-plugin', '/plugins/probe-plugin/');

    expect(api.globalRegistryProviderRegistrar.id).toBe('probe-plugin');
    expect(api.globalRegistryProvider.getRegistry(LanguageRegistry).keys()).toContain('c');
  });

  it('does not reach server-only registries', () => {
    const api = new ClientAnimoRankAPI('probe-plugin', '/plugins/probe-plugin/');

    expect(ServerRegistryProvider.instance().getRegistry(LoggerRegistry)).toBeInstanceOf(LoggerRegistry);
    expect(() => api.clientRegistryProvider.getRegistry(LoggerRegistry)).toThrow(/ServiceRegistry not found/);
  });
});

/**
 * The base class resolves a plugin's file imports for both sides; the server
 * API is the one that can reach real files here.
 */
describe('AnimoRankAPI.import', () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'plugin-files-'));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('imports a file of the plugin by its path within the plugin', async () => {
    await fs.mkdir(path.join(root, 'lib'));
    // The plugin directory is not a package, so a module it ships is named as one.
    await fs.writeFile(path.join(root, 'lib', 'helper.mjs'), 'export const greeting = "hello from the plugin";\n');
    const api = new ServerAnimoRankAPI('probe-plugin', pathToFileURL(root).href + '/');

    const helper = await api.import<{ greeting: string }>('./lib/helper.mjs');

    expect(helper.greeting).toBe('hello from the plugin');
  });

  it('takes a path without the leading `./`, through the client API too', async () => {
    await fs.writeFile(path.join(root, 'helper.mjs'), 'export const greeting = "hi from the client";\n');
    const api = new ClientAnimoRankAPI('probe-plugin', pathToFileURL(root).href + '/');

    const helper = await api.import<{ greeting: string }>('helper.mjs');

    expect(helper.greeting).toBe('hi from the client');
  });

  it('refuses a path within the plugin when the plugin has no files of its own', async () => {
    // A prebuilt plugin is compiled into the app: its files are not the plugin's to load.
    const api = new ServerAnimoRankAPI('probe-plugin');

    await expect(api.import('lib/helper.mjs')).rejects.toThrow(/statically/);
  });

  it('imports a file the plugin names by an absolute path, without files of its own', async () => {
    await fs.writeFile(path.join(root, 'shared.mjs'), 'export const origin = "a local file";\n');
    // No files URL: the path names its own location, so nothing of the plugin is needed.
    const api = new ServerAnimoRankAPI('probe-plugin');

    const shared = await api.import<{ origin: string }>(path.join(root, 'shared.mjs'));

    expect(shared.origin).toBe('a local file');
  });

  it('imports a file the plugin names by URL, not the plugin’s own', async () => {
    await fs.writeFile(path.join(root, 'shared.mjs'), 'export const origin = "a local file";\n');
    // A files URL that does not exist: a path that names its own location never uses it.
    const api = new ServerAnimoRankAPI('probe-plugin', '/plugin/files/that/do/not/exist/');

    const shared = await api.import<{ origin: string }>(pathToFileURL(path.join(root, 'shared.mjs')).href);

    expect(shared.origin).toBe('a local file');
  });
});
