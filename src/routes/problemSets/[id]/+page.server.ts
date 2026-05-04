import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/zenstack';
import { groupBy } from '$lib/utils/groupBy';

export const load: PageServerLoad = async ({ locals, params }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) throw redirect(302, '/');

  const problemSet = await db.problemSet.findUnique({
    where: {
      id: params.id,
      OR: [
        { is_global: true },
        { collaborators: { some: { collaborator_id: session.user.id } } },
        { subscriptions: { some: { student_id: session.user.id } } }
      ]
    },
    include: {
      problems: {
        include: {
          difficulty: true,
          topics: true,
          subject: true,
          practice_sessions: { where: { student_id: session.user.id } }
        }
      },
      collaborators: { include: { collaborator: { include: { user: true } } } },
      difficulty: true,
      subject: true,
      topics: { include: { topic_tag: true } }
    }
  });

  if (!problemSet) throw redirect(302, '/');

  const problemSolves = groupBy(
    await db.practiceSession.groupBy({
      by: 'problem_id',
      _count: { done: true }
    }),
    (p) => p.problem_id
  );

  const bookmarked = !!(await db.problemSetBookmark.findUnique({
    where: { problem_set_id_user_id: { problem_set_id: params.id, user_id: session.user.id } }
  }));

  return {
    problemSet: {
      title: problemSet.title,
      description: problemSet.description,
      collaborators: problemSet.collaborators
        .map((c) => c.collaborator.user)
        .map((c) => ({ id: c.id, name: c.name })),
      subject: problemSet.subject,
      difficulty: problemSet.difficulty,
      topics: problemSet.topics.map((t) => t.topic_tag),
      problems: problemSet.problems.map((p) => ({
        title: p.name,
        difficulty: p.difficulty,
        subject: p.subject,
        topics: p.topics,
        status:
          p.practice_sessions.length === 0
            ? 'not_started'
            : p.practice_sessions.findIndex((s) => s.done === true)
              ? 'done'
              : 'not_finished'
      }))
    },
    bookmarked
  };
};
