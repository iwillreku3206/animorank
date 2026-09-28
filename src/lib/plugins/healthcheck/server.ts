import type { ServerAnimoRankAPI } from '$lib/api/server';
import { ServerPlugin } from '$lib/plugin/serverPlugin';
import { ServerAPIRegistry } from '$lib/server/registry';
import { ServerAPI } from '$lib/server/serverAPI';
import type { FastifyPluginCallback } from 'fastify';

/**
 * The plugin's HTTP surface: one route, declared inside the scope the app
 * mounts under `/plugin-api/healthcheck` (the plugin's id). The app therefore
 * serves it at `/plugin-api/healthcheck/healthcheck`.
 */
class HealthcheckAPI extends ServerAPI {
  public async fastifyPlugin(): Promise<FastifyPluginCallback> {
    return (app) => {
      app.get('/healthcheck', async (_request, reply) => reply.type('text/plain').send('OK'));
    };
  }
}

/**
 * A sample server plugin: it registers one HTTP API and nothing else, the
 * whole shape of a plugin whose only surface is its routes.
 */
export default class HealthcheckServerPlugin extends ServerPlugin {
  public async init(api: ServerAnimoRankAPI): Promise<void> {
    // Registered under the plugin's own namespace, as every plugin registration
    // is: the app mounts an API under the id that registered it, so two plugins
    // can each declare a `/healthcheck` route without colliding.
    api.serverRegistryProviderRegistrar.getRegistrar(ServerAPIRegistry).register('healthcheck', HealthcheckAPI);
  }
}
