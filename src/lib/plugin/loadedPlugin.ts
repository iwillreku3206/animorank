import type { PluginManifest } from './manifest';
import type { ServerPlugin } from './plugin';

/**
 * How a plugin is made available to the app:
 * - `prebuilt`: source lives with the app and is wired in at compile time via
 *   static import paths / glob imports (Vite HMR-capable).
 * - `dynamic`: loaded at runtime from a plugin directory on disk.
 */
export type PluginType = 'prebuilt' | 'dynamic';

/**
 * The eagerly imported module namespace of a plugin's server entry
 * (`server.js` for dynamic plugins, `server.ts` for prebuilt plugins).
 * Its default export is expected to be (or conform to) the plugin's
 * {@link ServerPlugin}.
 */
export interface PluginServerModule {
  default?: ServerPlugin;
}

export class LoadedPlugin {
  public readonly type: PluginType;
  public readonly manifest: PluginManifest;
  /**
   * Contents of the plugin's web-facing files — the client entry and every
   * static asset — keyed by the path relative to the plugin root
   * (e.g. `client.js`, `static/other.js`). The directory structure is
   * preserved so the client entry can use relative imports such as
   * `./static/other.js` that resolve through this map.
   */
  public readonly files: Map<string, Buffer>;
  /** Module namespace of the eagerly imported server entry. */
  public readonly server: PluginServerModule;

  public constructor(
    type: PluginType,
    manifest: PluginManifest,
    files: Map<string, Buffer>,
    server: PluginServerModule
  ) {
    this.type = type;
    this.manifest = manifest;
    this.files = files;
    this.server = server;
  }
}
