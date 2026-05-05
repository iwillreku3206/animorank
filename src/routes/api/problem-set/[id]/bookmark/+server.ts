import type { RequestHandler } from './$types';
import { db } from '$lib/zenstack';
import { error, successObject } from '$lib/response';

export const POST: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) return error(403, 'Unauthorized');

  const { id } = params;

  await db.problemSetBookmark.upsert({
    create: {
      problem_set_id: id,
      user_id: session.user.id
    },
    update: {},
    where: {
      problem_set_id_user_id: {
        problem_set_id: id,
        user_id: session.user.id
      }
    }
  });

  return successObject({ bookmarked: true });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) return error(403, 'Unauthorized');

  const { id } = params;

  await db.problemSetBookmark.deleteMany({
    where: {
      problem_set_id: id,
      user_id: session.user.id
    }
  });

  return successObject({ bookmarked: false });
};
