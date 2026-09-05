import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/zenstack';
import { ServerServiceProvider } from '$lib/services/serverServiceProvider';
import { TagService } from '$lib/tag';
import { groupBy } from '$lib/utils/groupBy';

export const load: PageServerLoad = async ({ locals, params }) => {
  const session = await locals.auth();
  if (!session || !session.user.id) return redirect(302, '/');

  const problemSet = await db.problemSet.findUnique({
    where: {
      id: params.id,
      collaborators: { some: { collaborator_id: session.user.id } }
    },
    include: {
      problems: {
        orderBy: { created_at: 'asc' },
        include: { topics: true }
      },
      collaborators: {
        include: {
          collaborator: {
            include: { user: true }
          }
        }
      },
      difficulty: true,
      subject: true,
      topics: {
        include: { topic_tag: true }
      }
    }
  });

  if (!problemSet) return redirect(302, '/instructor/problemSets');

  const tagService = ServerServiceProvider.instance().getService(TagService);
  const tags = await tagService.findAll();

  const problemIds = problemSet.problems.map((p) => p.id);

  // Distinct students who have finished each problem, and distinct students who
  // have attempted it at all. Skipped entirely when the set has no problems, so
  // an `in ()` with an empty list is never issued.
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

  return {
    problemSet: {
      id: problemSet.id,
      title: problemSet.title,
      description: problemSet.description || '',
      auto_accept: problemSet.auto_accept,
      is_global: problemSet.is_global,
      subject_id: problemSet.subject?.id || null,
      difficulty_id: problemSet.difficulty?.id || null,
      topic_ids: problemSet.topics.map((t) => t.topic_tag_id),
      problems: problemSet.problems.map((p) => ({
        ...p,
        topics: p.topics.map((topic) => topic.tag_id)
      })),
      collaboratorIds: problemSet.collaborators.map((c) => c.collaborator.user.id)
    },
    tags: tags.map((tag) => tag.model),
    globalProblemSolvers,
    globalProblemAttempts
  };
};
