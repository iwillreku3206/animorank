import { TestCaseRegistry } from '$lib/testCase/testCaseRegistry';
import { OperatorRegistry } from '$lib/testCase/builtin/functionTestCase/operatorRegistry';
import { TypeRegistry } from '$lib/testCase/builtin/functionTestCase/typeRegistry';
import { RegistryProvider } from './registryProvider';
import { ConfigSectionRegistry } from '$lib/config/registry';

export class GlobalRegistryProvider extends RegistryProvider {
  private static _instance: GlobalRegistryProvider | null;

  private constructor() {
    super();
    // Import any service registries here
    this._registries.set(TestCaseRegistry, new TestCaseRegistry());
    this._registries.set(OperatorRegistry, new OperatorRegistry());
    this._registries.set(TypeRegistry, new TypeRegistry());
    this._registries.set(ConfigSectionRegistry, new ConfigSectionRegistry());
  }

  public static instance(): GlobalRegistryProvider {
    if (!GlobalRegistryProvider._instance) {
      GlobalRegistryProvider._instance = new GlobalRegistryProvider();
    }
    return GlobalRegistryProvider._instance;
  }
}
