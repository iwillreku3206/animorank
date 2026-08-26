import { TelemetryRegistry, TelemetryService } from '$lib/telemetry';
import { RegistryProvider } from './registryProvider';

export class ClientRegistryProvider extends RegistryProvider {
  private static _instance: ClientRegistryProvider | null;

  private constructor() {
    super();
    // Import any service registries here
    this._registries.set(TelemetryService, new TelemetryRegistry());
  }

  public static instance(): ClientRegistryProvider {
    if (!ClientRegistryProvider._instance) {
      ClientRegistryProvider._instance = new ClientRegistryProvider();
    }
    return ClientRegistryProvider._instance;
  }
}
