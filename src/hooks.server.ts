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
  const registryProvider = ServerRegistryProvider.instance();
  const logger = await registryProvider.getService(Logger, 'webserver');

  // Non-Error throws can be circular or BigInt-containing objects that
  // JSON.stringify itself crashes on — never let the error handler throw.
  let detail: string;
  if (error instanceof Error) {
    detail = error.stack ?? error.message;
  } else {
    try {
      detail = JSON.stringify(error);
    } catch {
      detail = String(error);
    }
  }
  logger.error('CRASH ERROR: ' + detail);

  return { message: 'Internal Error' };
};
