import { type ProblemTestCase as TestCaseModel } from '$lib/zenstack/models';
import type { Component } from 'svelte';
import type { TestCase } from './testCase.svelte';

export type TestCaseResult<T> =
  | {
      success: boolean;
      testCaseInfo: { public: false };
    }
  | {
      success: boolean;
      testCaseInfo: TestCaseModel & { public: true };
      failureReason?: string;
      compilerOutput?: string;
      runInfo: T;
    };

export type TestCaseEditor = Component<{
  testCase: TestCase;
}>;

export type TestCaseDisplay<Result> = Component<{
  testCaseResult: TestCaseResult<Result>;
}>;
