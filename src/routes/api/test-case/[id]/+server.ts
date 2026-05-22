import { error, successObject } from '$lib/response';
import type { RequestHandler } from './$types';
import { TestCaseService } from '$lib/testCase/testCaseService';

export const DELETE: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();
  if (!session || !session.user.id) return error(403, 'Unauthorized');

  const testCaseService = TestCaseService.instance();
  const currentTestCase = await testCaseService.findById({ id: params.id, user: session.user });
  if (!currentTestCase) return error(404, 'Not found');

  await testCaseService.delete(params.id);

  return successObject({ status: 'Success' });
};

export const PUT: RequestHandler = async ({ locals, params, request }) => {
  const session = await locals.auth();
  if (!session || !session.user.id) return error(403, 'Unauthorized');

  const testCaseService = TestCaseService.instance();
  const currentTestCase = await testCaseService.findById({ id: params.id, user: session.user });
  if (!currentTestCase) return error(404, 'Not found');

  const data = await request.json();
  await currentTestCase.update({ id: params.id, update: data });

  return successObject({ status: 'Success' });
};
