import type { Handle, HandleServerError } from '@sveltejs/kit';
import { handle as authHandle } from '$lib/auth';
import { Logger } from '$lib/logging/logger';
import { ServerServiceProvider } from '$lib/services/serverServiceProvider';

export const handle: Handle = async ({ event, resolve }) => {
  const serviceProvider = ServerServiceProvider.instance();
  const logger = serviceProvider.getService(Logger, 'webserver');

  const response = await authHandle({ event, resolve });

  logger.debug(`${event.request.method} ${event.url.pathname}`);

  return response;
};

export const handleError: HandleServerError = async ({ error }) => {
  const serviceProvider = ServerServiceProvider.instance();
  const logger = serviceProvider.getService(Logger, 'webserver');
  logger.error('CRASH ERROR: ' + (error instanceof Error ? (error.stack ?? error.message) : JSON.stringify(error)));

  return { message: 'Internal Error' };
};
