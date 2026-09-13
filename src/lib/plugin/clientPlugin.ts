import type { ClientAnimoRankAPI } from '$lib/api/client';

/**
 * A plugin's browser entry point. The client-side plugin loader instantiates
 * the default export of the plugin's client module and initializes it with an
 * API bound to the plugin's manifest id.
 */
export abstract class ClientPlugin {
  public abstract init(_api: ClientAnimoRankAPI): Promise<void>;
}
