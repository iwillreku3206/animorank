import z from 'zod';
import type { RequestHandler } from './$types';
import { PracticeSessionService } from '$lib/practiceSession/practiceSessionService';
import { ServerRegistryProvider } from '$lib/registry/server';
import { error, successObject } from '$lib/response';

const updateCodeValidator = z.object({
  code: z.record(z.string(), z.string())
});

export const PUT: RequestHandler = async ({ locals, params, request }) => {
  const session = await locals.auth();
  if (!session) return error(403, 'Unauthorized');

  const { success, error: zodError, data } = await updateCodeValidator.safeParseAsync(await request.json());
  if (!success) return error(400, zodError);

  const service = ServerRegistryProvider.instance().getService(PracticeSessionService);

  const update = await service.update({
    id: params.id,
    user: session.user,
    newState: { previous_state: data }
  });

  return update ? successObject({ status: 'success' }) : error(404, 'Not found');
};
