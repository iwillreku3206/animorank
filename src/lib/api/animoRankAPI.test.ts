import { describe, expect, it } from 'vitest';
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
});

describe('ClientAnimoRankAPI', () => {
  it('registers registries into the client registry provider', () => {
    const api = new ClientAnimoRankAPI('probe-plugin');
    const registry = new ClientProbeRegistry();
    api.clientRegistryProviderRegistrar.registerRegistry(registry);

    expect(ClientRegistryProvider.instance().getRegistry(ClientProbeRegistry)).toBe(registry);
    expect(api.clientRegistryProvider.getRegistry(ClientProbeRegistry).keys()).toEqual([]);
  });

  it('exposes the global pair like the server API does', () => {
    const api = new ClientAnimoRankAPI('probe-plugin');

    expect(api.globalRegistryProviderRegistrar.id).toBe('probe-plugin');
    expect(api.globalRegistryProvider.getRegistry(LanguageRegistry).keys()).toContain('c');
  });

  it('does not reach server-only registries', () => {
    const api = new ClientAnimoRankAPI('probe-plugin');

    expect(ServerRegistryProvider.instance().getRegistry(LoggerRegistry)).toBeInstanceOf(LoggerRegistry);
    expect(() => api.clientRegistryProvider.getRegistry(LoggerRegistry)).toThrow(/ServiceRegistry not found/);
  });
});
