import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { providerForDomain } from '../domains';

// Attribution reflects the plugins loaded in this process: runtime state.
export const prerender = false;

/**
 * The plugin that registered a registry: `GET /api/plugin/registry?domain=global&id=<registry id>`.
 * The id may be a registry's qualified id (`plugin:registry-id`) or, when
 * unambiguous, the registry's own id (`test_case.function.type`).
 */
export const GET: RequestHandler = async ({ url }) => {
  const domain = url.searchParams.get('domain');
  const id = url.searchParams.get('id');
  if (!id) {
    error(400, 'Missing required query parameter "id"');
  }

  const plugin = providerForDomain(domain).registeredBy(id);
  if (!plugin) {
    error(404, `No registry "${id}" is registered in the ${domain} domain`);
  }

  return json({ plugin, domain, id });
};
