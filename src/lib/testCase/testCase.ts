import type { ProblemTestCase } from '$lib/zenstack/models';
import type { CodeExecutionResponse } from './executor';

type TestCaseResultBase = {
  success: boolean;
  testCaseInfo: {
    symbol: string;
    expected: string;
    actual: string;
  }[];
};

interface TestCaseResultFail extends TestCaseResultBase {
  success: false;
  reason: string;
}

export type TestCaseResult = TestCaseResultFail | TestCaseResultBase;

export interface CreateOptions {
  problemId: string;
}

export interface UpdateOptions<TUpdate> {
  id: string;
  update: TUpdate;
}

export abstract class TestCase<T extends ProblemTestCase, TUpdate = unknown> {
  public dbTestCase: T;

  constructor(dbTestCase: T) {
    this.dbTestCase = dbTestCase;
  }

  public abstract execute(studentCode: string): Promise<TestCaseResult>;
  public abstract update(options: UpdateOptions<TUpdate>): Promise<void>;
}
