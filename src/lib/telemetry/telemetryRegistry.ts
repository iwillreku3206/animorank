import { ServiceRegistry } from '$lib/registry';
import { ConsoleTelemetryService } from './consoleTelemetryService';
import { DummyTelemetryService } from './dummyTelemetryService';
import { SessionHistoryTelemetryService } from './sessionHistoryTelemetryService';
import type { TelemetryService } from './telemetryService';

export class TelemetryRegistry extends ServiceRegistry<TelemetryService, [sessionId: string]> {
  public id = 'telemetry';

  public constructor() {
    super();

    this.register('sessionHistory', SessionHistoryTelemetryService);
    this.register('console', ConsoleTelemetryService);
    this.register('dummy', DummyTelemetryService);
  }

  public getDefault(sessionId: string): Promise<TelemetryService> {
    return this.getInstance('sessionHistory', sessionId);
  }
}
