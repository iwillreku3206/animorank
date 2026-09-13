import type { PluginManifest } from './manifest';
import type { ServerPlugin } from './serverPlugin';

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
 * Its default export is the plugin's {@link ServerPlugin} class, which the
 * loader instantiates and initializes.
 */
export interface PluginServerModule {
  default?: new () => ServerPlugin;
}

export class LoadedPlugin {
  public readonly type: PluginType;
  public readonly manifest: PluginManifest;
  /**
   * Contents of the plugin's browser-facing files — the client entry
   * (`client.js` / `client.ts`) and everything under the plugin's `client/`
   * folder — keyed by the path relative to the plugin root (e.g. `client.js`,
   * `client/helper.js`). The directory structure is preserved so the entry can
   * import its own files by relative path.
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
