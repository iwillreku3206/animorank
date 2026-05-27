import { TelemetryService } from './telemetryService';

export class DummyTelemetryService extends TelemetryService {
  protected telemetryCallback(): void | Promise<void> {}
}
