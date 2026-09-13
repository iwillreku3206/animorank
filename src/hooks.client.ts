import type { ClientInit } from '@sveltejs/kit';
import { ClientRegistryProvider } from '$lib/registry/client';
import { GlobalRegistryProvider } from '$lib/registry/global';
import { enableClientLazyPluginLoading } from '$lib/plugin/clientLazy';

// The browser loads a plugin the first time something it registers is
// requested; the server loads its plugins at startup instead (see
// `hooks.server.ts`).
export const init: ClientInit = () => {
  enableClientLazyPluginLoading([
    { provider: GlobalRegistryProvider.instance(), domain: 'global' },
    { provider: ClientRegistryProvider.instance(), domain: 'client' }
  ]);
};
