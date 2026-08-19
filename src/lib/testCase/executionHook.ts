import type { TestCaseResult } from './types';

type Execution = {
  runType: 'run' | 'submit';
  publicTestResults: TestCaseResult<unknown>[];
  generalTestResults: boolean[];
  submittedCode: string;
};

export type ExecutionEvent = {
  run: Execution;
};
