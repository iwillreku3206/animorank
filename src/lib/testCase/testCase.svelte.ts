import { type ProblemTestCase as TestCaseModel } from '$lib/zenstack/models';
import type { JsonValue } from '@zenstackhq/orm';
import { toJsonValue, type IntoJsonValue } from '$lib/types/utils';
import type { TestCaseDisplay, TestCaseEditor } from './types';
import type { Problem } from '$lib/problem';

export abstract class TestCase<
  // Not specifying a generic means that we do not really care specifically about the inner value of the type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Data extends IntoJsonValue = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RunInfo extends IntoJsonValue = any
> {
  /**
   * @description The inner database model of the test case.
   */
  public model: TestCaseModel = $state() as TestCaseModel;

  /**
   * @description The problem of the test case
   */
  public problem: Problem;

  set data(data: Data) {
    this.model.data = toJsonValue(data) as JsonValue;
  }

  get data(): Data {
    return this.model.data as Data;
  }

  constructor(model: TestCaseModel, problem: Problem, data?: Data) {
    this.model = model;
    if (data) this.data = data;
    this.problem = problem;
  }

  abstract get editor(): TestCaseEditor;
  abstract get display(): TestCaseDisplay<RunInfo>;
}
