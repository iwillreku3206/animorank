import { TelemetryRegistry, TelemetryService } from '$lib/telemetry';
import { RegistryProvider } from './registryProvider';
import { SolveWindowRegistry } from '../../routes/problem/[problem_id]/[session_id]/windowRegistry';
import { ProblemEditorWindowRegistry } from '../../routes/edit/[slug]/windowRegistry';

export class ClientRegistryProvider extends RegistryProvider {
  private static _instance: ClientRegistryProvider | null;

  private constructor() {
    super();
    // Client-runtime registries (never imported by server-only modules).
    this.registerServiceRegistry(TelemetryService, new TelemetryRegistry());
    this.registerRegistry(new SolveWindowRegistry());
    this.registerRegistry(new ProblemEditorWindowRegistry());
  }

  public static instance(): ClientRegistryProvider {
    if (!ClientRegistryProvider._instance) {
      ClientRegistryProvider._instance = new ClientRegistryProvider();
    }
    return ClientRegistryProvider._instance;
  }
}
