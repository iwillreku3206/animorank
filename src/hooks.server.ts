import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit';
import { building } from '$app/environment';
import { handle as authHandle } from '$lib/auth';
import { Logger } from '$lib/logging/logger';
import { ServerRegistryProvider } from '$lib/registry/server';
import { ServerPluginService } from '$lib/plugin/serverPluginService';

/**
 * Load every plugin when the server starts, so no request waits on plugin
 * loading. The browser loads plugins lazily instead, when a lookup misses a
 * registry or one of its items (see `src/lib/registry/clientPlugins.ts`).
 */
export const init: ServerInit = async () => {
  // This hook runs while a build prerenders too; plugins are runtime state, and
  // the configured plugin folder need not exist at build time.
  if (building) return;

  try {
    await ServerPluginService.instance().getLoader();
  } catch (error) {
    // A broken plugin setup must not keep the server from starting: the service
    // reports the failure again to whoever needs plugins.
    const logger = await ServerRegistryProvider.instance().getService(Logger, 'webserver');
    logger.error(`Failed to load plugins: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const handle: Handle = async ({ event, resolve }) => {
  const registryProvider = ServerRegistryProvider.instance();
  const logger = await registryProvider.getService(Logger, 'webserver');

  const response = await authHandle({ event, resolve });

  logger.debug(`${event.request.method} ${event.url.pathname}`);

  return response;
};

export const handleError: HandleServerError = async ({ error }) => {
  // Reporting a crash must not itself be able to crash: the logger is reached
  // through the registry provider, and anything that goes wrong on the way —
  // a registry that is missing, a logger that throws while writing — falls back
  // to the console, which needs nothing of the app to work.
  try {
    const registryProvider = ServerRegistryProvider.instance();
    const logger = await registryProvider.getService(Logger, 'webserver');

    logger.error('CRASH ERROR: ' + crashDetail(error));
  } catch (loggingError) {
    console.error('CRASH ERROR (could not be logged):', error, loggingError);
  }

  return { message: 'Internal Error' };
};

/** A crash's detail, built without assuming anything about what was thrown. */
function crashDetail(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message;
  // Non-Error throws can be circular or BigInt-containing objects that
  // JSON.stringify itself crashes on — never let the error handler throw.
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
