import z from 'zod';
import type { RequestHandler } from './$types';
import { db } from '$lib/zenstack';
import { error } from '@sveltejs/kit';
import { successObject } from '$lib/response';
import { Language } from '$lib/zenstack/models';
import type { JsonValue } from '@zenstackhq/orm';

const updateValidator = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  visible: z.union([z.stringbool(), z.boolean()]).optional(),
  starter_code: z.string().optional(),
  uses_slots: z.boolean().optional(),
  language: z.enum(Language).optional(),
  difficulty_id: z.uuid().optional().nullable(),
  subject_id: z.uuid().optional().nullable(),
  topics: z.array(z.uuid()).optional(),
  extension_data: z
    .unknown()
    .transform((d) => d as JsonValue)
    .optional()
});

export const PUT: RequestHandler = async ({ locals, request, params }) => {
  const session = await locals.auth();
  if (!session || !session.user.id) return error(403, 'Unauthorized');
  if (session.user.type != 'teacher') return error(403, 'Unauthorized');

  const { success, error: zodError, data } = await updateValidator.safeParseAsync(await request.json());
  if (!success) return error(400, zodError);

  const { topics, subject_id, difficulty_id, ...updates } = data;

  db.$transaction(async (tx) => {
    await tx.problem.update({
      where: {
        id: params.id,
        problem_set: { collaborators: { some: { collaborator_id: session.user.id } } }
      },
      data: {
        ...updates,
        subject_id,
        difficulty_id
      }
    });

    if (topics) {
      await tx.problemTopic.deleteMany();
      await tx.problemTopic.createMany({
        data: topics.map((id) => ({ problem_id: params.id, tag_id: id }))
      });
    }
  });

  return successObject({ status: 'success' });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();
  if (!session || !session.user.id) return error(403, 'Unauthorized');
  if (session.user.type != 'teacher') return error(403, 'Unauthorized');

  await db.problem.delete({
    where: {
      id: params.id,
      problem_set: { collaborators: { some: { collaborator_id: session.user.id } } }
    }
  });

  return successObject({ status: 'success' });
};
