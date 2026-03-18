import { JUDGE0_BASE_URL } from '$env/static/private';
import type { TestCaseResult } from '$lib/types/codeExecution';
import type { Judge0SubmissionRequest, Judge0SubmissionResponse } from '$lib/types/judge0';
import AdmZip from 'adm-zip';
import type { CustomTestCase, ProgramIOTestCase } from '../../../zenstack/models';
import { typeToString } from '$lib/utils/typeToString';

export const mainRegex = /\s*(int|void)\s+main\s*\([^)]*\)\s*\{[^}]*\}\s*/g;

const compile = `
gcc -Werror -Wall -o program *.c 
`;

const run = `
./program
`;

export async function testCustomTestCase(
	testCase: CustomTestCase,
	submittedCode: string
): Promise<TestCaseResult> {
	const zip = new AdmZip();
	const submissionWithoutMain = submittedCode.replace(mainRegex, '');

	zip.addFile('submission.c', Buffer.from(submissionWithoutMain, 'utf8'));
	zip.addFile('main.c', Buffer.from(testCase.test_code, 'utf8'));
	zip.addFile('compile', Buffer.from(compile, 'utf8'));
	zip.addFile('run', Buffer.from(run, 'utf8'));

	const submissionParams: Judge0SubmissionRequest = {
		language_id: 89,
		additional_files: zip.toBuffer().toString('base64')
	};

	const req = await fetch(`${JUDGE0_BASE_URL}/submissions?wait=true&base64_encoded=true`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(submissionParams)
	});

	const res = (await req.json()) as Judge0SubmissionResponse;

	if (res.exit_code !== 0) return { success: false, error_reason: { type: 'runtime_error' } };
	return { success: true };
}
