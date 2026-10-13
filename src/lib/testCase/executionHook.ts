import type { CustomRunResponse } from '$lib/practiceSession/api';
import type { TestCaseResult } from './types';

type Execution = {
  runType: 'run' | 'submit';
  publicTestResults: TestCaseResult<unknown>[];
  generalTestResults: boolean[];
  submittedCode: string;
};

type CustomExecution = {
  submittedCode: string;
  result: CustomRunResponse;
};

export type ExecutionEvent = {
  tests: Execution;
  custom: CustomExecution;
};
