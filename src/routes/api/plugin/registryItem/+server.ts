import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { providerForDomain } from '../domains';

// Attribution reflects the plugins loaded in this process: runtime state.
export const prerender = false;

/**
 * The plugin that registered one item of a registry:
 * `GET /api/plugin/registryItem?domain=global&registry=<registry id>&id=<key>`.
 * The registry id may be qualified (`plugin:registry-id`) or, when
 * unambiguous, the registry's own id. The key is the one the registry was
 * written with, e.g. `array` for a data type.
 */
export const GET: RequestHandler = async ({ url }) => {
  const domain = url.searchParams.get('domain');
  const registryId = url.searchParams.get('registry');
  const id = url.searchParams.get('id');
  if (!registryId) {
    error(400, 'Missing required query parameter "registry"');
  }
  if (!id) {
    error(400, 'Missing required query parameter "id"');
  }

  const registry = providerForDomain(domain).findRegistry(registryId);
  if (!registry) {
    error(404, `No registry "${registryId}" is registered in the ${domain} domain`);
  }

  const plugin = registry.registeredBy(id);
  if (!plugin) {
    error(404, `No plugin registered "${id}" in registry "${registryId}"`);
  }

  return json({ plugin, domain, registry: registryId, id });
};
