import z from 'zod';
import type { RequestHandler } from './$types';
import { db } from '$lib/zenstack';
import { error, successObject } from '$lib/response';
import { testFunctionTestCase } from '$lib/codeExecutor/functionTestCase';
import { testStdioTestCase } from '$lib/codeExecutor/stdioTestCase';
import { testCustomTestCase } from '$lib/codeExecutor/customTestCase';
import type {
	ProblemTestCase,
	FunctionOutputTestCase,
	ProgramIOTestCase,
	CustomTestCase
} from '../../../../../../zenstack/models';
import type { TestCaseResult } from '$lib/types/codeExecution';

const runValidator = z.object({
	code: z.string(),
	test_type: z.enum(['public', 'all']).default('public')
});

async function runTestCase(testCase: ProblemTestCase, code: string): Promise<TestCaseResult> {
	switch (testCase.type) {
		case 'FunctionOutputTestCase':
			return testFunctionTestCase(testCase as FunctionOutputTestCase, code);
		case 'ProgramIOTestCase':
			return testStdioTestCase(testCase as ProgramIOTestCase, code);
		case 'CustomTestCase':
			return testCustomTestCase(testCase as CustomTestCase, code);
		default:
			return { success: false, error_reason: { type: 'unknown_error' as const } };
	}
}

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const session = await locals.auth();
	if (!session) return error(403, 'Unauthorized');

	const {
		success: parseSuccess,
		data: parsedData,
		error: parseError
	} = await runValidator.safeParseAsync(await request.json());
	if (!parseSuccess) return error(400, parseError);

	const practiceSession = await db.practiceSession.findUnique({
		where: { id: params.id },
		include: { problem: { include: { problemTestCases: true } } }
	});

	if (!practiceSession) return error(404, 'Practice session not found');
	if (practiceSession.student_id !== session.user.id) return error(403, 'Unauthorized');

	const { code, test_type } = parsedData;
	const testCases =
		test_type === 'public'
			? practiceSession.problem.problemTestCases.filter((tc) => tc.public)
			: practiceSession.problem.problemTestCases;

	const results = await Promise.all(testCases.map((tc) => runTestCase(tc, code)));

	if (test_type === 'all') {
		return successObject({
			results: results.map((r) => ({ success: r.success }))
		});
	}

	return successObject({
		results: results.map((r, i) => {
			const tc = testCases[i];
			const baseResult = {
				success: r.success,
				error_reason: !r.success ? r.error_reason : undefined
			};

			if (tc.public) {
				return { ...baseResult, run_info: r.run_info, test_info: r.test_info };
			}

			return baseResult;
		})
	});
};
