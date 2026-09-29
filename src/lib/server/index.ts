import { FastifyLoggerAdapter } from '$lib/logging/fastify';
import { LoggerRegistry } from '$lib/logging/loggerRegistry';
import { ServerRegistryProvider } from '$lib/registry/server';
import { ServerAPIRegistry } from '$lib/server/registry';
import Fastify, { type FastifyInstance } from 'fastify';
import type { IncomingMessage, Server as HttpServer, ServerResponse } from 'node:http';

/** The path prefix every plugin API is mounted under; the bridge matches requests against it. */
export const PLUGIN_API_PREFIX = '/plugin-api';

/**
 * The app {@link Server.prepareApp} builds: the Fastify instance the plugin
 * APIs are mounted on, logging through an AnimoRank {@link LoggerRegistry}
 * logger.
 *
 * It is ready when it is handed out: every plugin's routes are registered on
 * it, so a plugin whose routes cannot be registered fails whoever prepares the
 * app rather than every request the app would have served.
 */
export type ServerApp = FastifyInstance<HttpServer, IncomingMessage, ServerResponse, FastifyLoggerAdapter>;

export class Server {
  public async prepareApp(): Promise<ServerApp> {
    const srp = ServerRegistryProvider.instance();
    const loggerRegistry = srp.getRegistry(LoggerRegistry);
    const logger = await loggerRegistry.getDefault('fastify_server');

    const app = Fastify({
      loggerInstance: new FastifyLoggerAdapter(logger)
    });

    const serverApiRegistry = srp.getRegistry(ServerAPIRegistry);
    for (const key of await serverApiRegistry.loadKeys()) {
      const api = await serverApiRegistry.getInstance(key);
      const plugin = serverApiRegistry.registeredBy(key);
      app.register(await api.fastifyPlugin(), { prefix: `${PLUGIN_API_PREFIX}/${plugin}`, logLevel: 'debug' });
    }

    // Fastify registers plugins asynchronously: without this, a plugin whose
    // routes cannot be registered would report the failure on the first
    // request it serves instead of here.
    await app.ready();

    return app;
  }
}
