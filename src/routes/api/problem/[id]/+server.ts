import z from 'zod';
import type { RequestHandler } from './$types';
import { db } from '$lib/zenstack';
import { error } from '@sveltejs/kit';
import { successObject } from '$lib/response';

const putValidator = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  visible: z.union([z.stringbool(), z.boolean()]).optional(),
  starter_code: z.string().optional()
});

export const PUT: RequestHandler = async ({ locals, request, params }) => {
  const session = await locals.auth();
  if (!session) return error(403, 'Unauthorized');
  if (session.user.type != 'teacher') return error(403, 'Unauthorized');

  const {
    success,
    error: zodError,
    data
  } = await putValidator.safeParseAsync(await request.json());
  if (!success) return error(400, zodError);

  await db.problem.update({
    where: { id: params.id, problem_set: { owner_id: session.user.id } },
    data
  });
  return successObject({ status: 'success' });
};
