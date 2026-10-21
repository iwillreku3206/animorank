import { ServerPlugin } from '$lib/plugin/serverPlugin';

/** The plugin has no server surface: its contribution is a client-side log view. */
export default class SessionReplayServerPlugin extends ServerPlugin {
  public async init(): Promise<void> {}
}
