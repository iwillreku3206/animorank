import type { Handle, HandleServerError } from '@sveltejs/kit';
import { handle as authHandle } from '$lib/auth';
import { Logger } from '$lib/logging/logger';
import { ServerRegistryProvider } from '$lib/registry/server';

export const handle: Handle = async ({ event, resolve }) => {
  const serviceProvider = ServerRegistryProvider.instance();
  const logger = serviceProvider.getService(Logger, 'webserver');

  const response = await authHandle({ event, resolve });

  logger.debug(`${event.request.method} ${event.url.pathname}`);

  return response;
};

export const handleError: HandleServerError = async ({ error }) => {
  const serviceProvider = ServerRegistryProvider.instance();
  const logger = serviceProvider.getService(Logger, 'webserver');

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
