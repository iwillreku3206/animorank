import { Mime } from 'mime';
import standardTypes from 'mime/types/standard.js';
import otherTypes from 'mime/types/other.js';
import type { PluginType } from './loadedPlugin';
import type { PluginManifest } from './manifest';

/** URL prefix of the public route that serves dynamically loaded plugin files (see `src/routes/plugins`). */
export const PLUGIN_ROUTE_PREFIX = '/plugins';

/**
 * Where a plugin's browser code lives: the `client.js` entry at the plugin
 * root, plus a `client/` folder holding every file the browser needs (the
 * plugin's own modules and assets). Everything under `client/` is served
 * as-is, so the entry can import its files by relative path.
 */
export const PLUGIN_CLIENT_ENTRY = 'client.js';

/** Shared entry file, run on both sides before the per-side entry. */
export const PLUGIN_GLOBAL_ENTRY = 'global.js';

/** Prefix of the served client folder. */
export const PLUGIN_CLIENT_FOLDER = 'client/';

/** Client entry file names, in resolution order: prebuilt plugins ship `client.ts`, dynamic ones `client.js`. */
export const PLUGIN_CLIENT_ENTRIES: readonly string[] = ['client.ts', PLUGIN_CLIENT_ENTRY];

/**
 * One plugin as the client sees it before its code is loaded.
 *
 * The manifest always describes the plugin; where its code comes from depends
 * on how the plugin is shipped. A `clientUrl` is served by the plugin route
 * (dynamically loaded plugins, read from disk at runtime); a `modulePath` is
 * imported through Vite, which bundles prebuilt plugins that ship with the app.
 */
export interface PluginClientDescriptor extends PluginManifest {
  /** URL of the plugin's client module, e.g. `/plugins/foo/client.js`. */
  clientUrl?: string;
  /** Module path of the plugin's client entry, e.g. `../../../plugins/foo/client.ts`. */
  modulePath?: string;
  /** URL of the plugin's shared entry; runs before the client entry. */
  globalUrl?: string;
  /** Imports the plugin's shared entry; runs before the client entry. */
  loadGlobal?: () => Promise<unknown>;
}

/** The `GET /plugins` response: the catalog a client-side loader discovers plugins from. */
export interface PluginCatalog {
  plugins: PluginClientDescriptor[];
}

/** The client entry file of a plugin, resolved from the files it ships; `undefined` when it has no client side. */
export function clientEntryOf(files: ReadonlyMap<string, unknown>): string | undefined {
  return PLUGIN_CLIENT_ENTRIES.find((entry) => files.has(entry));
}

/**
 * Whether a plugin file may be served to the browser.
 *
 * A dynamically loaded plugin exposes only its client surface: the `client.js`
 * entry and everything under its `client/` folder. A prebuilt plugin's files
 * already belong to the app's module graph, so nothing in its package is
 * secret — except `manifest.json` and the server entry, which stay unserved.
 */
export function isServablePluginFile(type: PluginType, file: string): boolean {
  if (file.includes('..')) return false;
  if (type === 'dynamic') {
    return file === PLUGIN_CLIENT_ENTRY || file === PLUGIN_GLOBAL_ENTRY || file.startsWith(PLUGIN_CLIENT_FOLDER);
  }
  return file !== 'manifest.json' && !/^server\.(js|ts)$/.test(file);
}

/** URL the browser fetches a dynamically loaded plugin file from. Ids and paths are used verbatim. */
export function pluginFileUrl(id: string, path: string): string {
  return `${PLUGIN_ROUTE_PREFIX}/${id}/${path}`;
}

/**
 * Content types for plugin files. Beyond the standard types, plugin client
 * entries and their modules may be TypeScript sources — the browser runs them
 * as JavaScript, so they are served as such.
 */
const mime = new Mime(standardTypes, otherTypes).define({ 'text/javascript': ['ts'] }, true);

/** Content type for a plugin file, derived from its extension; unknown types are served as bytes. */
export function pluginFileContentType(file: string): string {
  return mime.getType(file) ?? 'application/octet-stream';
}
