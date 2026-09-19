import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, ResolvedConfig, Rollup } from 'vite';
import {
  PREBUILT_CLIENT_ENTRY,
  PREBUILT_GLOBAL_ENTRY,
  PREBUILT_MANIFEST_FILE,
  PREBUILT_PLUGIN_DIRS
} from '../src/lib/plugin/prebuiltPlugins';

/** Module id the server imports the browser entry URLs from; see {@link prebuiltPluginEntries}. */
const PREBUILT_ENTRIES_ID = 'virtual:prebuilt-plugin-entries';
const RESOLVED_ENTRIES_ID = '\0' + PREBUILT_ENTRIES_ID;

/**
 * SvelteKit's default app directory. The compiled entries are emitted inside
 * it, under the same prefix the client build gives every other entry; the
 * build fails loudly when a config moves that prefix, rather than serving
 * URLs that point nowhere.
 */
const APP_DIR = '_app';

/** Directory the compiled entries are emitted to, inside the app's immutable assets. */
const CHUNK_DIR = 'plugins';

/**
 * The id of the build in progress. Both builds of a `vite build` run in one
 * process but resolve the config separately, so the client build names the
 * emitted chunks after this id and the server build bakes the same names into
 * the URLs it serves. A new run gets a new id, so a browser never serves a
 * chunk of an earlier deployment out of its cache.
 */
const BUILD_ID = (process.env.ANIMORANK_BUILD_ID ??= Date.now().toString(36));

/** One prebuilt plugin package: the id its manifest declares, and the entries it ships. */
interface PrebuiltPackage {
  id: string;
  client: string;
  global?: string;
}

/** The entries of one plugin as the browser loads them: URL paths, without the app's asset base. */
interface PrebuiltEntries {
  client: string;
  global?: string;
}

/** The chunk name of one entry; `[name]` of the client build's entry file pattern. */
function chunkName(id: string, entry: 'client' | 'global'): string {
  return `${CHUNK_DIR}/${id}-${entry}`;
}

/** The id a package directory declares, or `undefined` when it is not a plugin package. */
function packageId(dir: string): string | undefined {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, PREBUILT_MANIFEST_FILE), 'utf8')) as { id?: unknown };
    return typeof manifest.id === 'string' && manifest.id ? manifest.id : undefined;
  } catch {
    // No manifest, or one that does not parse: not a plugin package.
    return undefined;
  }
}

/** Every prebuilt plugin package under one root; a root that does not exist holds none. */
function packagesIn(root: string): PrebuiltPackage[] {
  let dirents: fs.Dirent[];
  try {
    dirents = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }

  const packages: PrebuiltPackage[] = [];
  for (const dirent of dirents) {
    if (!dirent.isDirectory()) continue;
    const dir = path.join(root, dirent.name);
    const id = packageId(dir);
    const client = path.join(dir, PREBUILT_CLIENT_ENTRY);
    if (!id || !fs.existsSync(client)) continue;
    const global = path.join(dir, PREBUILT_GLOBAL_ENTRY);
    packages.push({ id, client, global: fs.existsSync(global) ? global : undefined });
  }
  return packages;
}

/**
 * Compiles the client entries of the app's prebuilt plugins and tells the server
 * where they went, so the plugin route can serve a descriptor for a prebuilt
 * plugin exactly like it serves one for a dynamically loaded plugin.
 *
 * In a build each entry becomes a chunk of the client build, importing the same
 * shared chunks the app does — so a plugin's code stays part of the app's
 * module graph, sharing its Svelte runtime and the registry singletons it
 * registers into. The chunks are named per build rather than per content, which
 * is what lets the server know their URLs before the build that emits them
 * runs, and is safe because a rebuild always changes them. In dev the entries
 * are the packages' own source modules, which the dev server compiles on
 * request.
 */
export function prebuiltPluginEntries(): Plugin {
  const packages = PREBUILT_PLUGIN_DIRS.flatMap((dir) => packagesIn(path.resolve(dir)));

  let config: ResolvedConfig;
  let emitting = false;
  /** The client build's chunk file pattern, read from the config the build was given. */
  let chunkPattern: string | undefined;

  /** Where the browser loads each plugin's entries from, as URL paths. */
  function entries(): Record<string, PrebuiltEntries> {
    // SvelteKit's asset base: a CDN URL or base path when configured, and "." or
    // "/" when the app is served from the root — where an absolute URL is just
    // the path. The descriptor hands the browser absolute URLs, never ones
    // relative to whatever page happens to ask.
    const configured = config.base.replace(/\/$/, '');
    const base = configured === '' || configured === '.' ? '' : configured;
    const merged: Record<string, PrebuiltEntries> = {};
    for (const { id, client, global } of packages) {
      merged[id] = {
        client: base + urlOf(id, 'client', client),
        global: global ? base + urlOf(id, 'global', global) : undefined
      };
    }
    return merged;
  }

  /** The URL path of one entry: its source module in dev, its emitted chunk in a build. */
  function urlOf(id: string, entry: 'client' | 'global', file: string): string {
    if (config.command === 'serve') {
      return `/${path.relative(config.root, file).split(path.sep).join('/')}`;
    }
    return `/${APP_DIR}/immutable/${chunkName(id, entry)}.${BUILD_ID}.js`;
  }

  return {
    name: 'animorank:prebuilt-plugin-entries',

    config(userConfig, env) {
      // Only the client build emits the entries: the server build reads their
      // URLs, and the dev server serves the packages' source modules.
      if (env.command !== 'build' || userConfig.build?.ssr) return;

      const output = userConfig.build?.rollupOptions?.output;
      if (!output || Array.isArray(output)) return;
      // The entries are emitted chunks, which the build names with its chunk
      // pattern rather than its entry pattern; the emitted names carry the
      // build's id instead of a content hash, so their URLs are known before
      // the build that emits them runs.
      const pattern = output.chunkFileNames;
      if (typeof pattern !== 'string') return;

      chunkPattern = pattern;
      const naming: NonNullable<Rollup.OutputOptions['chunkFileNames']> = (chunk) =>
        chunk.name.startsWith(`${CHUNK_DIR}/`) ? `${APP_DIR}/immutable/${chunk.name}.${BUILD_ID}.js` : pattern;
      output.chunkFileNames = naming;
      emitting = true;
    },

    configResolved(resolved) {
      config = resolved;
    },

    resolveId(id) {
      if (id === PREBUILT_ENTRIES_ID) return RESOLVED_ENTRIES_ID;
    },

    load(id) {
      if (id !== RESOLVED_ENTRIES_ID) return;
      return `export const prebuiltPluginEntries = ${JSON.stringify(entries())};`;
    },

    buildStart() {
      if (!emitting) return;
      const expected = `${APP_DIR}/immutable/chunks/[hash].js`;
      if (!chunkPattern?.startsWith(`${APP_DIR}/immutable/`)) {
        this.error(
          `cannot name the prebuilt plugin chunks: expected chunk files at "${expected}", got "${chunkPattern}"`
        );
      }

      for (const { id, client, global } of packages) {
        this.emitFile({ type: 'chunk', id: client, name: chunkName(id, 'client') });
        if (global) {
          this.emitFile({ type: 'chunk', id: global, name: chunkName(id, 'global') });
        }
      }
    }
  };
}
