import type { Entry } from './telemetryHook';
import { TelemetryService } from './telemetryService';

export class DummyTelemetryService extends TelemetryService {
  protected telemetryCallback(_entry: Entry): void | Promise<void> {}
}
