import { TestCaseRegistry } from '$lib/testCase/testCaseRegistry';
import { OperatorRegistry } from '$lib/testCase/builtin/functionTestCase/operatorRegistry';
import { TypeRegistry } from '$lib/testCase/builtin/functionTestCase/typeRegistry';
import { EqualOperatorTypeRegistry } from '$lib/testCase/builtin/functionTestCase/operators/equal/registry';
import { NotEqualOperatorTypeRegistry } from '$lib/testCase/builtin/functionTestCase/operators/not_equal/registry';
import { GreaterThanOperatorTypeRegistry } from '$lib/testCase/builtin/functionTestCase/operators/greater_than/registry';
import { GreaterThanEqualOperatorTypeRegistry } from '$lib/testCase/builtin/functionTestCase/operators/greater_than_equal/registry';
import { LessThanOperatorTypeRegistry } from '$lib/testCase/builtin/functionTestCase/operators/less_than/registry';
import { LessThanEqualOperatorTypeRegistry } from '$lib/testCase/builtin/functionTestCase/operators/less_than_equal/registry';
import { WithinRangeOperatorTypeRegistry } from '$lib/testCase/builtin/functionTestCase/operators/within_range/registry';
import { RegistryProvider } from './registryProvider';
import { ConfigSectionRegistry } from '$lib/config/registry';
import { LanguageRegistry } from '$lib/language/languageRegistry';

export class GlobalRegistryProvider extends RegistryProvider {
  private static _instance: GlobalRegistryProvider | null;

  private constructor() {
    super();
    // Shared/builtin registries reachable from client components and server code.
    this.registerRegistry(new TestCaseRegistry());
    this.registerRegistry(new OperatorRegistry());
    this.registerRegistry(new TypeRegistry());
    this.registerRegistry(new EqualOperatorTypeRegistry());
    this.registerRegistry(new NotEqualOperatorTypeRegistry());
    this.registerRegistry(new GreaterThanOperatorTypeRegistry());
    this.registerRegistry(new GreaterThanEqualOperatorTypeRegistry());
    this.registerRegistry(new LessThanOperatorTypeRegistry());
    this.registerRegistry(new LessThanEqualOperatorTypeRegistry());
    this.registerRegistry(new WithinRangeOperatorTypeRegistry());
    this.registerRegistry(new ConfigSectionRegistry());
    this.registerRegistry(new LanguageRegistry());
  }

  public static instance(): GlobalRegistryProvider {
    if (!GlobalRegistryProvider._instance) {
      GlobalRegistryProvider._instance = new GlobalRegistryProvider();
    }
    return GlobalRegistryProvider._instance;
  }
}
