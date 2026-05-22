import { TelemetryRegistry } from '$lib/telemetry/telemetryRegistry';
import { TelemetryService } from '$lib/telemetry/telemetryService';
import { ServiceProvider } from './serviceProvider';

export class ClientServiceProvider extends ServiceProvider {
  private static _instance: ClientServiceProvider | null;

  private constructor() {
    super();
    // Import any service registries here
    this._registries.set(TelemetryService, new TelemetryRegistry());
  }

  public static instance(): ClientServiceProvider {
    if (!ClientServiceProvider._instance) {
      ClientServiceProvider._instance = new ClientServiceProvider();
    }
    return ClientServiceProvider._instance;
  }
}
