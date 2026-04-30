import type { ProblemTestCase } from '$lib/zenstack/models';
import type { CodeExecutionResponse } from './executor';

export type TestCaseResult = {
  success: boolean;
  runInfo: CodeExecutionResponse;
};

export interface CreateOptions {
  problemId: string;
}

export interface UpdateOptions<TUpdate> {
  id: string;
  update: TUpdate;
}

export abstract class TestCase<T extends ProblemTestCase, TUpdate = never> {
  public dbTestCase: T;

  constructor(dbTestCase: T) {
    this.dbTestCase = dbTestCase;
  }

  public abstract execute(): Promise<TestCaseResult>;
  public abstract update(options: UpdateOptions<TUpdate>): Promise<void>;
}
