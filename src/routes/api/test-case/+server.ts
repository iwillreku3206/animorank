import { error, successObject } from '$lib/response';
import z from 'zod';
import type { RequestHandler } from './$types';
import { TestCaseService } from '$lib/testCase/testCaseService';

const postValidator = z.object({
  problem: z.string().uuid(),
  type: z.string()
});

export const POST: RequestHandler = async ({ locals, request }) => {
  const session = await locals.auth();
  if (!session || !session.user.id) return error(403, 'Unauthorized');

  const { success, data, error: zodError } = await postValidator.safeParseAsync(await request.json());
  if (!success) return error(400, zodError);

  const newTestCase = await TestCaseService.instance().create({
    problemId: data.problem,
    type: data.type,
    user: session.user
  });

  return newTestCase ? successObject(newTestCase) : error(404, 'Problem not found');
};
