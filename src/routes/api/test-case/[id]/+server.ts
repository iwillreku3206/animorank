import { error, successObject } from '$lib/response';
import type { RequestHandler } from './$types';
import { TestCaseService } from '$lib/testCase/testCaseService';
import type { JsonValue } from '@zenstackhq/orm';

export const DELETE: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();
  if (!session || !session.user.id) return error(403, 'Unauthorized');

  const deleted = await TestCaseService.instance().delete(params.id, session.user);
  if (!deleted) return error(404, 'Not found');

  return successObject({ status: 'Success' });
};

export const PUT: RequestHandler = async ({ locals, params, request }) => {
  const session = await locals.auth();
  if (!session || !session.user.id) return error(403, 'Unauthorized');

  const body = await request.json();

  try {
    const updated = await TestCaseService.instance().update({
      id: params.id,
      type: body.type,
      public: body.public,
      data: body.data as JsonValue,
      user: session.user
    });

    if (!updated) return error(404, 'Not found');
  } catch (validationError) {
    return error(400, validationError instanceof Error ? validationError.message : 'Invalid test case update');
  }

  return successObject({ status: 'Success' });
};
