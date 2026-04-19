import type { Handle } from '@sveltejs/kit';
import { handle as authHandle } from '$lib/auth';
import { ServiceProvider } from '$lib/services/serviceProvider';
import { Logger } from '$lib/logging/logger';

export const handle: Handle = async ({ event, resolve }) => {
  const serviceProvider = ServiceProvider.instance()
  const logger = serviceProvider.getService(Logger, "webserver")

  const response = await authHandle({ event, resolve });

  logger.debug(`${event.request.method} ${event.url.pathname}`)

  return response;
};
