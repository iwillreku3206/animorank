import { error, successObject } from '$lib/response';
import z from 'zod';
import type { RequestHandler } from './$types';
import { ServerRegistryProvider } from '$lib/registry/server';
import { MEMBER_REJECTION_MESSAGES, ProblemSetService } from '$lib/problemSet';

export const GET: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) return error(403, 'Unauthorized');

  const problemSetService = await ServerRegistryProvider.instance().getService(ProblemSetService);

  const collaborators = await problemSetService.listCollaborators({
    problemSetId: params.id,
    user: session.user
  });

  // `null` is "you do not collaborate on this set"; a set with one
  // collaborator legitimately has a short list, so length proves nothing.
  if (collaborators === null) return error(404, 'Not found');

  return successObject({ collaborators });
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

  const result = await problemSetService.addCollaborator({
    problemSetId: params.id,
    email: data.email,
    user: session.user
  });

  // A student account, or an unregistered address, is the answer the form has
  // to show, so it carries the sentence rather than a code.
  if (result.status === 'rejected') return error(422, MEMBER_REJECTION_MESSAGES[result.reason]);
  if (result.status === 'forbidden') return error(404, 'Not found or not authorized');

  return successObject({ status: result.status, member: result.member });
};

const removeValidator = z.object({
  collaboratorId: z.string().uuid()
});

export const DELETE: RequestHandler = async ({ locals, request, params }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) return error(403, 'Unauthorized');

  const { success, data, error: zodError } = await removeValidator.safeParseAsync(await request.json());

  if (!success) return error(400, zodError);

  const problemSetService = await ServerRegistryProvider.instance().getService(ProblemSetService);

  const removed = await problemSetService.removeCollaborator({
    problemSetId: params.id,
    collaboratorId: data.collaboratorId,
    user: session.user
  });

  if (!removed) return error(404, 'Not found or not authorized');

  return successObject({ status: 'success' });
};
