import { ServiceRegistry } from '$lib/registry';
import type { ServerAPI } from './serverAPI';

export class ServerAPIRegistry extends ServiceRegistry<ServerAPI, []> {
  public id = 'server_api';

  constructor() {
    super();
  }
}
