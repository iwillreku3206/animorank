import type { TestCaseResult } from './testCase';

type Execution = {
  runType: 'run' | 'submit';
  publicTestResults: TestCaseResult[];
  generalTestResults: boolean[];
  submittedCode: string;
};

export type ExecutionEvent = {
  run: Execution;
};
