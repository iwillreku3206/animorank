import type { FastifyPluginCallback } from 'fastify';
import { describe, expect, it } from 'vitest';
import { RegistryProviderRegistrar } from '$lib/registry/registryProviderRegistrar';
import { ServerRegistryProvider } from '$lib/registry/server';
import { Server } from '$lib/server';
import { ServerAPIRegistry } from '$lib/server/registry';
import { ServerAPI } from '$lib/server/serverAPI';

/**
 * An API whose routes cannot be registered at all: the app has to report it
 * while it is prepared, rather than serve a scope whose every request fails.
 */
class BrokenAPI extends ServerAPI {
  public async fastifyPlugin(): Promise<FastifyPluginCallback> {
    return async () => {
      throw new Error('broken plugin registration');
    };
  }
}

describe('Server.prepareApp', () => {
  it('rejects when a registered API cannot build its routes', async () => {
    new RegistryProviderRegistrar(ServerRegistryProvider.instance(), 'broken-plugin')
      .getRegistrar(ServerAPIRegistry, '')
      .registerSingleton('broken-plugin', new BrokenAPI());

    await expect(new Server().prepareApp()).rejects.toThrow('broken plugin registration');
  });
});
