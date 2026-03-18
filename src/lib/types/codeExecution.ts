import type { ProblemTestCase } from '../../../zenstack/models';

interface Success {
	success: true;
}

interface IncorrectResponseError {
	type: 'incorrect_response';
}

interface RuntimeError {
	type: 'runtime_error';
}

interface UnknownError {
	type: 'unknown_error';
}

interface CompileError {
	type: 'compile_error';
	error: string;
}

export type ErrorReason = IncorrectResponseError | RuntimeError | CompileError | UnknownError;

interface Failure {
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
