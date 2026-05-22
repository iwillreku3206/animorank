import { error, successObject } from '$lib/response';
import z from 'zod';
import type { RequestHandler } from './$types';
import { TestCaseService } from '$lib/testCase/testCaseService';
import { ProblemTestCaseType } from '$lib/zenstack/models';

const postValidator = z.object({
  problem: z.uuid(),
  type: z.enum(Object.values(ProblemTestCaseType))
});

export const POST: RequestHandler = async ({ locals, request }) => {
  const session = await locals.auth();
  if (!session || !session.user.id) return error(403, 'Unauthorized');

  const {
    success,
    data,
    error: zodError
  } = await postValidator.safeParseAsync(await request.json());
  if (!success) return error(400, zodError);

  const testCaseService = TestCaseService.instance();

  const newTestCase = await testCaseService.create({
    type: data.type,
    problemId: data.problem,
    user: session.user
  });

  return newTestCase ? successObject(newTestCase) : error(404, 'Problem not found');
};
