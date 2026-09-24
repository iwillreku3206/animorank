import { prebuiltPluginEntries } from 'virtual:prebuilt-plugin-entries';

/**
 * Where the browser loads a prebuilt plugin's code from: the plugin's client
 * entry and, when it ships one, its shared entry.
 *
 * The URLs are resolved by the app's build (see `scripts/prebuiltPluginEntries.ts`):
 * in dev they are the package's source modules, which the dev server compiles
 * on request; in a build they are chunks of the client build, sharing the app's
 * modules — so a plugin's code stays in the app's module graph, next to the
 * Svelte runtime and the registries it registers into. Either way nothing on
 * the client knows a plugin path.
 */

/** Where the browser loads one prebuilt plugin's code from. */
export interface PrebuiltClientEntries {
  /** URL of the plugin's client entry. */
  client: string;
  /** URL of the plugin's shared entry; runs before the client entry. */
  global?: string;
}

/**
 * Where the browser loads the prebuilt plugin with this id from, or `undefined`
 * when the app ships no such plugin or the plugin has no client entry.
 */
export function prebuiltClientEntries(id: string): PrebuiltClientEntries | undefined {
  return prebuiltPluginEntries[id];
}

/** Every plugin the app's build compiled client entries for, by id. */
export function prebuiltPluginIds(): string[] {
  return Object.keys(prebuiltPluginEntries);
}
