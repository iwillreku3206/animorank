/**
 * Where the app's prebuilt plugin packages live, and what their entries are
 * called. Prebuilt plugins ship with the app — unlike the plugins a server
 * offers from its plugin directory at runtime — so each package is a directory
 * under one of these roots holding `manifest.json`, `client.ts`, `server.ts`
 * and an optional `global.ts`.
 *
 * The directories are read at build time: the Vite plugin that compiles the
 * packages' client entries scans them, and the plugin loader's globs mirror
 * them. Nothing on the client needs a plugin path of its own.
 */
export const PREBUILT_PLUGIN_DIRS: readonly string[] = ['src/lib/plugins', 'plugins'];

/** The manifest every plugin package carries. */
export const PREBUILT_MANIFEST_FILE = 'manifest.json';

/** A prebuilt plugin's browser entry, compiled by the app's build. */
export const PREBUILT_CLIENT_ENTRY = 'client.ts';

/** A prebuilt plugin's shared entry; optional, and run before the client entry. */
export const PREBUILT_GLOBAL_ENTRY = 'global.ts';
