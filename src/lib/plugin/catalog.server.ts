import { Mime } from 'mime';
import standardTypes from 'mime/types/standard.js';
import otherTypes from 'mime/types/other.js';
import { PLUGIN_ROUTE_PREFIX } from './catalog';
import type { PluginType } from './loadedPlugin';

/**
 * Where a dynamically loaded plugin's browser code lives: the `client.js`
 * entry at the plugin root, plus a `client/` folder holding every file the
 * browser needs (the plugin's own modules and assets). Everything under
 * `client/` is served as-is, so the entry can import its files by relative
 * path.
 */
export const PLUGIN_CLIENT_ENTRY = 'client.js';

/** Shared entry file, run on both sides before the per-side entry. */
export const PLUGIN_GLOBAL_ENTRY = 'global.js';

/** Prefix of the served client folder. */
const PLUGIN_CLIENT_FOLDER = 'client/';

/**
 * Whether a plugin file may be served to the browser.
 *
 * A dynamically loaded plugin exposes only its client surface: the `client.js`
 * entry and everything under its `client/` folder. A prebuilt plugin exposes
 * nothing: its code is part of the app's own client build, so it ships no file
 * for this route to serve.
 */
export function isServablePluginFile(type: PluginType, file: string): boolean {
  if (file.includes('..')) return false;
  if (type === 'dynamic') {
    return file === PLUGIN_CLIENT_ENTRY || file === PLUGIN_GLOBAL_ENTRY || file.startsWith(PLUGIN_CLIENT_FOLDER);
  }
  // A prebuilt plugin ships with the app: its entries are chunks of the app's
  // own client build (see `prebuiltClientEntries`), so no path under this route
  // belongs to it. Serving nothing is also what keeps its TypeScript sources
  // off the wire.
  return false;
}

/** URL the browser fetches a dynamically loaded plugin file from. Ids and paths are used verbatim. */
export function pluginFileUrl(id: string, path: string): string {
  return `${PLUGIN_ROUTE_PREFIX}/${id}/${path}`;
}

/**
 * Content types for plugin files. Beyond the standard types, plugin client
 * entries and their modules may be TypeScript sources — the browser runs them
 * as JavaScript, so they are served as such.
 *
 * The MIME instance lives here rather than in `catalog.ts` because its tables
 * are ~170 kB and only the plugin-file route ever asks for a content type.
 * `catalog.ts` is imported by the browser (see `plugin/clientLoader.ts`); this
 * module cannot be, so the tables stay out of the client bundle.
 */
const mime = new Mime(standardTypes, otherTypes).define({ 'text/javascript': ['ts'] }, true);

/** Content type for a plugin file, derived from its extension; unknown types are served as bytes. */
export function pluginFileContentType(file: string): string {
  return mime.getType(file) ?? 'application/octet-stream';
}
