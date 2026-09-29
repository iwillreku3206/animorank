import { error, successObject } from '$lib/response';
import z from 'zod';
import type { RequestHandler } from './$types';
import { ServerRegistryProvider } from '$lib/registry/server';
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

  try {
    const newTestCase = await (
      await ServerRegistryProvider.instance().getService(TestCaseService)
    ).create({
      problemId: data.problem,
      type: data.type,
      user: session.user
    });

    return newTestCase ? successObject(newTestCase.testCase.model) : error(404, 'Problem not found');
  } catch (validationError) {
    return error(400, validationError instanceof Error ? validationError.message : 'Invalid test case');
  }
};
