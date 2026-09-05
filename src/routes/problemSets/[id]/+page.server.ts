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
          topics: {
            include: { tag: true }
          },
          subject: true,
          practice_sessions: { where: { student_id: session.user.id } }
        },
        orderBy: { name: 'asc' }
      },
      collaborators: { include: { collaborator: { include: { user: true } } } },
      difficulty: true,
      subject: true,
      topics: { include: { topic_tag: true } }
    }
  });

  if (!problemSet) throw redirect(302, '/');

  // Hidden problems are delisted for students, but stay listed for the set's
  // collaborators so an instructor previewing their own set still sees what
  // they have hidden. Everything below works from this filtered list, so the
  // solver/attempt aggregates don't query problems that are never rendered.
  const isCollaborator = problemSet.collaborators.some((c) => c.collaborator.user.id === session.user.id);
  const problems = problemSet.problems.filter((p) => p.visible || isCollaborator);

  const problemIds = problems.map((p) => p.id);

  const globalProblemSolvers = problemIds.length
    ? groupBy(
        await db.$qb
          .selectFrom('PracticeSession')
          .where('done', '=', true)
          .where('problem_id', 'in', problemIds)
          .groupBy('PracticeSession.problem_id')
          .select('problem_id')
          .select((eb) => eb.fn.count('student_id').distinct().as('solvers'))
          .execute(),
        (p) => p.problem_id
      )
    : {};

  const globalProblemAttempts = problemIds.length
    ? groupBy(
        await db.$qb
          .selectFrom('PracticeSession')
          .where('problem_id', 'in', problemIds)
          .groupBy('PracticeSession.problem_id')
          .select('problem_id')
          .select((eb) => eb.fn.count('student_id').distinct().as('attempts'))
          .execute(),
        (p) => p.problem_id
      )
    : {};

  const bookmarked = !!(await db.problemSetBookmark.findUnique({
    where: { problem_set_id_user_id: { problem_set_id: params.id, user_id: session.user.id } }
  }));

  return {
    problemSet: {
      id: params.id,
      title: problemSet.title,
      description: problemSet.description,
      collaborators: problemSet.collaborators.map((c) => c.collaborator.user).map((c) => ({ id: c.id, name: c.name })),
      subject: problemSet.subject,
      difficulty: problemSet.difficulty,
      topics: problemSet.topics.map((t) => t.topic_tag),
      problems: problems.map((p) => ({
        id: p.id,
        title: p.name,
        difficulty: p.difficulty,
        subject: p.subject,
        topics: p.topics.map((t) => t.tag),
        status:
          p.practice_sessions.length === 0
            ? 'not_started'
            : p.practice_sessions.findIndex((s) => s.done === true) !== -1
              ? 'done'
              : 'not_finished'
      }))
    },
    globalProblemSolvers,
    globalProblemAttempts,
    bookmarked
  };
};
