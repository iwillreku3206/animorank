import { error, successObject } from '$lib/response';
import { db } from '$lib/zenstack';
import z from 'zod';
import type { RequestHandler } from './$types';
import { CTypeWithValueSchema } from '$lib/types/cType';
import { ProblemTestCaseOperator } from '../../../../../zenstack/models';
import { TestCase } from '$lib/codeExecutor/testCase';

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const session = await locals.auth();
	if (!session || !session.user.id) return error(403, 'Unauthorized');

	const testCase = await TestCase.delete(params.id);

	if (testCase.count === 0) return error(404, 'Not found');

	return successObject({ status: 'Success' });
};

const functionOutputTestCaseValidator = z.object({
	parameters: z.array(CTypeWithValueSchema),
	expected_output: CTypeWithValueSchema,
	operator: z.enum(ProblemTestCaseOperator),
	function_name: z.string()
});

const programIOTestCaseValidator = z.object({
	input: z.string(),
	output: z.string()
});

const customTestCaseValidator = z.object({
	test_code: z.string()
});

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	const session = await locals.auth();
	if (!session || !session.user.id) return error(403, 'Unauthorized');

	const currentTestCase = await db.problemTestCase.findUnique({
		where: { id: params.id, problem: { problem_set: { owner_id: session.user.id } } }
	});
	if (!currentTestCase) return error(404, 'Not found'); // should return 404 if not owned by user to hide existence of such an object

	const {
		success,
		error: zodError,
		data
	} = await {
		FunctionOutputTestCase: functionOutputTestCaseValidator,
		ProgramIOTestCase: programIOTestCaseValidator,
		CustomTestCase: customTestCaseValidator
	}[currentTestCase.type].safeParseAsync(await request.json());
	if (!success) return error(400, zodError);

	await TestCase.for(currentTestCase).update(params.id, data);

	return successObject({ status: 'Success' });
};
