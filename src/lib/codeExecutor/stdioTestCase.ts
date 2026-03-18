import { JUDGE0_BASE_URL } from '$env/static/private';
import type { TestCaseResult } from '$lib/types/codeExecution';
import type { Judge0SubmissionRequest, Judge0SubmissionResponse } from '$lib/types/judge0';
import type { ProgramIOTestCase } from '../../../zenstack/models';

export async function testStdioTestCase(
	testCase: ProgramIOTestCase,
	submittedCode: string
): Promise<TestCaseResult> {
	const submissionParams: Judge0SubmissionRequest = {
		language_id: 50,
		source_code: Buffer.from(submittedCode).toString('base64'),
		stdin: Buffer.from(testCase.input).toString('base64')
	};

	const req = await fetch(`${JUDGE0_BASE_URL}/submissions?wait=true&base64_encoded=true`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(submissionParams)
	});

	const res = (await req.json()) as Judge0SubmissionResponse;

	if (res.status.id === 6) {
		// Compile error
		return {
			success: false,
			test_info: testCase,
			error_reason: {
				type: 'compile_error',
				error: Buffer.from(res.compile_output || '', 'base64').toString('utf8')
			}
		};
	}

	if (res.status.id !== 3)
		return { success: false, test_info: testCase, error_reason: { type: 'runtime_error' } };
	if (!res.stdout)
		return { success: false, test_info: testCase, error_reason: { type: 'unknown_error' } };
	const output = Buffer.from(res.stdout, 'base64').toString('utf8');
	if (testCase.output === output) {
		return {
			success: true,
			test_info: testCase,
			run_info: {
				actual: output,
				expected: testCase.output
			}
		};
	} else {
		return {
			success: false,
			test_info: testCase,
			run_info: {
				actual: output,
				expected: testCase.output
			},
			error_reason: {
				type: 'incorrect_response'
			}
		};
	}
}
