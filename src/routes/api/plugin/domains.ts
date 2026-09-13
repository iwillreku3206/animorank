import { error } from '@sveltejs/kit';
import { ClientRegistryProvider } from '$lib/registry/client';
import { GlobalRegistryProvider } from '$lib/registry/global';
import { ServerRegistryProvider } from '$lib/registry/server';
import type { RegistryProvider } from '$lib/registry/registryProvider';

/** The registry providers a plugin can register into, as the attribution routes name them. */
export type RegistryDomain = 'client' | 'global' | 'server';

const PROVIDERS: Record<string, () => RegistryProvider> = {
  client: () => ClientRegistryProvider.instance(),
  global: () => GlobalRegistryProvider.instance(),
  server: () => ServerRegistryProvider.instance()
};

/** The provider a domain query parameter names; a 400 when it is missing or unknown. */
export function providerForDomain(domain: string | null): RegistryProvider {
  const provider = domain ? PROVIDERS[domain] : undefined;
  if (!provider) {
    error(400, `Unknown domain "${domain ?? ''}"; expected one of ${Object.keys(PROVIDERS).join(', ')}`);
  }
  return provider();
}
