import type { ServerAnimoRankAPI } from '$lib/api/server';

/**
 * A plugin's server entry point. The server-side plugin loader instantiates
 * the default export of the plugin's server module and initializes it with an
 * API bound to the plugin's manifest id.
 */
export abstract class ServerPlugin {
  public abstract init(_api: ServerAnimoRankAPI): Promise<void>;
}
