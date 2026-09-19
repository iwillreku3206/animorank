import { Mime } from 'mime';
import standardTypes from 'mime/types/standard.js';
import otherTypes from 'mime/types/other.js';
import type { PluginType } from './loadedPlugin';
import type { PluginManifest } from './manifest';

/** URL prefix of the public route that serves one dynamically loaded plugin and its files (see `src/routes/plugins`). */
export const PLUGIN_ROUTE_PREFIX = '/plugins';

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
