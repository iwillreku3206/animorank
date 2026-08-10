import type { ProblemTestCase } from '$lib/zenstack/models';
import type { CodeExecutionResponse } from './executor';

type TestCaseResultBase = {
  success: boolean;
  hidden: boolean;
  runInfo: {
    symbol: string;
    expected: string;
    actual: string;
  }[];
} & (
  | {
      testCaseInfo: ProblemTestCase;
      hidden: false;
    }
  | { hidden: true }
);

type TestCaseResultPass = TestCaseResultBase & {
  success: true;
};

type TestCaseResultFail = TestCaseResultBase & {
  success: false;
  reason: Extract<CodeExecutionResponse, { success: false }>['reason'] | 'wrong_answer';
  error?: string;
};

export type TestCaseResult = TestCaseResultFail | TestCaseResultPass;

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

  public abstract execute(_studentCode: string): Promise<TestCaseResult>;
  public abstract update(_options: UpdateOptions<TUpdate>): Promise<void>;
}
