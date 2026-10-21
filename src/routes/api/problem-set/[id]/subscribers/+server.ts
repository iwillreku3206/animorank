import { error, successObject } from '$lib/response';
import z from 'zod';
import type { RequestHandler } from './$types';
import { ServerRegistryProvider } from '$lib/registry/server';
import { ProblemSetService, MEMBER_REJECTION_MESSAGES } from '$lib/problemSet';

export const GET: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) return error(403, 'Unauthorized');

  const problemSetService = await ServerRegistryProvider.instance().getService(ProblemSetService);

  // `null` is "you do not collaborate on this set", which is not the same answer
  // as an empty list from a set nobody subscribed to.
  const subscribers = await problemSetService.listSubscribers({
    problemSetId: params.id,
    user: session.user
  });

  if (subscribers === null) return error(404, 'Not found');

  return successObject({ subscribers });
};

const addValidator = z.object({
  email: z.email()
});

export const POST: RequestHandler = async ({ locals, request, params }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) return error(403, 'Unauthorized');

  const { success, data, error: zodError } = await addValidator.safeParseAsync(await request.json());

  if (!success) return error(400, zodError);

  const problemSetService = await ServerRegistryProvider.instance().getService(ProblemSetService);

  const result = await problemSetService.addSubscriber({
    problemSetId: params.id,
    email: data.email,
    user: session.user
  });

  // An unregistered address — or one that belongs to a teacher — is the answer
  // the form has to show, so it carries the sentence to show rather than a code.
  if (result.status === 'rejected') return error(422, MEMBER_REJECTION_MESSAGES[result.reason]);
  if (result.status === 'forbidden') return error(404, 'Not found or not authorized');

  return successObject({ status: result.status, member: result.member });
};

const removeValidator = z.object({
  studentId: z.uuid()
});

export const DELETE: RequestHandler = async ({ locals, request, params }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) return error(403, 'Unauthorized');

  const { success, data, error: zodError } = await removeValidator.safeParseAsync(await request.json());

  if (!success) return error(400, zodError);

  const problemSetService = await ServerRegistryProvider.instance().getService(ProblemSetService);

  const removed = await problemSetService.removeSubscriber({
    problemSetId: params.id,
    studentId: data.studentId,
    user: session.user
  });

  if (!removed) return error(404, 'Not found or not authorized');

  return successObject({ status: 'removed' });
};
