import { error, successObject } from '$lib/response';
import z from 'zod';
import type { RequestHandler } from './$types';
import { TestCaseService } from '$lib/testCase/testCaseService';
import { CTypeWithValueSchema } from '$lib/types/cType';
import { ProblemTestCaseOperator } from '$lib/zenstack/models';

export const DELETE: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();
  if (!session || !session.user.id) return error(403, 'Unauthorized');

  const testCaseService = TestCaseService.instance();
  const currentTestCase = await testCaseService.findById({ id: params.id, user: session.user });
  if (!currentTestCase) return error(404, 'Not found');

  await testCaseService.delete(params.id);

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

  const testCaseService = TestCaseService.instance();
  const currentTestCase = await testCaseService.findById({ id: params.id, user: session.user });
  if (!currentTestCase) return error(404, 'Not found');

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

  await currentTestCase.update({ id: params.id, update: data });

  return successObject({ status: 'Success' });
};
