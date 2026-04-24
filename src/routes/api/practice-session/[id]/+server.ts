import z from 'zod';
import type { RequestHandler } from './$types';
import { db } from '$lib/zenstack';
import { error, successObject } from '$lib/response';

const updateCodeValidator = z.object({
  code: z.string()
});

export const PUT: RequestHandler = async ({ locals, params, request }) => {
  const session = await locals.auth();
  if (!session) return error(403, 'Unauthorized');

  const {
    success,
    error: zodError,
    data
  } = await updateCodeValidator.safeParseAsync(await request.json());
  if (!success) return error(400, zodError);

  const practiceSession = await db.practiceSession.findUnique({
    where: { id: params.id }
  });

  if (!practiceSession) return error(404, 'Practice session not found');
  if (practiceSession.student_id !== session.user.id) return error(403, 'Unauthorized');

  await db.practiceSession.update({
    where: { id: params.id },
    data: { previous_code: data.code }
  });

  return successObject({ status: 'success' });
};
