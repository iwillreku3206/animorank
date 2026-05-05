import type { ProblemTestCase } from '$lib/zenstack/models';

export interface Success {
  success: true;
}

export interface IncorrectResponseError {
  type: 'incorrect_response';
}

export interface RuntimeError {
  type: 'runtime_error';
}

export interface UnknownError {
  type: 'unknown_error';
}

export interface CompileError {
  type: 'compile_error';
  error: string;
}

export type ErrorReason = IncorrectResponseError | RuntimeError | CompileError | UnknownError;

export interface Failure {
  success: false;
  error_reason: ErrorReason;
}

export type TestCaseResult = (Success | Failure) & {
  run_info?: {
    expected?: string;
    actual?: string;
  };
  test_info?: ProblemTestCase;
};

export function isSuccess(result: TestCaseResult): result is TestCaseResult & Success {
  return result.success === true;
}

export function isFailure(result: TestCaseResult): result is TestCaseResult & Failure {
  return result.success === false;
}

export function isCompileError(
  result: TestCaseResult
): result is TestCaseResult & Failure & { error_reason: CompileError } {
  return result.success === false && result.error_reason?.type === 'compile_error';
}

export function isRuntimeError(
  result: TestCaseResult
): result is TestCaseResult & Failure & { error_reason: RuntimeError } {
  return result.success === false && result.error_reason?.type === 'runtime_error';
}
