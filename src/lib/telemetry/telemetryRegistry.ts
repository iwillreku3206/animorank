import { ServiceRegistry } from "$lib/services/registry"
import { ConsoleTelemetryService } from "./consoleTelemetryService"
import { DummyTelemetryService } from "./dummyTelemetryService"
import type { TelemetryService } from "./telemetryService"

export class TelemetryRegistry extends ServiceRegistry<TelemetryService, []> {
  public constructor() {
    super()

    this.register('console', ConsoleTelemetryService)
    this.register('dummy', DummyTelemetryService)
  }

  public getDefault(): TelemetryService {
    return this.getInstance('console')
  }
}
