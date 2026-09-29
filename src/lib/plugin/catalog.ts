import type { PluginManifest } from './manifest';

/** URL prefix of the public route that serves one dynamically loaded plugin and its files (see `src/routes/plugins`). */
export const PLUGIN_ROUTE_PREFIX = '/plugins';

/**
 * The server's half of this contract — which files are servable, where they are
 * fetched from, and their content types — lives in `./catalog.server`, which a
 * browser bundle cannot import.
 */

/**
 * One plugin as the client sees it before its code is loaded: what the plugin
 * is, and the files the browser runs for it. The URLs are whatever serves the
 * plugin's code — the plugin route for a dynamically loaded plugin, the app's
 * client build for a prebuilt one — so the client never needs a path of its own.
 */
export interface PluginClientDescriptor extends PluginManifest {
  /** URL of the plugin's client module, e.g. `/plugins/foo/client.js`. */
  clientUrl: string;
  /** URL of the plugin's shared entry; runs before the client entry. */
  globalUrl?: string;
}
