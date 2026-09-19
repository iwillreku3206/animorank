import { error } from '@sveltejs/kit';
import type { RegistryDomain, RegistryProvider } from '$lib/registry/registryProvider';
import { ClientRegistryProvider } from '$lib/registry/client';
import { GlobalRegistryProvider } from '$lib/registry/global';
import { ServerRegistryProvider } from '$lib/registry/server';

const PROVIDERS: Record<RegistryDomain, () => RegistryProvider> = {
  client: () => ClientRegistryProvider.instance(),
  global: () => GlobalRegistryProvider.instance(),
  server: () => ServerRegistryProvider.instance()
};

/** The provider a domain query parameter names; a 400 when it is missing or unknown. */
export function providerForDomain(domain: string | null): RegistryProvider {
  const provider = domain ? PROVIDERS[domain as RegistryDomain] : undefined;
  if (!provider) {
    error(400, `Unknown domain "${domain ?? ''}"; expected one of ${Object.keys(PROVIDERS).join(', ')}`);
  }
  return provider();
}
