import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/zenstack';

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) redirect(302, '/about');

  const tags = await db.tag.findMany({
    include: {
      _count: {
        select: {
          problemSets: {
            where: {
              problemSet: {
                OR: [
                  { is_global: true },
                  { subscriptions: { some: { student_id: session.user.id } } },
                  { owner_id: session.user.id }
                ]
              }
            }
          }
        }
      }
    },
    orderBy: [
      { type: 'asc' },
      { problemSets: { _count: 'desc' } },
      { order: 'asc' },
      { label: 'asc' }
    ]
  });

  const creators =
    session.user.type === 'student'
      ? await db.teacher.findMany({
          select: { user: { select: { id: true, name: true } } },
          where: {
            problem_set: {
              some: {
                OR: [
                  { is_global: true },
                  { subscriptions: { some: { student_id: session.user.id } } }
                ]
              }
            }
          }
        })
      : [];

  return {
    user: session.user,
    tags,
    creators: creators.map((c) => c.user)
  };
};
