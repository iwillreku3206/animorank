import type { TestCaseResult } from '$lib/types/codeExecution';

type Execution = {
  runType: 'run' | 'submit';
  publicTestResults: TestCaseResult[];
  generalTestResults: boolean[];
  submittedCode: string;
};

export type ExecutionEvent = {
  run: Execution;
};
