import { error, type RequestEvent } from '@sveltejs/kit';
import type { ClientRegistryDomain, RegistryProvider } from '$lib/registry/registryProvider';
import { ClientRegistryProvider } from '$lib/registry/client';
import { GlobalRegistryProvider } from '$lib/registry/global';

/**
 * The domains a plugin-API query may name: the ones served in the browser,
 * which is where a registry lookup can still be satisfied. The server domain
 * has a provider of its own, but these endpoints do not serve it — its
 * registries are the server's runtime state, and nothing in the app asks for
 * them over HTTP yet. Serving it later means adding it here, next to the
 * provider that would answer for it.
 */
const SERVED_DOMAINS: Record<ClientRegistryDomain, () => RegistryProvider> = {
  client: () => ClientRegistryProvider.instance(),
  global: () => GlobalRegistryProvider.instance()
};

/**
 * The provider a plugin-API query names, and the domain it named.
 *
 * The endpoints describe the app's plugin topology, so they sit behind the
 * session like every other API route: a caller who is not signed in is told so
 * (403) rather than answered. A domain that is not one of
 * {@link SERVED_DOMAINS} is a 400 — including `server`, which is deliberately
 * not served yet.
 */
export async function providerForDomain(
  event: RequestEvent
): Promise<{ domain: ClientRegistryDomain; provider: RegistryProvider }> {
  const session = await event.locals.auth();
  if (!session?.user.id) {
    error(403, 'Unauthorized');
  }

  const domain = event.url.searchParams.get('domain');
  const provider = domain ? SERVED_DOMAINS[domain as ClientRegistryDomain] : undefined;
  if (!provider) {
    error(400, `Unknown domain "${domain ?? ''}"; expected one of ${Object.keys(SERVED_DOMAINS).join(', ')}`);
  }

  return { domain: domain as ClientRegistryDomain, provider: provider() };
}
