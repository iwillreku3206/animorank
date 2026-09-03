import { ServiceRegistry } from '$lib/registry';
import { ConsoleTelemetryService } from './consoleTelemetryService';
import { DummyTelemetryService } from './dummyTelemetryService';
import type { TelemetryService } from './telemetryService';

export class TelemetryRegistry extends ServiceRegistry<TelemetryService, []> {
  public id = 'telemetry';

  public constructor() {
    super();

    this.register('console', ConsoleTelemetryService);
    this.register('dummy', DummyTelemetryService);
  }

  public async getDefault(): Promise<TelemetryService> {
    return this.getInstance('console');
  }
}
