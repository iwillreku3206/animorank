import { browser } from '$app/environment';
import type { ClientRegistryDomain, RegistryDomain } from './registryProvider';

/**
 * The registry layer's way into the client plugin system: what a lookup that
 * missed asks for.
 *
 * Plugins load for the domains that live in the browser — the client and
 * global providers — and only there: on the server every plugin of the process
 * is already loaded by the time a registry is looked up (see `hooks.server.ts`),
 * so a registry or an item that is missing really is missing, and the server
 * domain's plugins never run in a browser.
 */

/** Whether a plugin can still provide a lookup in `domain`. */
function canLoadPlugins(domain: RegistryDomain): domain is ClientRegistryDomain {
  return browser && domain !== 'server';
}

/**
 * The app's plugin finder. It is imported on demand because a static import
 * would close a cycle in the module graph — the finder reaches back into the
 * registry layer, since a plugin is initialized with an API over these
 * providers — and because nothing a server lookup touches should pull client
 * plugin code in.
 */
async function clientPluginFinder() {
  const { ClientPluginFinder } = await import('$lib/plugin/clientPluginFinder');
  return ClientPluginFinder.instance();
}

/** Loads the plugin that provides registry `id` in `domain`, when one can still provide it. */
export async function findRegistryPlugin(domain: RegistryDomain, id: string): Promise<void> {
  if (!canLoadPlugins(domain)) return;
  await (await clientPluginFinder()).findRegistryPlugin(domain, id);
}

/** Loads the plugin that registered item `key` of registry `registryId` in `domain`, when the server names one. */
export async function findItemPlugin(domain: RegistryDomain, registryId: string, key: string): Promise<void> {
  if (!canLoadPlugins(domain)) return;
  await (await clientPluginFinder()).findItemPlugin(domain, registryId, key);
}

/** Loads every plugin that writes into registry `registryId` in `domain`. */
export async function findRegistryWriters(domain: RegistryDomain, registryId: string): Promise<void> {
  if (!canLoadPlugins(domain)) return;
  await (await clientPluginFinder()).findRegistryWriters(domain, registryId);
}
