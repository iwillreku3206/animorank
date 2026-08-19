import { type ProblemTestCase as TestCaseModel } from '$lib/zenstack/models';
import type { JsonValue } from '@zenstackhq/orm';
import type { IntoJsonValue } from '$lib/types/utils';
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

  /**
   * @description The hydrated test case data, backed by class instances (e.g.
   * TypeValue). Stored as-is so state can be mutated directly; convert with
   * `toJsonValue` at serialization boundaries (load functions, saves).
   */
  set data(data: Data) {
    this.model.data = data as JsonValue;
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

  /**
   * Convert a raw runInfo (as received over the wire) into display-ready form,
   * e.g. re-hydrating class-backed values. Called at the API boundary, outside
   * reactive contexts, so implementations may construct `$state`-backed
   * objects freely.
   */
  public hydrateRunInfo(runInfo: RunInfo): RunInfo {
    return runInfo;
  }
}
