import { error, successObject } from '$lib/response';
import z from 'zod';
import type { RequestHandler } from './$types';
import { ServerRegistryProvider } from '$lib/registry/server';
import { ProblemSetService } from '$lib/problemSet/problemSetService';

export const GET: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) return error(403, 'Unauthorized');

  const problemSetService = ServerRegistryProvider.instance().getService(ProblemSetService);

  const collaborators = await problemSetService.listCollaborators({
    problemSetId: params.id,
    user: session.user
  });

  if (collaborators.length === 0 && params.id) return error(404, 'Not found');

  return successObject(collaborators);
};

const addValidator = z.object({
  collaboratorId: z.string().uuid()
});

export const POST: RequestHandler = async ({ locals, request, params }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) return error(403, 'Unauthorized');

  const { success, data, error: zodError } = await addValidator.safeParseAsync(await request.json());

  if (!success) return error(400, zodError);

  const problemSetService = ServerRegistryProvider.instance().getService(ProblemSetService);

  const added = await problemSetService.addCollaborator({
    problemSetId: params.id,
    collaboratorId: data.collaboratorId,
    user: session.user
  });

  if (!added) return error(404, 'Not found or not authorized');

  return successObject({ status: 'success' });
};

const removeValidator = z.object({
  collaboratorId: z.string().uuid()
});

export const DELETE: RequestHandler = async ({ locals, request, params }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) return error(403, 'Unauthorized');

  const { success, data, error: zodError } = await removeValidator.safeParseAsync(await request.json());

  if (!success) return error(400, zodError);

  const problemSetService = ServerRegistryProvider.instance().getService(ProblemSetService);

  const removed = await problemSetService.removeCollaborator({
    problemSetId: params.id,
    collaboratorId: data.collaboratorId,
    user: session.user
  });

  if (!removed) return error(404, 'Not found or not authorized');

  return successObject({ status: 'success' });
};
