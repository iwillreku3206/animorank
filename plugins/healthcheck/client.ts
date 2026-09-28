import { ClientPlugin } from '$lib/plugin/clientPlugin';

/**
 * The plugin's browser entry: this plugin has no client side — its whole
 * surface is its server route — but a prebuilt package carries a client entry
 * by contract, since the app's build compiles it and the loader expects one
 * beside `server.ts` (see `collectPrebuiltPluginDescriptors`).
 */
export default class HealthcheckClientPlugin extends ClientPlugin {
  public async init(): Promise<void> {}
}
