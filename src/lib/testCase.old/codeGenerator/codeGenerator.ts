import type { FunctionOutputTestCase } from '$lib/zenstack/models';

export abstract class CodeGenerator {
  public abstract generateTestCode(_testCase: FunctionOutputTestCase): string;
}
