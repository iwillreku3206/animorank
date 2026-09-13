import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { providerForDomain } from '../domains';

// Attribution reflects the plugins loaded in this process: runtime state.
export const prerender = false;

/**
 * Every plugin that writes into a registry:
 * `GET /api/plugin/registryWriters?domain=global&registry=<registry id>`.
 * A client uses this to load a registry's contributors before enumerating it.
 * The registry id may be qualified (`plugin:registry-id`) or, when
 * unambiguous, the registry's own id.
 */
export const GET: RequestHandler = async ({ url }) => {
  const domain = url.searchParams.get('domain');
  const registryId = url.searchParams.get('registry');
  if (!registryId) {
    error(400, 'Missing required query parameter "registry"');
  }

  const registry = providerForDomain(domain).findRegistry(registryId);
  if (!registry) {
    error(404, `No registry "${registryId}" is registered in the ${domain} domain`);
  }

  return json({ domain, registry: registryId, plugins: registry.writers() });
};
