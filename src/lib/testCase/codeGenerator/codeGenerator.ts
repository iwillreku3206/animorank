import type { FunctionOutputTestCase } from '$lib/zenstack/models';
import type { TypeWithValue } from '../type';

export abstract class CodeGenerator {
  public abstract generateTestCode(testCase: FunctionOutputTestCase): string;
}
