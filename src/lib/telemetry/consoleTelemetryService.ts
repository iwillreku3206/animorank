import type { Entry } from "./telemetryHook";
import { TelemetryService } from "./telemetryService";

export class ConsoleTelemetryService extends TelemetryService {
  protected telemetryCallback(entry: Entry): void | Promise<void> {
    console.log(JSON.stringify(entry, null, 2))
  }
}
